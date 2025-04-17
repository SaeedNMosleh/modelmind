import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
import { DiagramType, readGuidelines } from "../../knowledge/guidelines";
import { getTemplatesForType } from "../../knowledge/templates";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

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
 * Schema for generator input parameters
 */
const generatorParamsSchema = z.object({
  userInput: z.string().min(1),
  diagramType: z.nativeEnum(DiagramType).optional(),
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for generator parameters
 */
export type GeneratorParams = z.infer<typeof generatorParamsSchema>;

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
      
      // Try a simpler generation approach first for robustness
      try {
        // Create a simple generation prompt
        const simplePrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in creating PlantUML diagrams based on user requirements.
          
          User requirements: ${validatedParams.userInput}
          
          Diagram type: ${diagramType}
          
          Create a PlantUML diagram that satisfies these requirements.
          The diagram should start with @startuml and end with @enduml.
          Focus on proper syntax and clarity.
          
          PlantUML Diagram:
        `);
        
        // Run the simple generation
        const simpleGenerationChain = RunnableSequence.from([
          simplePrompt,
          model,
          new StringOutputParser()
        ]);
        
        const simpleResult = await simpleGenerationChain.invoke({});
        
        // Extract the diagram from the result (it might have extra text)
        const diagramMatch = simpleResult.match(/@startuml[\s\S]*?@enduml/);
        const diagram = diagramMatch ? diagramMatch[0] : simpleResult;
        
        // Create a simple explanation
        const explainPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You've just created this PlantUML diagram based on these requirements:
          Requirements: ${validatedParams.userInput}
          
          Diagram:
          ${diagram}
          
          Provide a short explanation of the diagram you created (about 2-3 sentences).
        `);
        
        const explainChain = RunnableSequence.from([
          explainPrompt,
          model,
          new StringOutputParser()
        ]);
        
        const explanation = await explainChain.invoke({});
        
        // Return a properly formatted result
        logger.info("Diagram generation completed (simple approach)", { 
          diagramType,
          diagramLength: diagram.length
        });
        
        return {
          diagram,
          diagramType,
          explanation,
          suggestions: []
        };
        
      } catch (simpleError) {
        // If simple approach fails, log and try advanced approach
        logger.warn("Simple diagram generation failed, trying full approach", { error: simpleError });
        
        // Fetch relevant guidelines and templates
        let guidelines, templates;
        try {
          [guidelines, templates] = await Promise.all([
            readGuidelines(diagramType, { fullContent: true }).catch(() => null),
            getTemplatesForType(diagramType).catch(() => [])
          ]);
        } catch (resourceError) {
          logger.error("Error fetching guidelines or templates:", resourceError);
          guidelines = null;
          templates = [];
        }
        
        // Format guidelines for prompt
        let guidelinesText = "No specific guidelines available.";
        if (guidelines) {
          if (Array.isArray(guidelines)) {
            guidelinesText = guidelines.map(g => `${g.title}:\n${g.content}`).join('\n\n');
          } else if (guidelines.sections) {
            guidelinesText = guidelines.sections.map(g => `${g.title}:\n${g.content}`).join('\n\n');
          }
        }
        
        // Format templates for prompt (and include in prompt if available)
        let templatesSection = "";
        if (templates.length > 0) {
          const templatesText = templates.map(t => `${t.metadata?.name}:\n${t.content}`).join('\n\n');
          templatesSection = `\nAvailable Templates:\n${templatesText}`;
        }
        
        // Create the generation prompt template
        const generationPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in creating PlantUML diagrams based on user requirements.
          
          User requirements: ${validatedParams.userInput}
          
          Diagram type: ${diagramType}
          
          PlantUML Guidelines:
          ${guidelinesText}
          ${templatesSection}
          
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
        
        logger.info("Diagram generation completed (advanced approach)", { 
          diagramType: typedResult.diagramType,
          diagramLength: typedResult.diagram.length
        });
        
        return typedResult;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Input validation error:", { errors: error.errors });
        // Return a fallback response with an error diagram
        return {
          diagram: `@startuml\ntitle Error: Invalid Generation Parameters\nnote "Error: ${error.message}" as Error\n@enduml`,
          diagramType: DiagramType.UNKNOWN,
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
          diagramType: DiagramType.UNKNOWN,
          explanation: `I encountered an error while generating the diagram: ${error.message}. Please try again or provide more details.`
        };
      } else {
        logger.error("Unknown error during diagram generation:", { error });
        
        // Return a generic fallback response
        return {
          diagram: `@startuml\ntitle Error in Diagram Generation\nnote "An unknown error occurred" as Error\n@enduml`,
          diagramType: DiagramType.UNKNOWN,
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
  private async detectDiagramType(userInput: string): Promise<DiagramType> {
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
      const diagramTypeMap: Record<string, DiagramType> = {
        "SEQUENCE": DiagramType.SEQUENCE,
        "CLASS": DiagramType.CLASS,
        "ACTIVITY": DiagramType.ACTIVITY,
        "STATE": DiagramType.STATE,
        "COMPONENT": DiagramType.COMPONENT,
        "DEPLOYMENT": DiagramType.DEPLOYMENT,
        "USE_CASE": DiagramType.USE_CASE,
        "USECASE": DiagramType.USE_CASE,
        "ENTITY_RELATIONSHIP": DiagramType.ENTITY_RELATIONSHIP,
        "ER": DiagramType.ENTITY_RELATIONSHIP
      };
      
      const finalType = diagramTypeMap[detectedType] || DiagramType.SEQUENCE;
      
      logger.info("Diagram type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting diagram type:", error);
      // Default to SEQUENCE if detection fails
      return DiagramType.SEQUENCE;
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