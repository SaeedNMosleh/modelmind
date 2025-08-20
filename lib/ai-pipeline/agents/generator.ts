import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { model } from "../baseChain";
import { BASE_SYSTEM_PROMPT } from "../../prompts/embedded";
import { UnifiedOutputParser, UnifiedParserFactory } from "../parsers/UnifiedOutputParser";
import { DiagramType as GuidelinesType, readGuidelines } from "../../knowledge/guidelines";
import { getTemplate } from "../../knowledge/templates";
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
  diagram: z.string().min(10).nullable(),
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
      return 'entity-relationship' as GuidelinesType;
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
      logger.debug(`🎨 Generation request received`, {
        userInput: userInput.substring(0, 100) + (userInput.length > 100 ? '...' : ''),
        diagramType,
        hasCurrentDiagram: !!currentDiagram
      });
      
      // Fetch relevant guidelines and template
      logger.debug('📚 Fetching diagram resources...');
      const { guidelinesText, templateContent } = await this.fetchDiagramResources(diagramType);
      logger.debug('📚 Resources fetched', { 
        guidelinesLength: guidelinesText.length, 
        templateLength: templateContent.length 
      });
      
      // Load the generation prompt template (without variable substitution)
      logger.debug('📝 Loading prompt template...');
      const promptData = await this.getPromptTemplate(userInput, diagramType, currentDiagram, guidelinesText, templateContent);
      logger.debug('📝 Prompt template loaded', { 
        templateLength: promptData.template.length,
        variableCount: Object.keys(promptData.variables).length
      });
      
      // Create and execute the generation chain
      logger.debug('🔗 Creating generation chain...');
      const generationChain = RunnableSequence.from([
        PromptTemplate.fromTemplate(promptData.template),
        model,
        this.parser
      ]);
      
      // Pass all required variables to the chain
      logger.debug('🚀 Invoking generation chain...', {
        variableKeys: Object.keys(promptData.variables),
        templatePreview: promptData.template.substring(0, 200) + '...'
      });
      
      try {
        const result = await generationChain.invoke(promptData.variables);
        logger.debug('✅ Generation chain completed', { 
          resultType: typeof result,
          hasDiagram: !!result?.diagram,
          diagramLength: result?.diagram?.length || 0
        });
        
        // Validate the result structure
        if (!result) {
          throw new Error('Generation chain returned null/undefined result');
        }
        
        if (typeof result !== 'object') {
          throw new Error(`Generation chain returned unexpected type: ${typeof result}`);
        }
        
        // Calculate performance metrics and diagram stats
        const lineCount = result.diagram ? result.diagram.split('\n').length : 0;
        const startTime = Date.now();
        logger.generation(result.diagramType, Date.now() - startTime, lineCount);
        
        return result;
      } catch (chainError) {
        logger.error('❌ Generation chain execution failed:', {
          errorType: chainError instanceof Error ? chainError.constructor.name : typeof chainError,
          errorMessage: chainError instanceof Error ? chainError.message : String(chainError),
          errorStack: chainError instanceof Error ? chainError.stack : undefined,
          params: {
            userInput: userInput.substring(0, 100) + '...',
            diagramType,
            templateLength: promptData.template.length,
            variableCount: Object.keys(promptData.variables).length
          }
        });
        throw chainError; // Re-throw to be handled by outer catch
      }
      
    } catch (error) {
      logger.error('💥 Generation method failed:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
        params: {
          userInput: params.userInput?.substring(0, 100) + '...',
          diagramType: params.diagramType
        }
      });
      return this.handleGenerationError(error, params);
    }
  }

  /**
   * Fetch diagram resources (guidelines and templates)
   * @private
   */
  private async fetchDiagramResources(diagramType: DiagramType): Promise<{
    guidelinesText: string;
    templateContent: string;
  }> {
    try {
      const guidelinesType = mapToGuidelinesType(diagramType);
      
      // Fetch guidelines and template content in parallel
      const [guidelines, template] = await Promise.all([
        readGuidelines(guidelinesType),
        getTemplate(guidelinesType)
      ]);
      
      const guidelinesText = guidelines && typeof guidelines === 'string' 
        ? guidelines 
        : "No specific guidelines available.";
      
      const templateContent = template && template.length > 0
        ? template
        : "No template available for this diagram type.";
      
      return { guidelinesText, templateContent };
    } catch (error) {
      logger.error("Error fetching diagram resources:", error);
      return {
        guidelinesText: "No specific guidelines available.",
        templateContent: "No template available for this diagram type."
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
    templateContent: string
  ): Promise<{ template: string; variables: Record<string, string> }> {
    const variables = {
      baseSystemPrompt: BASE_SYSTEM_PROMPT,
      currentDiagram: currentDiagram || "No diagram exists currently in editor",
      userInput,
      diagramType: diagramType.toString(),
      guidelines: guidelinesText,
      template: templateContent,
      templates: templateContent, // Add both singular and plural for compatibility
      formatInstructions: this.parser.getFormatInstructions()
    };

    try {
      const startTime = Date.now();
      const promptData = await getPrompt(AgentType.GENERATOR, PromptOperation.GENERATION);
      
      const duration = Date.now() - startTime;
      logPromptUsage(AgentType.GENERATOR, PromptOperation.GENERATION, promptData.source, duration);
      
      // Debug: Extract variables from template to see what's expected
      const templateVariables = promptData.template.match(/\{([^}]+)\}/g);
      logger.debug("Template analysis:", {
        expectedVariables: templateVariables,
        providedVariables: Object.keys(variables),
        templatePreview: promptData.template.substring(0, 300) + '...'
      });
      
      return {
        template: promptData.template,
        variables
      };
    } catch (promptError) {
      logger.error("Failed to load prompt", { error: promptError });
      throw new Error(`Generator prompt loading failed: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle generation errors with meaningful fallbacks
   * @private
   */
  private handleGenerationError(error: unknown, params: GeneratorParams): GenerationResult {
    // Enhanced error logging with proper serialization
    if (error instanceof z.ZodError) {
      logger.error("Input validation error:", { 
        errors: error.errors,
        params: {
          userInput: params.userInput,
          diagramType: params.diagramType
        }
      });
      return {
        diagram: null,
        diagramType: params.diagramType,
        explanation: `I couldn't generate the diagram due to invalid parameters: ${error.message}. Please try again with a clearer description.`
      };
    }

    if (error instanceof Error) {
      logger.error("Error generating diagram:", { 
        message: error.message, 
        stack: error.stack,
        name: error.name,
        params: {
          userInput: params.userInput,
          diagramType: params.diagramType
        }
      });
      
      return {
        diagram: null,
        diagramType: params.diagramType,
        explanation: `I encountered an error while generating the diagram: ${error.message}. Please try again or provide more details.`
      };
    }

    // Handle any other type of error with proper serialization
    const errorString = typeof error === 'string' ? error : 
                       typeof error === 'object' && error !== null ? JSON.stringify(error, null, 2) :
                       String(error);
    
    logger.error("Unknown error during diagram generation:", { 
      error: errorString,
      errorType: typeof error,
      params: {
        userInput: params.userInput,
        diagramType: params.diagramType
      }
    });
    
    return {
      diagram: null,
      diagramType: params.diagramType,
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