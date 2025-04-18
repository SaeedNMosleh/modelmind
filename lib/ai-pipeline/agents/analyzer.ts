import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
// Import the real DiagramType from the guidelines module
import { DiagramType as GuidelinesType, readGuidelines } from "../../knowledge/guidelines";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

// Define our analyzer's DiagramType enum (use a different name to avoid conflicts)
export enum AnalyzerDiagramType {
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
 * Enum defining types of analysis that can be performed
 */
export enum AnalysisType {
  GENERAL = "general",
  QUALITY = "quality",
  COMPONENTS = "components",
  RELATIONSHIPS = "relationships",
  COMPLEXITY = "complexity",
  IMPROVEMENTS = "improvements"
}

/**
 * Schema defining the structure of the diagram analysis output
 */
const analysisOutputSchema = z.object({
  diagramType: z.nativeEnum(AnalyzerDiagramType),
  analysisType: z.nativeEnum(AnalysisType),
  overview: z.string(),
  components: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  relationships: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  qualityAssessment: z.object({
    score: z.number().min(1).max(10).optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    bestPracticesFollowed: z.array(z.string()).optional(),
    bestPracticesViolated: z.array(z.string()).optional()
  }).optional(),
  suggestedImprovements: z.array(z.string()).optional()
});

/**
 * Type definition for the analyzer result
 */
export type AnalysisResult = z.infer<typeof analysisOutputSchema>;

/**
 * Schema for analyzer input parameters
 */
const analyzerParamsSchema = z.object({
  userInput: z.string().min(1),
  diagram: z.string().min(10),
  analysisType: z.nativeEnum(AnalysisType).optional(),
  diagramType: z.nativeEnum(AnalyzerDiagramType).optional(),
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for analyzer parameters
 */
export type AnalyzerParams = z.infer<typeof analyzerParamsSchema>;

/**
 * Helper function to map our analyzer diagram type to the guidelines diagram type
 */
function mapToGuidelinesType(type: AnalyzerDiagramType): GuidelinesType {
  switch(type) {
    case AnalyzerDiagramType.SEQUENCE: 
      return 'sequence' as GuidelinesType;
    case AnalyzerDiagramType.CLASS: 
      return 'class' as GuidelinesType;
    case AnalyzerDiagramType.ACTIVITY: 
      return 'activity' as GuidelinesType;
    case AnalyzerDiagramType.STATE: 
      return 'state' as GuidelinesType;
    case AnalyzerDiagramType.COMPONENT: 
      return 'component' as GuidelinesType;
    case AnalyzerDiagramType.USE_CASE: 
      return 'use-case' as GuidelinesType;
    case AnalyzerDiagramType.ENTITY_RELATIONSHIP: 
      return 'entity_relationship' as GuidelinesType;
    default:
      return 'sequence' as GuidelinesType; // Default fallback
  }
}

/**
 * Specialized agent for analyzing PlantUML diagrams
 */
export class DiagramAnalyzer {
  private parser;

  constructor() {
    this.parser = StructuredOutputParser.fromZodSchema(analysisOutputSchema);
  }

  /**
   * Analyze a PlantUML diagram based on user requirements
   * @param params - Parameters for analysis
   * @returns A promise resolving to the analysis result
   */
  public async analyze(params: AnalyzerParams): Promise<AnalysisResult> {
    try {
      // Validate input params
      const validatedParams = analyzerParamsSchema.parse(params);
      
      // Detect diagram type if not provided
      const diagramType = validatedParams.diagramType || 
        await this.detectDiagramType(validatedParams.diagram);
      
      // Determine analysis type from user input if not provided
      const analysisType = validatedParams.analysisType || 
        await this.detectAnalysisType(validatedParams.userInput);
      
      logger.info("Analyzing diagram", { diagramType, analysisType });
      
      // Try a simple analysis approach first
      try {
        // Create a simple analysis prompt
        const simplePrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in analyzing PlantUML diagrams.
          
          Analyze this PlantUML diagram:
          \`\`\`plantuml
          ${validatedParams.diagram}
          \`\`\`
          
          User's analysis request: ${validatedParams.userInput}
          
          Focus on ${analysisType} analysis.
          
          Provide a comprehensive analysis that includes:
          1. An overview of what the diagram shows
          2. Key components and their relationships
          3. Strengths of the diagram
          4. Potential areas for improvement
          
          Analysis:
        `);
        
        // Run the simple analysis
        const simpleAnalysisChain = RunnableSequence.from([
          simplePrompt,
          model,
          new StringOutputParser()
        ]);
        
        const analysis = await simpleAnalysisChain.invoke({});
        
        // Return a properly formatted result
        logger.info("Diagram analysis completed (simple approach)", { 
          diagramType,
          analysisType
        });
        
        return {
          diagramType,
          analysisType,
          overview: analysis,
          qualityAssessment: {
            strengths: [],
            weaknesses: []
          },
          suggestedImprovements: []
        };
        
      } catch (simpleError) {
        // If simple approach fails, log and try structured approach
        logger.warn("Simple diagram analysis failed, trying structured approach", { error: simpleError });
        
        // Fetch relevant guidelines
        let guidelinesText = "No specific guidelines available.";
        try {
          // Convert our enum to the expected type for readGuidelines
          const guidelinesType = mapToGuidelinesType(diagramType);
          
          // Call readGuidelines with the right type
          const guidelines = await readGuidelines(guidelinesType);
          
          // Format guidelines for prompt
          if (guidelines && typeof guidelines === 'string') {
            guidelinesText = guidelines;
          }
        } catch (guidelineError) {
          logger.error("Error fetching guidelines:", guidelineError);
        }
        
        // Create the analysis prompt template
        const analysisPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in analyzing PlantUML diagrams.
          
          Diagram to analyze:
          \`\`\`plantuml
          ${validatedParams.diagram}
          \`\`\`
          
          User analysis request: ${validatedParams.userInput}
          
          Analysis type: ${analysisType}
          Diagram type: ${diagramType}
          
          PlantUML Guidelines:
          ${guidelinesText}
          
          Analyze the diagram based on the analysis type and user request.
          Provide detailed and insightful analysis.
          
          ${this.parser.getFormatInstructions()}
        `);
        
        // Create the analysis chain
        const analysisChain = RunnableSequence.from([
          analysisPrompt,
          model,
          this.parser
        ]);
        
        // Execute the chain
        const result = await analysisChain.invoke({});
        
        // Ensure result has the expected type structure
        const typedResult = result as unknown as AnalysisResult;
        
        logger.info("Diagram analysis completed (structured approach)", { 
          diagramType: typedResult.diagramType,
          analysisType: typedResult.analysisType
        });
        
        return typedResult;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Input validation error:", { errors: error.errors });
        // Return a fallback response with a minimal analysis
        return {
          diagramType: AnalyzerDiagramType.UNKNOWN,
          analysisType: AnalysisType.GENERAL,
          overview: `I couldn't analyze the diagram due to invalid parameters: ${error.message}. Please try again with a different request.`
        };
      } else if (error instanceof Error) {
        logger.error("Error analyzing diagram:", { 
          message: error.message, 
          stack: error.stack
        });
        
        // Return a fallback response with a minimal analysis
        return {
          diagramType: AnalyzerDiagramType.UNKNOWN,
          analysisType: AnalysisType.GENERAL,
          overview: `I encountered an error while analyzing the diagram: ${error.message}. Please try again with a clearer request.`
        };
      } else {
        logger.error("Unknown error during diagram analysis:", { error });
        
        // Return a generic fallback
        return {
          diagramType: AnalyzerDiagramType.UNKNOWN,
          analysisType: AnalysisType.GENERAL,
          overview: "I encountered an unexpected error while analyzing the diagram. Please try again with a different request."
        };
      }
    }
  }

  /**
   * Detect the diagram type from an existing diagram
   * @param diagram - The current diagram
   * @returns Detected diagram type
   * @private
   */
  private async detectDiagramType(diagram: string): Promise<AnalyzerDiagramType> {
    try {
      const detectTypePrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Determine the type of the following PlantUML diagram:
        
        \`\`\`plantuml
        ${diagram}
        \`\`\`
        
        Return ONLY one of these types that best matches the diagram:
        SEQUENCE, CLASS, ACTIVITY, STATE, COMPONENT, DEPLOYMENT, USE_CASE, ENTITY_RELATIONSHIP
      `);
      
      const detectTypeChain = RunnableSequence.from([
        detectTypePrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectTypeChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid DiagramType
      const diagramTypeMap: Record<string, AnalyzerDiagramType> = {
        "SEQUENCE": AnalyzerDiagramType.SEQUENCE,
        "CLASS": AnalyzerDiagramType.CLASS,
        "ACTIVITY": AnalyzerDiagramType.ACTIVITY,
        "STATE": AnalyzerDiagramType.STATE,
        "COMPONENT": AnalyzerDiagramType.COMPONENT,
        "DEPLOYMENT": AnalyzerDiagramType.DEPLOYMENT,
        "USE_CASE": AnalyzerDiagramType.USE_CASE,
        "USECASE": AnalyzerDiagramType.USE_CASE,
        "ENTITY_RELATIONSHIP": AnalyzerDiagramType.ENTITY_RELATIONSHIP,
        "ER": AnalyzerDiagramType.ENTITY_RELATIONSHIP
      };
      
      const finalType = diagramTypeMap[detectedType] || AnalyzerDiagramType.UNKNOWN;
      
      logger.info("Diagram type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting diagram type:", error);
      return AnalyzerDiagramType.UNKNOWN;
    }
  }

  /**
   * Detect the analysis type based on user input
   * @param userInput - The user's input message
   * @returns Detected analysis type
   * @private
   */
  private async detectAnalysisType(userInput: string): Promise<AnalysisType> {
    try {
      const detectAnalysisPrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Determine the most appropriate type of analysis based on the user's request:
        
        User request: ${userInput}
        
        Select the MOST appropriate analysis type from these options:
        - GENERAL: Overall assessment of the diagram
        - QUALITY: Assessment of diagram quality and best practices
        - COMPONENTS: Inventory and explanation of diagram components
        - RELATIONSHIPS: Analysis of relationships between components
        - COMPLEXITY: Assessment of diagram complexity
        - IMPROVEMENTS: Suggestions for improving the diagram
        
        Return ONLY one of these types (just the word).
      `);
      
      const detectAnalysisChain = RunnableSequence.from([
        detectAnalysisPrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectAnalysisChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid AnalysisType
      const analysisTypeMap: Record<string, AnalysisType> = {
        "GENERAL": AnalysisType.GENERAL,
        "QUALITY": AnalysisType.QUALITY,
        "COMPONENTS": AnalysisType.COMPONENTS,
        "RELATIONSHIPS": AnalysisType.RELATIONSHIPS,
        "COMPLEXITY": AnalysisType.COMPLEXITY,
        "IMPROVEMENTS": AnalysisType.IMPROVEMENTS
      };
      
      const finalType = analysisTypeMap[detectedType] || AnalysisType.GENERAL;
      
      logger.info("Analysis type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting analysis type:", error);
      return AnalysisType.GENERAL;
    }
  }

  /**
   * Invoke the analyzer (convenience method for chainable API)
   * @param params - Analyzer parameters
   * @returns Analyzer result
   */
  public async invoke(params: AnalyzerParams): Promise<AnalysisResult> {
    return this.analyze(params);
  }
}

// Export singleton instance
export const diagramAnalyzer = new DiagramAnalyzer();