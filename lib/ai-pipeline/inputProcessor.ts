import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { model, baseSystemPrompt } from "./baseChain";
import { getPrompt, substituteVariables, logPromptUsage } from "../prompts/loader";
import { AgentType, PromptOperation } from "../database/types";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Enum defining the possible user intents for diagram operations
 */
export enum DiagramIntent {
  GENERATE = "GENERATE", // User wants to create a new diagram
  MODIFY = "MODIFY",     // User wants to change an existing diagram
  ANALYZE = "ANALYZE",   // User wants to analyze or get information about a diagram
  UNKNOWN = "UNKNOWN"    // Intent couldn't be determined
}

/**
 * Schema for validating input parameters
 */
const inputParamsSchema = z.object({
  userInput: z.string().min(1, "User input is required"),
  currentDiagram: z.string().optional(),
  conversation: z.array(z.string()).optional()
});

/**
 * Type definition for input parameters
 */
export type InputProcessorParams = z.infer<typeof inputParamsSchema>;

/**
 * Schema defining the structure of the intent classification output
 */
const intentOutputSchema = z.object({
  intent: z.nativeEnum(DiagramIntent),
  confidence: z.number().min(0).max(1),
  extractedParameters: z.object({
    diagramType: z.string().optional(),
    analysisType: z.string().optional(),
    modificationDescription: z.string().optional(),
    generationRequirements: z.string().optional()
  }).optional() // Make the entire object optional
});

/**
 * Type definition for the intent classification result
 */
export type IntentClassification = z.infer<typeof intentOutputSchema>;

/**
 * Classifies user intent regarding PlantUML diagrams.
 * 
 * This function analyzes a user's message to determine if they want to 
 * generate a new diagram, modify an existing one, or analyze a diagram.
 * 
 * @param params - The input parameters containing the user message and context
 * @returns A promise resolving to an intent classification object
 */
export async function classifyIntent(params: InputProcessorParams): Promise<IntentClassification> {
  try {
    // Validate input parameters
    const validatedParams = inputParamsSchema.parse(params);
    
    // Precompute template values for better readability
    const { userInput, currentDiagram = "", conversation = [] } = validatedParams;
    const currentDiagramStatus = currentDiagram ? "YES" : "NO";
    const conversationHistory = conversation.length > 0 ? `Previous conversation:\n${conversation.join('\n')}` : '';
    
    // Try to use a simpler classification approach first
    try {
      // Load simple intent classification prompt dynamically
      let promptTemplate: string;
      let promptSource: string;
      
      try {
        const promptData = await getPrompt(AgentType.CLASSIFIER, PromptOperation.INTENT_CLASSIFICATION);
        promptTemplate = substituteVariables(promptData.template, {
          baseSystemPrompt,
          currentDiagramStatus,
          userInput,
          conversationHistory
        });
        promptSource = promptData.source;
        logPromptUsage(AgentType.CLASSIFIER, PromptOperation.INTENT_CLASSIFICATION, promptData.source, 0);
      } catch (promptError) {
        logger.warn("Failed to load intent classification prompt, using fallback", { error: promptError });
        // Fallback to hardcoded prompt
        promptTemplate = `
          ${baseSystemPrompt}
          
          Your task is to classify the user's intent regarding PlantUML diagrams.
          
          Current diagram present: ${currentDiagramStatus}
          
          User request: ${userInput}
          
          ${conversationHistory}
            Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).
          
          Return ONLY ONE WORD: GENERATE, MODIFY, ANALYZE, or UNKNOWN.
          
          If you cannot clearly determine the user's intent, respond with UNKNOWN.
        `;
        promptSource = 'hardcoded-fallback';
      }
      
      const intentClassifierPrompt = PromptTemplate.fromTemplate(promptTemplate);
      
      // Create the simple classification chain with string output
      const simpleClassificationChain = RunnableSequence.from([
        intentClassifierPrompt,
        model,
        new StringOutputParser()
      ]);
      
      // Execute the chain with the input
      const result = await simpleClassificationChain.invoke({});
      const intentString = String(result).trim().toUpperCase();
      
      // Map the string to an enum value
      let intentEnum: DiagramIntent;
      switch (intentString) {
        case "GENERATE":
          intentEnum = DiagramIntent.GENERATE;
          break;
        case "MODIFY":
          intentEnum = DiagramIntent.MODIFY;
          break;
        case "ANALYZE":
          intentEnum = DiagramIntent.ANALYZE;
          break;
        default:
          intentEnum = DiagramIntent.UNKNOWN;
      }
      
      logger.info("Intent classification completed (simple)", { intent: intentEnum, promptSource });
      
      // Return a simple classification
      return {
        intent: intentEnum,
        confidence: 0.8, // Arbitrary confidence since we didn't calculate it
        extractedParameters: {} // No extracted parameters in simple mode
      };
      
    } catch (simpleError) {
      // If simple classification fails, fall back to structured output
      logger.warn("Simple intent classification failed, trying structured approach", { error: simpleError });
      
      // Load detailed intent classification prompt dynamically
      let detailedTemplate: string;
      
      try {
        const promptData = await getPrompt(AgentType.CLASSIFIER, 'detailed-intent-classification');
        detailedTemplate = substituteVariables(promptData.template, {
          baseSystemPrompt,
          currentDiagramStatus,
          userInput,
          conversationHistory,
          formatInstructions: StructuredOutputParser.fromZodSchema(intentOutputSchema).getFormatInstructions()
        });
        logPromptUsage(AgentType.CLASSIFIER, 'detailed-intent-classification', promptData.source, 0);
      } catch (promptError) {
        logger.warn("Failed to load detailed intent classification prompt, using fallback", { error: promptError });
        // Fallback to hardcoded prompt
        detailedTemplate = `
          ${baseSystemPrompt}
          
          Your task is to classify the user's intent regarding PlantUML diagrams.
          
          Current diagram present: ${currentDiagramStatus}
          
          User request: ${userInput}
          
          ${conversationHistory}
          
          Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).
          
          Analyze the confidence of your classification on a scale from 0 to 1.
          
          ${StructuredOutputParser.fromZodSchema(intentOutputSchema).getFormatInstructions()}
        `;
      }
      
      const detailedPrompt = PromptTemplate.fromTemplate(detailedTemplate);
      
      // Create a parser for structured output
      const parser = StructuredOutputParser.fromZodSchema(intentOutputSchema);

      // Create the intent classification chain
      const detailedClassificationChain = RunnableSequence.from([
        detailedPrompt,
        model,
        parser
      ]);

      // Execute the chain with the input
      const result = await detailedClassificationChain.invoke({});
      logger.info("Intent classification completed (detailed)", { 
        intent: result.intent, 
        confidence: result.confidence 
      });
      
      return result;
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Input validation error:", { errors: error.errors });
      // Return a validation error classification
      return {
        intent: DiagramIntent.UNKNOWN,
        confidence: 0,
        extractedParameters: {
          generationRequirements: "Invalid input parameters provided"
        }
      };
    } else if (error instanceof Error) {
      logger.error("Error classifying intent:", { 
        message: error.message, 
        stack: error.stack,
        input: params.userInput,
        currentDiagram: params.currentDiagram ? "present" : "absent"
      });
    } else {
      logger.error("Unknown error during intent classification:", { 
        error,
        input: params.userInput,
        currentDiagram: params.currentDiagram ? "present" : "absent"
      });
    }
    
    // Return a fallback classification on error
    return {
      intent: DiagramIntent.UNKNOWN,
      confidence: 0,
      extractedParameters: {}
    };
  }
}