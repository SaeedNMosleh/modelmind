import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
// Import the DiagramType from guidelines with an alias to avoid conflicts
import { DiagramType as GuidelinesType, readGuidelines } from "../../knowledge/guidelines";
import { getPrompt, substituteVariables, logPromptUsage } from "../../prompts/loader";
import { AgentType, PromptOperation } from "../../database/types";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Our local enum for diagram types used in the modifier
 */
export enum ModifierDiagramType {
  SEQUENCE = "SEQUENCE",
  CLASS = "CLASS",
  ACTIVITY = "ACTIVITY",
  STATE = "STATE",
  COMPONENT = "COMPONENT",
  DEPLOYMENT = "DEPLOYMENT",
  USE_CASE = "USE_CASE",
  ENTITY_RELATIONSHIP = "ENTITY_RELATIONSHIP",
  UNKNOWN = "UNKNOWN"
}

/**
 * Schema defining the structure of the diagram modification output
 */
const modificationOutputSchema = z.object({
  diagram: z.string().min(10),
  diagramType: z.nativeEnum(ModifierDiagramType),
  changes: z.array(z.string()).min(1),
  explanation: z.string()
});

/**
 * Type definition for the modifier result
 */
export type ModificationResult = z.infer<typeof modificationOutputSchema>;

/**
 * Schema for modifier input parameters
 */
const modifierParamsSchema = z.object({
  userInput: z.string().min(1),
  currentDiagram: z.string().min(10),
  diagramType: z.nativeEnum(ModifierDiagramType).optional(),
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for modifier parameters
 */
export type ModifierParams = z.infer<typeof modifierParamsSchema>;

/**
 * Helper function to map our modifier diagram type to the guidelines diagram type
 */
function mapToGuidelinesType(type: ModifierDiagramType): GuidelinesType {
  switch(type) {
    case ModifierDiagramType.SEQUENCE: 
      return 'sequence' as GuidelinesType;
    case ModifierDiagramType.CLASS: 
      return 'class' as GuidelinesType;
    case ModifierDiagramType.ACTIVITY: 
      return 'activity' as GuidelinesType;
    case ModifierDiagramType.STATE: 
      return 'state' as GuidelinesType;
    case ModifierDiagramType.COMPONENT: 
      return 'component' as GuidelinesType;
    case ModifierDiagramType.USE_CASE: 
      return 'use-case' as GuidelinesType;
    case ModifierDiagramType.ENTITY_RELATIONSHIP: 
      return 'entity_relationship' as GuidelinesType;
    default:
      return 'sequence' as GuidelinesType; // Default fallback
  }
}

/**
 * Specialized agent for modifying existing PlantUML diagrams
 */
export class DiagramModifier {
  private parser;

  constructor() {
    this.parser = StructuredOutputParser.fromZodSchema(modificationOutputSchema);
  }

  /**
   * Modify an existing PlantUML diagram based on user instructions
   * @param params - Parameters for modification
   * @returns A promise resolving to the modification result
   */
  public async modify(params: ModifierParams): Promise<ModificationResult> {
    try {
      // Validate input params
      const validatedParams = modifierParamsSchema.parse(params);
      
      // Detect diagram type if not provided
      const diagramType = validatedParams.diagramType || 
        await this.detectDiagramType(validatedParams.currentDiagram);
      
      logger.info("Modifying diagram", { diagramType });
      
      // Fetch relevant guidelines
      let guidelinesText = "No specific guidelines available.";
      try {
        // Convert our enum to the expected type for guidelines
        const guidelinesType = mapToGuidelinesType(diagramType);
        logger.info("Fetching guidelines for diagram type", { diagramType, guidelinesType });
        
        // Get the guidelines
        const guidelines = await readGuidelines(guidelinesType);
        
        // Format guidelines for prompt
        if (guidelines && typeof guidelines === 'string') {
          guidelinesText = guidelines;
        }
      } catch (guidelineError) {
        logger.error("Error fetching guidelines:", guidelineError);
      }
      
      // Load the modification prompt dynamically
      const startTime = Date.now();
      let promptTemplate: string;
      let promptSource: string;
      
      try {
        const promptData = await getPrompt(AgentType.MODIFIER, PromptOperation.MODIFICATION);
        promptTemplate = substituteVariables(promptData.template, {
          baseSystemPrompt,
          currentDiagram: validatedParams.currentDiagram,
          userInput: validatedParams.userInput,
          guidelines: guidelinesText,
          formatInstructions: this.parser.getFormatInstructions()
        });
        promptSource = promptData.source;
        
        const duration = Date.now() - startTime;
        logPromptUsage(AgentType.MODIFIER, PromptOperation.MODIFICATION, promptData.source, duration);
      } catch (promptError) {
        logger.warn("Failed to load dynamic prompt, using fallback", { error: promptError });
        // Fallback to original hardcoded prompt
        promptTemplate = `
          ${baseSystemPrompt}
          
          You are a specialist in modifying PlantUML diagrams based on user instructions.
          
          Current diagram:
          \`\`\`plantuml
          ${validatedParams.currentDiagram}
          \`\`\`
          
          User modification request: ${validatedParams.userInput}
          
          PlantUML Guidelines:
          ${guidelinesText}
          
          Modify the diagram according to the user's instructions.
          Preserve existing structure while implementing the requested changes.
          Ensure the modified diagram uses correct PlantUML syntax.
          
          ${this.parser.getFormatInstructions()}
        `;
        promptSource = 'hardcoded-fallback';
      }
      
      const modificationPrompt = PromptTemplate.fromTemplate(promptTemplate);
      
      // Create the modification chain
      const modificationChain = RunnableSequence.from([
        modificationPrompt,
        model,
        this.parser
      ]);
      
      // Execute the chain
      const result = await modificationChain.invoke({});
      
      // Ensure result has the expected type structure
      const typedResult = result as unknown as ModificationResult;
      
      // Validate the result has actual changes
      if (typedResult.diagram === validatedParams.currentDiagram) {
        // If no changes were made despite user request, try again with stronger emphasis
        logger.warn("No changes were made to the diagram", {
          request: validatedParams.userInput
        });
        
        return await this.retryModification(validatedParams, diagramType);
      }
      
      logger.info("Diagram modification completed", { 
        diagramType: typedResult.diagramType,
        changes: typedResult.changes ? typedResult.changes.length : 0,
        promptSource
      });
      
      return typedResult;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Input validation error:", { errors: error.errors });
        // Return a fallback response with the original diagram
        return {
          diagram: params.currentDiagram || "",
          diagramType: ModifierDiagramType.UNKNOWN,
          changes: [`Error: Invalid modification parameters: ${error.message}`],
          explanation: `I couldn't modify the diagram due to validation errors: ${error.message}. Please try again with clearer instructions.`
        };
      } else if (error instanceof Error) {
        logger.error("Error modifying diagram:", { 
          message: error.message, 
          stack: error.stack
        });
        
        // Return a fallback response with the original diagram
        return {
          diagram: params.currentDiagram,
          diagramType: ModifierDiagramType.UNKNOWN,
          changes: [`Error: ${error.message}`],
          explanation: `I encountered an error while modifying the diagram: ${error.message}. Please try again with different instructions.`
        };
      } else {
        logger.error("Unknown error during diagram modification:", { error });
        
        // Return a generic fallback with the original diagram
        return {
          diagram: params.currentDiagram,
          diagramType: ModifierDiagramType.UNKNOWN,
          changes: ["Error: Unknown error occurred"],
          explanation: "I encountered an unexpected error while modifying the diagram. Please try again with different instructions."
        };
      }
    }
  }

  /**
   * Retry modification with stronger emphasis on making changes
   * @param params - Original parameters
   * @param diagramType - Detected diagram type
   * @returns Modified result
   * @private
   */
  private async retryModification(
    params: ModifierParams, 
    diagramType: ModifierDiagramType
  ): Promise<ModificationResult> {
    try {
      // Load retry modification prompt dynamically
      let promptTemplate: string;
      
      try {
        const promptData = await getPrompt(AgentType.MODIFIER, 'retry-modification');
        promptTemplate = substituteVariables(promptData.template, {
          baseSystemPrompt,
          currentDiagram: params.currentDiagram,
          userInput: params.userInput
        });
        logPromptUsage(AgentType.MODIFIER, 'retry-modification', promptData.source, 0);
      } catch (promptError) {
        logger.warn("Failed to load retry prompt, using fallback", { error: promptError });
        // Fallback to hardcoded prompt
        promptTemplate = `
          ${baseSystemPrompt}
          
          You are a specialist in modifying PlantUML diagrams based on user instructions.
          
          Current diagram:
          \`\`\`plantuml
          ${params.currentDiagram}
          \`\`\`
          
          User modification request: ${params.userInput}
          
          IMPORTANT: You MUST make the specific changes requested by the user.
          The previous attempt did not implement any changes.
          
          Carefully analyze the diagram and implement the requested modifications.
          Focus on the specific elements the user wants to change.
          
          Modified diagram (full code, starting with @startuml and ending with @enduml):
        `;
      }
      
      const retryPrompt = PromptTemplate.fromTemplate(promptTemplate);
      
      // Create the retry chain
      const retryChain = RunnableSequence.from([
        retryPrompt,
        model,
        new StringOutputParser()
      ]);
      
      // Execute the chain
      const modifiedDiagram = await retryChain.invoke({});
      
      // Extract the diagram from the result (it might have extra text)
      const diagramMatch = modifiedDiagram.match(/@startuml[\s\S]*?@enduml/);
      const diagram = diagramMatch ? diagramMatch[0] : modifiedDiagram;
      
      // Load changes description prompt dynamically
      let changesTemplate: string;
      
      try {
        const promptData = await getPrompt(AgentType.MODIFIER, 'changes-description');
        changesTemplate = substituteVariables(promptData.template, {
          baseSystemPrompt,
          userInput: params.userInput
        });
        logPromptUsage(AgentType.MODIFIER, 'changes-description', promptData.source, 0);
      } catch (promptError) {
        logger.warn("Failed to load changes prompt, using fallback", { error: promptError });
        // Fallback to hardcoded prompt
        changesTemplate = `
          ${baseSystemPrompt}
          
          You have modified a PlantUML diagram based on this request:
          "${params.userInput}"
          
          List the specific changes you made, one per line.
          Be concise but clear. Start each line with "- ".
        `;
      }
      
      const changesPrompt = PromptTemplate.fromTemplate(changesTemplate);
      
      const changesChain = RunnableSequence.from([
        changesPrompt,
        model,
        new StringOutputParser()
      ]);
      
      const changesText = await changesChain.invoke({});
      
      // Convert to array of changes
      const changes = changesText
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.substring(1).trim())
        .filter(Boolean);
      
      logger.info("Diagram modification retry completed", { 
        diagramType,
        changes: changes.length
      });
      
      return {
        diagram,
        diagramType,
        changes: changes.length > 0 ? changes : ["Updated diagram as requested"],
        explanation: `I've modified the diagram according to your request: "${params.userInput}"`
      };
    } catch (retryError) {
      logger.error("Error in modification retry:", retryError);
      
      // Return a fallback with the original diagram
      return {
        diagram: params.currentDiagram,
        diagramType,
        changes: ["No changes made due to error"],
        explanation: "I tried to modify the diagram but encountered an error. Please try again with more specific instructions."
      };
    }
  }

  /**
   * Detect the diagram type from an existing diagram
   * @param diagram - The current diagram
   * @returns Detected diagram type
   * @private
   */
  private async detectDiagramType(diagram: string): Promise<ModifierDiagramType> {
    try {
      // Load type detection prompt dynamically
      let promptTemplate: string;
      
      try {
        const promptData = await getPrompt(AgentType.MODIFIER, 'type-detection');
        promptTemplate = substituteVariables(promptData.template, {
          baseSystemPrompt,
          diagram
        });
        logPromptUsage(AgentType.MODIFIER, 'type-detection', promptData.source, 0);
      } catch (promptError) {
        logger.warn("Failed to load type detection prompt, using fallback", { error: promptError });
        // Fallback to hardcoded prompt
        promptTemplate = `
          ${baseSystemPrompt}
          
          Determine the type of the following PlantUML diagram:
          
          \`\`\`plantuml
          ${diagram}
          \`\`\`
          
          Return ONLY one of these types that best matches the diagram:
          SEQUENCE, CLASS, ACTIVITY, STATE, COMPONENT, DEPLOYMENT, USE_CASE, ENTITY_RELATIONSHIP
        `;
      }
      
      const detectTypePrompt = PromptTemplate.fromTemplate(promptTemplate);
      
      const detectTypeChain = RunnableSequence.from([
        detectTypePrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectTypeChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid DiagramType
      const diagramTypeMap: Record<string, ModifierDiagramType> = {
        "SEQUENCE": ModifierDiagramType.SEQUENCE,
        "CLASS": ModifierDiagramType.CLASS,
        "ACTIVITY": ModifierDiagramType.ACTIVITY,
        "STATE": ModifierDiagramType.STATE,
        "COMPONENT": ModifierDiagramType.COMPONENT,
        "DEPLOYMENT": ModifierDiagramType.DEPLOYMENT,
        "USE_CASE": ModifierDiagramType.USE_CASE,
        "USECASE": ModifierDiagramType.USE_CASE,
        "ENTITY_RELATIONSHIP": ModifierDiagramType.ENTITY_RELATIONSHIP,
        "ER": ModifierDiagramType.ENTITY_RELATIONSHIP
      };
      
      const finalType = diagramTypeMap[detectedType] || ModifierDiagramType.UNKNOWN;
      
      logger.info("Diagram type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting diagram type:", error);
      return ModifierDiagramType.UNKNOWN;
    }
  }

  /**
   * Invoke the modifier (convenience method for chainable API)
   * @param params - Modifier parameters
   * @returns Modifier result
   */
  public async invoke(params: ModifierParams): Promise<ModificationResult> {
    return this.modify(params);
  }
}

// Export singleton instance
export const diagramModifier = new DiagramModifier();