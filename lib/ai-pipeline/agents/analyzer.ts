import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
import { UnifiedOutputParser, UnifiedParserFactory } from "../parsers/UnifiedOutputParser";
import { DiagramType as GuidelinesType, readGuidelines } from "../../knowledge/guidelines";
import { getPrompt, substituteVariables, logPromptUsage } from "../../prompts/loader";
import { AgentType, PromptOperation } from "../../database/types";
import { DiagramType, AnalysisType } from "../schemas/MasterClassificationSchema";
import { createEnhancedLogger, withTiming } from "../../utils/consola-logger";

// Setup enhanced logger
const logger = createEnhancedLogger('analyzer');

/**
 * Schema defining the structure of the diagram analysis output
 */
const analysisOutputSchema = z.object({
  diagramType: z.nativeEnum(DiagramType),
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
 * Schema for analyzer input parameters - both types now required from MasterClassifier
 */
const analyzerParamsSchema = z.object({
  userInput: z.string().min(1),
  diagram: z.string().min(10),
  analysisType: z.nativeEnum(AnalysisType), // Now required from MasterClassifier
  diagramType: z.nativeEnum(DiagramType), // Now required from MasterClassifier
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for analyzer parameters
 */
export type AnalyzerParams = z.infer<typeof analyzerParamsSchema>;

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
 * Specialized agent for analyzing PlantUML diagrams
 */
export class DiagramAnalyzer {
  private parser: UnifiedOutputParser<AnalysisResult>;

  constructor() {
    // Create default fallback for analysis
    const defaultFallback: AnalysisResult = {
      diagramType: DiagramType.UNKNOWN,
      analysisType: AnalysisType.GENERAL,
      overview: "I encountered an error while analyzing the diagram. Please try again with a clearer request."
    };

    // Use UnifiedOutputParser with analysis-specific configuration
    this.parser = UnifiedParserFactory.createAnalysisParser(analysisOutputSchema, defaultFallback);
  }

  /**
   * Analyze a PlantUML diagram based on user requirements
   * @param params - Parameters for analysis (both types now required from MasterClassifier)
   * @returns A promise resolving to the analysis result
   */
  public async analyze(params: AnalyzerParams): Promise<AnalysisResult> {
    try {
      // Validate input params
      const validatedParams = analyzerParamsSchema.parse(params);
      const { userInput, diagram, analysisType, diagramType } = validatedParams;
      
      logger.stageStart(`diagram analysis (${analysisType} on ${diagramType})`);
      logger.debug(`🔍 Analysis request received`);
      
      // Fetch relevant guidelines
      const guidelinesText = await this.fetchGuidelines(diagramType);
      
      // Get the analysis prompt template and variables
      const promptData = await this.getAnalysisPromptTemplate(
        userInput,
        diagram,
        analysisType,
        diagramType,
        guidelinesText
      );
      
      // Create and execute the analysis chain with timing
      const analysisChain = RunnableSequence.from([
        PromptTemplate.fromTemplate(promptData.template),
        model,
        this.parser
      ]);
      
      const result = await withTiming(
        logger,
        "LLM analysis",
        () => analysisChain.invoke(promptData.variables)
      );
      
      // Calculate insights count and performance metrics
      const findingsCount = (result.components?.length || 0) + 
                          (result.relationships?.length || 0) +
                          (result.suggestedImprovements?.length || 0);
      
      const startTime = Date.now();
      logger.analysis(result.analysisType, result.diagramType, findingsCount, Date.now() - startTime);
      
      return result;
    } catch (error) {
      return this.handleAnalysisError(error);
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
   * Get the analysis prompt template and variables
   * @private
   */
  private async getAnalysisPromptTemplate(
    userInput: string,
    diagram: string,
    analysisType: AnalysisType,
    diagramType: DiagramType,
    guidelinesText: string
  ): Promise<{ template: string; variables: Record<string, string> }> {
    const variables = {
      baseSystemPrompt,
      diagram,
      userInput,
      analysisType: analysisType.toString(),
      diagramType: diagramType.toString(),
      guidelines: guidelinesText,
      formatInstructions: this.parser.getFormatInstructions()
    };

    try {
      const startTime = Date.now();
      const promptData = await getPrompt(AgentType.ANALYZER, PromptOperation.ANALYSIS);
      
      const duration = Date.now() - startTime;
      logPromptUsage(AgentType.ANALYZER, PromptOperation.ANALYSIS, promptData.source, duration);
      
      return {
        template: promptData.template,
        variables
      };
    } catch (promptError) {
      logger.warn("Failed to load dynamic prompt, using fallback", { error: promptError });
      
      // Fallback template with proper variable placeholders
      const fallbackTemplate = `{baseSystemPrompt}

You are a specialist in analyzing PlantUML diagrams.

Diagram to analyze:
\`\`\`plantuml
{diagram}
\`\`\`

User analysis request: {userInput}

Analysis type: {analysisType}
Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Analyze the diagram based on the analysis type and user request.
Provide detailed and insightful analysis.

{formatInstructions}`;

      return {
        template: fallbackTemplate,
        variables
      };
    }
  }

  /**
   * Handle analysis errors with meaningful fallbacks
   * @private
   */
  private handleAnalysisError(error: unknown): AnalysisResult {
    if (error instanceof z.ZodError) {
      logger.error("Input validation error:", { errors: error.errors });
      return {
        diagramType: DiagramType.UNKNOWN,
        analysisType: AnalysisType.GENERAL,
        overview: `I couldn't analyze the diagram due to invalid parameters: ${error.message}. Please try again with a different request.`
      };
    }

    if (error instanceof Error) {
      logger.error("Error analyzing diagram:", { 
        message: error.message, 
        stack: error.stack
      });
      
      return {
        diagramType: DiagramType.UNKNOWN,
        analysisType: AnalysisType.GENERAL,
        overview: `I encountered an error while analyzing the diagram: ${error.message}. Please try again with a clearer request.`
      };
    }

    logger.error("Unknown error during diagram analysis:", { error });
    return {
      diagramType: DiagramType.UNKNOWN,
      analysisType: AnalysisType.GENERAL,
      overview: "I encountered an unexpected error while analyzing the diagram. Please try again with a different request."
    };
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