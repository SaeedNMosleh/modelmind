import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { model } from "../baseChain";
import { BASE_SYSTEM_PROMPT } from "../../prompts/embedded";
import { UnifiedOutputParser, UnifiedParserFactory } from "../parsers/UnifiedOutputParser";
import { DiagramType as GuidelinesType, readGuidelines } from "../../knowledge/guidelines";
import { getPrompt, logPromptUsage } from "../../prompts/loader";
import { AgentType, PromptOperation } from "../../database/types";
import { DiagramType } from "../schemas/MasterClassificationSchema";
import { createEnhancedLogger, withTiming } from "../../utils/consola-logger";

// Setup enhanced logger
const logger = createEnhancedLogger('modifier');

/**
 * Schema defining the structure of the diagram modification output
 */
const modificationOutputSchema = z.object({
  diagram: z.string().min(10),
  diagramType: z.nativeEnum(DiagramType),
  changes: z.array(z.string()).min(1),
  explanation: z.string()
});

/**
 * Type definition for the modifier result
 */
export type ModificationResult = z.infer<typeof modificationOutputSchema>;

/**
 * Schema for modifier input parameters - diagramType now required from MasterClassifier
 */
const modifierParamsSchema = z.object({
  userInput: z.string().min(1),
  currentDiagram: z.string().min(10),
  diagramType: z.nativeEnum(DiagramType), // Now required from MasterClassifier
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for modifier parameters
 */
export type ModifierParams = z.infer<typeof modifierParamsSchema>;

/**
 * Helper function to map diagram type to the guidelines diagram type
 */
function mapToGuidelinesType(type: DiagramType): GuidelinesType {
  switch(type) {
    case DiagramType.SEQUENCE: 
      return 'sequence';
    case DiagramType.CLASS: 
      return 'class';
    case DiagramType.ACTIVITY: 
      return 'activity';
    case DiagramType.STATE: 
      return 'state';
    case DiagramType.COMPONENT: 
      return 'component';
    case DiagramType.USE_CASE: 
      return 'use-case';
    case DiagramType.ENTITY_RELATIONSHIP: 
      return 'entity-relationship';
    case DiagramType.DEPLOYMENT:
      return 'deployment';
    default:
      return 'sequence'; // Default fallback
  }
}

/**
 * Specialized agent for modifying existing PlantUML diagrams
 */
export class DiagramModifier {
  private parser: UnifiedOutputParser<ModificationResult>;

  constructor() {
    // Create default fallback for modification
    const defaultFallback: ModificationResult = {
      diagram: "",
      diagramType: DiagramType.UNKNOWN,
      changes: ["Error: Could not modify the diagram"],
      explanation: "I encountered an error while modifying the diagram. Please try again with different instructions."
    };

    // Use UnifiedOutputParser with modification-specific configuration
    this.parser = UnifiedParserFactory.createModificationParser(modificationOutputSchema, defaultFallback);
  }

  /**
   * Modify an existing PlantUML diagram based on user instructions
   * @param params - Parameters for modification (diagramType now required from MasterClassifier)
   * @returns A promise resolving to the modification result
   */
  public async modify(params: ModifierParams): Promise<ModificationResult> {
    try {
      // Validate input params
      const validatedParams = modifierParamsSchema.parse(params);
      const { userInput, currentDiagram, diagramType } = validatedParams;
      
      logger.stageStart(`diagram modification (${diagramType})`);
      logger.debug(`📋 Modification request received`);
      
      // Fetch relevant guidelines
      const guidelinesText = await this.fetchGuidelines(diagramType);
      
      // Get the modification prompt template and variables
      const promptData = await this.getModificationPromptTemplate(
        userInput, 
        currentDiagram, 
        diagramType, 
        guidelinesText
      );
      
      // Create and execute the modification chain with timing
      const modificationChain = RunnableSequence.from([
        PromptTemplate.fromTemplate(promptData.template),
        model,
        this.parser
      ]);
      
      const result = await withTiming(
        logger,
        "LLM modification",
        () => modificationChain.invoke(promptData.variables)
      );
      
      // Validate the result has actual changes
      const changeCount = result.changes?.length || 0;
      if (result.diagram === currentDiagram) {
        logger.warn(`⚠️ No structural changes detected | Original preserved`);
        // Add a note about no changes but still return the result
        result.changes = [...(result.changes || []), "Note: Original diagram structure preserved"];
      }
      
      // Calculate performance metrics
      const startTime = Date.now();
      logger.modification(result.diagramType, changeCount, Date.now() - startTime);
      
      return result;
    } catch (error) {
      return this.handleModificationError(error, params);
    }
  }

  /**
   * Fetch guidelines for the diagram type
   * @private
   */
  private async fetchGuidelines(diagramType: DiagramType): Promise<string> {
    try {
      const guidelinesType = mapToGuidelinesType(diagramType);
      const guidelines = await readGuidelines(guidelinesType);
      
      return guidelines && typeof guidelines === 'string' 
        ? guidelines 
        : "No specific guidelines available.";
    } catch (error) {
      logger.error("Error fetching guidelines:", error);
      return "No specific guidelines available.";
    }
  }

  /**
   * Get the modification prompt template and variables
   * @private
   */
  private async getModificationPromptTemplate(
    userInput: string,
    currentDiagram: string,
    diagramType: DiagramType,
    guidelinesText: string
  ): Promise<{ template: string; variables: Record<string, string> }> {
    const variables = {
      baseSystemPrompt: BASE_SYSTEM_PROMPT,
      currentDiagram,
      userInput,
      diagramType: diagramType.toString(),
      guidelines: guidelinesText,
      formatInstructions: this.parser.getFormatInstructions()
    };

    try {
      const startTime = Date.now();
      const promptData = await getPrompt(AgentType.MODIFIER, PromptOperation.MODIFICATION);
      
      const duration = Date.now() - startTime;
      logPromptUsage(AgentType.MODIFIER, PromptOperation.MODIFICATION, promptData.source, duration);
      
      return {
        template: promptData.template,
        variables
      };
    } catch (promptError) {
      logger.error("Failed to load prompt", { error: promptError });
      throw new Error(`Modifier prompt loading failed: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle modification errors with meaningful fallbacks
   * @private
   */
  private handleModificationError(error: unknown, params: ModifierParams): ModificationResult {
    if (error instanceof z.ZodError) {
      logger.error("Input validation error:", { errors: error.errors });
      return {
        diagram: params.currentDiagram || "",
        diagramType: params.diagramType,
        changes: [`Error: Invalid modification parameters: ${error.message}`],
        explanation: `I couldn't modify the diagram due to validation errors: ${error.message}. Please try again with clearer instructions.`
      };
    }

    if (error instanceof Error) {
      logger.error("Error modifying diagram:", { 
        message: error.message, 
        stack: error.stack
      });
      
      return {
        diagram: params.currentDiagram,
        diagramType: params.diagramType,
        changes: [`Error: ${error.message}`],
        explanation: `I encountered an error while modifying the diagram: ${error.message}. Please try again with different instructions.`
      };
    }

    logger.error("Unknown error during diagram modification:", { error });
    return {
      diagram: params.currentDiagram,
      diagramType: params.diagramType,
      changes: ["Error: Unknown error occurred"],
      explanation: "I encountered an unexpected error while modifying the diagram. Please try again with different instructions."
    };
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