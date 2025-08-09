import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
import { UnifiedOutputParser, UnifiedParserFactory } from "../parsers/UnifiedOutputParser";
import { DiagramType as GuidelinesType, readGuidelines } from "../../knowledge/guidelines";
import { listTemplates } from "../../knowledge/templates";
import { getPrompt, logPromptUsage } from "../../prompts/loader";
import { AgentType, PromptOperation } from "../../database/types";
import { DiagramType } from "../schemas/MasterClassificationSchema";
import { createEnhancedLogger } from "../../utils/consola-logger";

// Use enhanced logger
const logger = createEnhancedLogger('generator');

/**
 * Schema defining the structure of the diagram generation output
 */
const generationOutputSchema = z.object({
  diagram: z.string().min(10),
  diagramType: z.nativeEnum(DiagramType),
  explanation: z.string(),
  suggestions: z.array(z.string()).optional()
});

/**
 * Type definition for the generator result
 */
export type GenerationResult = z.infer<typeof generationOutputSchema>;

/**
 * Schema for generator input parameters - now requires diagramType from MasterClassifier
 */
const generatorParamsSchema = z.object({
  userInput: z.string().min(1),
  diagramType: z.nativeEnum(DiagramType), // Now required from MasterClassifier
  currentDiagram: z.string().optional(), // For reference-based generation
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for generator parameters
 */
export type GeneratorParams = z.infer<typeof generatorParamsSchema>;

/**
 * Helper function to map diagram type to the guidelines diagram type
 */
function mapToGuidelinesType(type: DiagramType): GuidelinesType {
  switch(type) {
    case DiagramType.SEQUENCE: 
      return 'sequence' as GuidelinesType;
    case DiagramType.CLASS: 
      return 'class' as GuidelinesType;
    case DiagramType.ACTIVITY: 
      return 'activity' as GuidelinesType;
    case DiagramType.STATE: 
      return 'state' as GuidelinesType;
    case DiagramType.COMPONENT: 
      return 'component' as GuidelinesType;
    case DiagramType.USE_CASE: 
      return 'use-case' as GuidelinesType;
    case DiagramType.ENTITY_RELATIONSHIP: 
      return 'entity_relationship' as GuidelinesType;
    case DiagramType.DEPLOYMENT:
      return 'deployment' as GuidelinesType;
    default:
      return 'sequence' as GuidelinesType; // Default fallback
  }
}

/**
 * Specialized agent for generating PlantUML diagrams from user requirements
 */
export class DiagramGenerator {
  private parser: UnifiedOutputParser<GenerationResult>;

  constructor() {
    // Create default fallback for generation
    const defaultFallback: GenerationResult = {
      diagram: `@startuml\ntitle Error in Diagram Generation\nnote "Could not generate diagram" as Error\n@enduml`,
      diagramType: DiagramType.UNKNOWN,
      explanation: "I encountered an error while generating the diagram. Please try again with a different description."
    };

    // Use UnifiedOutputParser with generation-specific configuration
    this.parser = UnifiedParserFactory.createGenerationParser(generationOutputSchema, defaultFallback);
  }

  /**
   * Generate a new PlantUML diagram based on user requirements
   * @param params - Parameters for generation (diagramType now required from MasterClassifier)
   * @returns A promise resolving to the generation result
   */
  public async generate(params: GeneratorParams): Promise<GenerationResult> {
    try {
      // Validate input params
      const validatedParams = generatorParamsSchema.parse(params);
      const { userInput, diagramType, currentDiagram = "" } = validatedParams;
      
      logger.stageStart(`diagram generation (${diagramType})`);
      logger.debug(`🎨 Generation request received`);
      
      // Fetch relevant guidelines and templates
      const { guidelinesText, templatesText } = await this.fetchDiagramResources(diagramType);
      
      // Load the generation prompt template (without variable substitution)
      const promptData = await this.getPromptTemplate(userInput, diagramType, currentDiagram, guidelinesText, templatesText);
      
      // Create and execute the generation chain
      const generationChain = RunnableSequence.from([
        PromptTemplate.fromTemplate(promptData.template),
        model,
        this.parser
      ]);
      
      // Pass all required variables to the chain
      const result = await generationChain.invoke(promptData.variables);
      
      // Calculate performance metrics and diagram stats
      const lineCount = result.diagram.split('\n').length;
      const startTime = Date.now();
      logger.generation(result.diagramType, Date.now() - startTime, lineCount);
      
      return result;
    } catch (error) {
      return this.handleGenerationError(error);
    }
  }

  /**
   * Fetch diagram resources (guidelines and templates)
   * @private
   */
  private async fetchDiagramResources(diagramType: DiagramType): Promise<{
    guidelinesText: string;
    templatesText: string;
  }> {
    try {
      const guidelinesType = mapToGuidelinesType(diagramType);
      
      // Fetch guidelines and templates in parallel
      const [guidelines, templates] = await Promise.all([
        readGuidelines(guidelinesType),
        listTemplates(guidelinesType)
      ]);
      
      const guidelinesText = guidelines && typeof guidelines === 'string' 
        ? guidelines 
        : "No specific guidelines available.";
      
      const templatesText = templates && templates.length > 0
        ? templates.map(t => `${t.name}:\n${t.description || ''}`).join('\n\n')
        : "No specific templates available for this diagram type.";
      
      return { guidelinesText, templatesText };
    } catch (error) {
      logger.error("Error fetching diagram resources:", error);
      return {
        guidelinesText: "No specific guidelines available.",
        templatesText: "No specific templates available for this diagram type."
      };
    }
  }

  /**
   * Get the generation prompt template and variables
   * @private
   */
  private async getPromptTemplate(
    userInput: string,
    diagramType: DiagramType,
    currentDiagram: string,
    guidelinesText: string,
    templatesText: string
  ): Promise<{ template: string; variables: Record<string, string> }> {
    const variables = {
      baseSystemPrompt,
      currentDiagram: currentDiagram || "No diagram exists currently in editor",
      userInput,
      diagramType: diagramType.toString(),
      guidelines: guidelinesText,
      templates: templatesText,
      formatInstructions: this.parser.getFormatInstructions()
    };

    try {
      const startTime = Date.now();
      const promptData = await getPrompt(AgentType.GENERATOR, PromptOperation.GENERATION);
      
      const duration = Date.now() - startTime;
      logPromptUsage(AgentType.GENERATOR, PromptOperation.GENERATION, promptData.source, duration);
      
      return {
        template: promptData.template,
        variables
      };
    } catch (promptError) {
      logger.warn("Failed to load dynamic prompt, using fallback", { error: promptError });
      
      // Fallback template with proper variable placeholders
      const fallbackTemplate = `{baseSystemPrompt}

You are a specialist in creating PlantUML diagrams based on user requirements.

Current diagram (for reference):
\`\`\`plantuml
{currentDiagram}
\`\`\`

User requirements: {userInput}

Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Available Templates:
{templates}

Based on the requirements, create a detailed PlantUML diagram.
Focus on clarity, proper syntax, and following best practices.

{formatInstructions}`;

      return {
        template: fallbackTemplate,
        variables
      };
    }
  }

  /**
   * Handle generation errors with meaningful fallbacks
   * @private
   */
  private handleGenerationError(error: unknown): GenerationResult {
    if (error instanceof z.ZodError) {
      logger.error("Input validation error:", { errors: error.errors });
      return {
        diagram: `@startuml\ntitle Error: Invalid Generation Parameters\nnote "Error: ${error.message}" as Error\n@enduml`,
        diagramType: DiagramType.UNKNOWN,
        explanation: `I couldn't generate the diagram due to invalid parameters: ${error.message}. Please try again with a clearer description.`
      };
    }

    if (error instanceof Error) {
      logger.error("Error generating diagram:", { 
        message: error.message, 
        stack: error.stack
      });
      
      return {
        diagram: `@startuml\ntitle Error in Diagram Generation\nnote "Error: ${error.message}" as Error\n@enduml`,
        diagramType: DiagramType.UNKNOWN,
        explanation: `I encountered an error while generating the diagram: ${error.message}. Please try again or provide more details.`
      };
    }

    logger.error("Unknown error during diagram generation:", { error });
    return {
      diagram: `@startuml\ntitle Error in Diagram Generation\nnote "An unknown error occurred" as Error\n@enduml`,
      diagramType: DiagramType.UNKNOWN,
      explanation: "I encountered an unexpected error while generating the diagram. Please try again with a different description."
    };
  }

  /**
   * Invoke the generator (convenience method for chainable API)
   * @param params - Generator parameters
   * @returns Generator result
   */
  public async invoke(params: GeneratorParams): Promise<GenerationResult> {
    return this.generate(params);
  }
}

// Export singleton instance for easier imports
export const diagramGenerator = new DiagramGenerator();