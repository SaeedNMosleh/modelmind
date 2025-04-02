import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { model, baseSystemPrompt } from "./baseChain";
import winston from "winston";

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
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
  })
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
    
    // Create intent classifier prompt with precomputed values
    const intentClassifierPrompt = PromptTemplate.fromTemplate(`
      ${baseSystemPrompt}
      
      Your task is to classify the user's intent regarding PlantUML diagrams.
      
      Current diagram present: ${currentDiagramStatus}
      
      User request: ${userInput}
      
      ${conversationHistory}
      
      Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).
      
      Analyze the confidence of your classification on a scale from 0 to 1.
      
      Extract relevant parameters related to the user's request.
      
      ${StructuredOutputParser.fromZodSchema(intentOutputSchema).getFormatInstructions()}
    `);
    
    // Create a parser for structured output
    const parser = StructuredOutputParser.fromZodSchema(intentOutputSchema);

    // Create the intent classification chain
    const intentClassificationChain = RunnableSequence.from([
      intentClassifierPrompt,
      model,
      parser
    ]);

    // Execute the chain with the input
    const result = await intentClassificationChain.invoke({});
    logger.info("Intent classification completed", { intent: result.intent, confidence: result.confidence });
    
    return result;
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
      logger.error("Error classifying intent:", { message: error.message, stack: error.stack });
    } else {
      logger.error("Unknown error during intent classification:", { error });
    }
    
    // Return a fallback classification on error
    return {
      intent: DiagramIntent.UNKNOWN,
      confidence: 0,
      extractedParameters: {}
    };
  }
}