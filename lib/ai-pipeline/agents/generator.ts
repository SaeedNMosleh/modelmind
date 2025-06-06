import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
// Import the DiagramType from guidelines with an alias to avoid conflicts
import { DiagramType as GuidelinesType, readGuidelines } from "../../knowledge/guidelines";
// Fix the import for templates
import { listTemplates } from "../../knowledge/templates";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Our local enum for diagram types used in the generator
 */
export enum GeneratorDiagramType {
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
 * Schema defining the structure of the diagram generation output
 */
const generationOutputSchema = z.object({
  diagram: z.string().min(10),
  diagramType: z.nativeEnum(GeneratorDiagramType),
  explanation: z.string(),
  suggestions: z.array(z.string()).optional()
});

/**
 * Type definition for the generator result
 */
export type GenerationResult = z.infer<typeof generationOutputSchema>;

/**
 * Schema for generator input parameters
 */
const generatorParamsSchema = z.object({
  userInput: z.string().min(1),
  diagramType: z.nativeEnum(GeneratorDiagramType).optional(),
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for generator parameters
 */
export type GeneratorParams = z.infer<typeof generatorParamsSchema>;

/**
 * Helper function to map our generator diagram type to the guidelines diagram type
 */
function mapToGuidelinesType(type: GeneratorDiagramType): GuidelinesType {
  switch(type) {
    case GeneratorDiagramType.SEQUENCE: 
      return 'sequence' as GuidelinesType;
    case GeneratorDiagramType.CLASS: 
      return 'class' as GuidelinesType;
    case GeneratorDiagramType.ACTIVITY: 
      return 'activity' as GuidelinesType;
    case GeneratorDiagramType.STATE: 
      return 'state' as GuidelinesType;
    case GeneratorDiagramType.COMPONENT: 
      return 'component' as GuidelinesType;
    case GeneratorDiagramType.USE_CASE: 
      return 'use-case' as GuidelinesType;
    case GeneratorDiagramType.ENTITY_RELATIONSHIP: 
      return 'entity_relationship' as GuidelinesType;
    default:
      return 'sequence' as GuidelinesType; // Default fallback
  }
}

/**
 * Specialized agent for generating PlantUML diagrams from user requirements
 */
export class DiagramGenerator {
  private parser;

  constructor() {
    this.parser = StructuredOutputParser.fromZodSchema(generationOutputSchema);
  }

  /**
   * Generate a new PlantUML diagram based on user requirements
   * @param params - Parameters for generation
   * @returns A promise resolving to the generation result
   */
  public async generate(params: GeneratorParams): Promise<GenerationResult> {
    try {
      // Validate input params
      const validatedParams = generatorParamsSchema.parse(params);
      
      // Determine diagram type from input or context
      const diagramType = validatedParams.diagramType || 
        await this.detectDiagramType(validatedParams.userInput);
      
      logger.info("Generating diagram with type", { diagramType });
      
      // Fetch relevant guidelines and templates
      let guidelines, templates;
      try {
        // Convert our enum to the expected type for guidelines
        const guidelinesType = mapToGuidelinesType(diagramType);
        
        // Get guidelines and templates
        guidelines = await readGuidelines(guidelinesType);
        
        // Get templates for the appropriate diagram type
        templates = await listTemplates(mapToGuidelinesType(diagramType));
      } catch (resourceError) {
        logger.error("Error fetching guidelines or templates:", resourceError);
        guidelines = null;
        templates = [];
      }
      
      // Format guidelines for prompt
      let guidelinesText = "No specific guidelines available.";
      if (guidelines && typeof guidelines === 'string') {
        guidelinesText = guidelines;
      }
      
      // Format templates for prompt
      let templatesText = "No specific templates available for this diagram type.";
      if (templates && templates.length > 0) {
        templatesText = templates.map(t => `${t.name}:\n${t.description || ''}`).join('\n\n');
      }
      
      // Create the generation prompt template
      const generationPrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        You are a specialist in creating PlantUML diagrams based on user requirements.
        
        User requirements: ${validatedParams.userInput}
        
        Diagram type: ${diagramType}
        
        PlantUML Guidelines:
        ${guidelinesText}
        
        Available Templates:
        ${templatesText}
        
        Based on the requirements, create a detailed PlantUML diagram.
        Focus on clarity, proper syntax, and following best practices.
        
        ${this.parser.getFormatInstructions()}
      `);
      
      // Create the generation chain
      const generationChain = RunnableSequence.from([
        generationPrompt,
        model,
        this.parser
      ]);
      
      // Execute the chain
      const result = await generationChain.invoke({});
      
      // Ensure result has the expected type structure
      const typedResult = result as unknown as GenerationResult;
      
      logger.info("Diagram generation completed", { 
        diagramType: typedResult.diagramType,
        diagramLength: typedResult.diagram ? typedResult.diagram.length : 0
      });
      
      return typedResult;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Input validation error:", { errors: error.errors });
        // Return a fallback response with an error diagram
        return {
          diagram: `@startuml\ntitle Error: Invalid Generation Parameters\nnote "Error: ${error.message}" as Error\n@enduml`,
          diagramType: GeneratorDiagramType.UNKNOWN,
          explanation: `I couldn't generate the diagram due to invalid parameters: ${error.message}. Please try again with a clearer description.`
        };
      } else if (error instanceof Error) {
        logger.error("Error generating diagram:", { 
          message: error.message, 
          stack: error.stack
        });
        
        // Return a fallback response with an error diagram
        return {
          diagram: `@startuml\ntitle Error in Diagram Generation\nnote "Error: ${error.message}" as Error\n@enduml`,
          diagramType: GeneratorDiagramType.UNKNOWN,
          explanation: `I encountered an error while generating the diagram: ${error.message}. Please try again or provide more details.`
        };
      } else {
        logger.error("Unknown error during diagram generation:", { error });
        
        // Return a generic fallback response
        return {
          diagram: `@startuml\ntitle Error in Diagram Generation\nnote "An unknown error occurred" as Error\n@enduml`,
          diagramType: GeneratorDiagramType.UNKNOWN,
          explanation: "I encountered an unexpected error while generating the diagram. Please try again with a different description."
        };
      }
    }
  }

  /**
   * Detect the diagram type from user input
   * @param userInput - The user's input message
   * @returns Detected diagram type
   * @private
   */
  private async detectDiagramType(userInput: string): Promise<GeneratorDiagramType> {
    try {
      const detectTypePrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Determine the most appropriate PlantUML diagram type based on the user's request:
        
        User request: ${userInput}
        
        Valid diagram types:
        - SEQUENCE: for interactions between components over time
        - CLASS: for system structure and relationships
        - ACTIVITY: for workflows and processes
        - STATE: for state transitions and behaviors
        - COMPONENT: for system components and interfaces
        - DEPLOYMENT: for physical deployment of components
        - USE_CASE: for system/actor interactions
        - ENTITY_RELATIONSHIP: for data modeling
        
        Return ONLY one of these types that best matches the user's request.
      `);
      
      const detectTypeChain = RunnableSequence.from([
        detectTypePrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectTypeChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid DiagramType
      const diagramTypeMap: Record<string, GeneratorDiagramType> = {
        "SEQUENCE": GeneratorDiagramType.SEQUENCE,
        "CLASS": GeneratorDiagramType.CLASS,
        "ACTIVITY": GeneratorDiagramType.ACTIVITY,
        "STATE": GeneratorDiagramType.STATE,
        "COMPONENT": GeneratorDiagramType.COMPONENT,
        "DEPLOYMENT": GeneratorDiagramType.DEPLOYMENT,
        "USE_CASE": GeneratorDiagramType.USE_CASE,
        "USECASE": GeneratorDiagramType.USE_CASE,
        "ENTITY_RELATIONSHIP": GeneratorDiagramType.ENTITY_RELATIONSHIP,
        "ER": GeneratorDiagramType.ENTITY_RELATIONSHIP
      };
      
      const finalType = diagramTypeMap[detectedType] || GeneratorDiagramType.SEQUENCE;
      
      logger.info("Diagram type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting diagram type:", error);
      // Default to SEQUENCE if detection fails
      return GeneratorDiagramType.SEQUENCE;
    }
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