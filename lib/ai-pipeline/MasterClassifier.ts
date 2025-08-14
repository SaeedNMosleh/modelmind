import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { model } from "./baseChain";
import { BASE_SYSTEM_PROMPT } from "../prompts/embedded";
import { getPrompt, substituteVariables, logPromptUsage } from "../prompts/loader";
import { UnifiedOutputParser } from "./parsers/UnifiedOutputParser";
import {
  masterClassificationSchema,
  MasterClassification,
  DiagramIntent,
  DiagramType,
  AnalysisType,
  ConfidenceLevel,
  getConfidenceLevel,
  createFallbackClassification,
  validateClassification,
  getMasterClassificationInstructions,
  INTENT_FALLBACK_MAPPINGS,
  DIAGRAM_TYPE_FALLBACK_MAPPINGS,
  ANALYSIS_TYPE_FALLBACK_MAPPINGS
} from "./schemas/MasterClassificationSchema";
// import { getPrompt, substituteVariables, logPromptUsage } from "../prompts/loader";
// import { AgentType, PromptOperation } from "../database/types";
import { createEnhancedLogger, withTiming } from "../utils/consola-logger";

// Setup enhanced logger
const logger = createEnhancedLogger('classifier');

/**
 * Input parameters for master classification
 */
const masterClassifierParamsSchema = z.object({
  userInput: z.string().min(1, "User input is required"),
  currentDiagram: z.string().optional(),
  conversation: z.array(z.string()).optional(),
  context: z.record(z.unknown()).optional()
});

export type MasterClassifierParams = z.infer<typeof masterClassifierParamsSchema>;

/**
 * Master Classifier - Consolidates all classification logic into a single LLM call
 * 
 * Replaces the previous inputProcessor.classifyIntent() and eliminates redundant
 * classification calls across the AI pipeline. Performs comprehensive classification
 * including intent, diagram type, analysis type, and confidence scoring.
 */
export class MasterClassifier {
  private parser: UnifiedOutputParser<MasterClassification>;
  private classificationChain: RunnableSequence;

  constructor() {
    // Create unified parser with comprehensive fallback mappings
    this.parser = new UnifiedOutputParser({
      schema: masterClassificationSchema,
      tryJsonFirst: true,
      extractPatterns: {
        intent: /\b(GENERATE|CREATE|BUILD|MAKE|NEW|MODIFY|CHANGE|UPDATE|EDIT|ADD|REMOVE|DELETE|ANALYZE|EXPLAIN|DESCRIBE|REVIEW|CHECK)\b/i,
        diagramType: /\b(SEQUENCE|CLASS|ACTIVITY|STATE|COMPONENT|DEPLOYMENT|USE_CASE|ENTITY_RELATIONSHIP|INTERACTION|FLOW|TIMELINE|OBJECT|UML|STRUCTURE|PROCESS|WORKFLOW|MACHINE|TRANSITION|MODULE|SYSTEM|ARCHITECTURE|INFRASTRUCTURE|PHYSICAL|USER|ACTOR|ER|DATABASE|DATA)\b/i,
        analysisType: /\b(GENERAL|OVERALL|SUMMARY|QUALITY|BEST_PRACTICES|STANDARDS|COMPONENTS|ELEMENTS|PARTS|RELATIONSHIPS|CONNECTIONS|LINKS|COMPLEXITY|COMPLEX|IMPROVEMENTS|SUGGESTIONS|RECOMMENDATIONS|OPTIMIZE)\b/i,
        confidence: /confidence[:\s]*([0-9]*\.?[0-9]+)/i
      },
      fallbackMappings: this.createComprehensiveFallbackMappings(),
      defaultFallback: createFallbackClassification("Could not classify user input", false)
    });

    // Initialize classification chain (will be built dynamically)
    this.classificationChain = this.buildClassificationChain();
  }

  /**
   * Classify user input comprehensively in a single LLM call
   * @param params - Classification parameters
   * @returns Complete classification including intent, types, and confidence
   */
  public async classify(params: MasterClassifierParams): Promise<MasterClassification> {
    try {
      // Validate input parameters
      const validatedParams = masterClassifierParamsSchema.parse(params);

      logger.requestStart(!!validatedParams.currentDiagram || !!validatedParams.context);
      logger.debug(`📊 Context details: diagram=${!!validatedParams.currentDiagram}, hasContext=${!!validatedParams.context}`);

      // Prepare context for classification
      const classificationContext = this.prepareClassificationContext(validatedParams);

      // Execute the comprehensive classification with timing
      const result = await withTiming(
        logger,
        "Master classification",
        () => this.classificationChain.invoke(classificationContext)
      );

      // Validate and enhance the result
      const validatedResult = this.validateAndEnhanceResult(result, validatedParams);

      // Log classification results with duration calculation
      const duration = Date.now() - Date.now(); // This will be updated with proper timing
      logger.classification(
        validatedResult.intent, 
        validatedResult.confidence,
        'diagramType' in validatedResult ? validatedResult.diagramType : undefined,
        duration
      );
      
      if ('analysisType' in validatedResult) {
        logger.debug(`🔍 Analysis type: ${validatedResult.analysisType}`);
      }

      return validatedResult;

    } catch (error) {
      return this.handleClassificationError(error, params);
    }
  }

  /**
   * Build the classification chain with dynamic prompt loading
   */
  private buildClassificationChain(): RunnableSequence {
    return RunnableSequence.from([
      // Dynamic prompt creation will happen at runtime in classify()
      async (input: Record<string, string>) => {
        const promptData = await this.getClassificationPrompt();
        const populatedPrompt = substituteVariables(promptData.template, {
          baseSystemPrompt: BASE_SYSTEM_PROMPT,
          userInput: input.userInput || '',
          currentDiagram: input.currentDiagram || 'No diagram currently exists',
          conversationHistory: input.conversationHistory || 'No previous conversation',
          formatInstructions: getMasterClassificationInstructions()
        });
        
        return populatedPrompt;
      },
      model,
      this.parser
    ]);
  }

  /**
   * Get classification prompt using the centralized prompt loader
   */
  private async getClassificationPrompt(): Promise<{ template: string; variables: string[] }> {
    try {
      const startTime = Date.now();
      const promptData = await getPrompt('master-classifier', 'comprehensive-classification');
      
      const duration = Date.now() - startTime;
      logPromptUsage('master-classifier', 'comprehensive-classification', promptData.source, duration);
      
      return {
        template: promptData.template,
        variables: promptData.variables
      };
    } catch (promptError) {
      logger.error("Failed to load classification prompt", { error: promptError });
      throw new Error(`MasterClassifier prompt loading failed: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare context for classification
   */
  private prepareClassificationContext(params: MasterClassifierParams): Record<string, string> {
    const { userInput, currentDiagram = "", conversation = [] } = params;

    return {
      userInput,
      currentDiagram: currentDiagram || "No diagram exists currently in editor",
      conversationHistory: conversation.length > 0 
        ? `Previous messages:\n${conversation.join('\n')}` 
        : "No previous conversation",
      formatInstructions: getMasterClassificationInstructions()
    };
  }

  /**
   * Validate and enhance classification result
   */
  private validateAndEnhanceResult(
    result: MasterClassification, 
    originalParams: MasterClassifierParams
  ): MasterClassification {
    try {
      // Validate the result using the schema
      const validated = validateClassification(result);

      // Enhance with additional context
      const enhanced = {
        ...validated,
        hasDiagramContext: !!originalParams.currentDiagram,
        cleanedInstruction: validated.cleanedInstruction || originalParams.userInput.trim(),
        confidenceLevel: getConfidenceLevel(validated.confidence)
      };

      // Additional validation and enhancement based on intent
      return this.enhanceByIntent(enhanced, originalParams);

    } catch (error) {
      logger.warn(`⚠️ Result validation failed, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return createFallbackClassification(originalParams.userInput, !!originalParams.currentDiagram);
    }
  }

  /**
   * Enhance classification based on specific intent requirements
   */
  private enhanceByIntent(
    classification: MasterClassification,
    originalParams: MasterClassifierParams
  ): MasterClassification {
    switch (classification.intent) {
      case DiagramIntent.GENERATE:
        // Ensure generate classification has diagram type
        if ('diagramType' in classification && classification.diagramType === DiagramType.UNKNOWN) {
          // Try to infer diagram type from input
          const inferredType = this.inferDiagramTypeFromInput(originalParams.userInput);
          return { ...classification, diagramType: inferredType };
        }
        break;

      case DiagramIntent.MODIFY:
        // Ensure modify classification has modification requests
        if ('modificationRequests' in classification && (!classification.modificationRequests || classification.modificationRequests.length === 0)) {
          return {
            ...classification,
            modificationRequests: [originalParams.userInput.trim()]
          };
        }
        break;

      case DiagramIntent.ANALYZE:
        // Ensure analyze classification has analysis type
        if ('analysisType' in classification && !classification.analysisType) {
          const inferredAnalysisType = this.inferAnalysisTypeFromInput(originalParams.userInput);
          return { ...classification, analysisType: inferredAnalysisType };
        }
        break;
    }

    return classification;
  }

  /**
   * Infer diagram type from user input using pattern matching
   */
  private inferDiagramTypeFromInput(userInput: string): DiagramType {
    const upperInput = userInput.toUpperCase();

    for (const [pattern, type] of Object.entries(DIAGRAM_TYPE_FALLBACK_MAPPINGS)) {
      if (upperInput.includes(pattern)) {
        return type;
      }
    }

    // Default inference based on common patterns
    if (upperInput.includes('FLOW') || upperInput.includes('INTERACTION') || upperInput.includes('CALL')) {
      return DiagramType.SEQUENCE;
    }
    if (upperInput.includes('PROCESS') || upperInput.includes('WORKFLOW') || upperInput.includes('STEP')) {
      return DiagramType.ACTIVITY;
    }
    if (upperInput.includes('STRUCTURE') || upperInput.includes('OBJECT') || upperInput.includes('RELATIONSHIP')) {
      return DiagramType.CLASS;
    }

    return DiagramType.SEQUENCE; // Most common default
  }

  /**
   * Infer analysis type from user input using pattern matching
   */
  private inferAnalysisTypeFromInput(userInput: string): AnalysisType {
    const upperInput = userInput.toUpperCase();

    for (const [pattern, type] of Object.entries(ANALYSIS_TYPE_FALLBACK_MAPPINGS)) {
      if (upperInput.includes(pattern)) {
        return type;
      }
    }

    // Default inference based on common patterns
    if (upperInput.includes('IMPROVE') || upperInput.includes('BETTER') || upperInput.includes('SUGGEST')) {
      return AnalysisType.IMPROVEMENTS;
    }
    if (upperInput.includes('QUALITY') || upperInput.includes('BEST') || upperInput.includes('PRACTICE')) {
      return AnalysisType.QUALITY;
    }
    if (upperInput.includes('COMPLEX') || upperInput.includes('DIFFICULT')) {
      return AnalysisType.COMPLEXITY;
    }

    return AnalysisType.GENERAL; // Most common default
  }

  /**
   * Create comprehensive fallback mappings for string parsing
   */
  private createComprehensiveFallbackMappings(): Record<string, Partial<MasterClassification>> {
    const mappings: Record<string, Partial<MasterClassification>> = {};

    // Add intent-based mappings
    for (const [pattern, partial] of Object.entries(INTENT_FALLBACK_MAPPINGS)) {
      mappings[pattern] = {
        ...partial,
        reasoning: `Detected ${partial.intent} intent from pattern: ${pattern}`,
        cleanedInstruction: `User wants to ${partial.intent?.toLowerCase()} a diagram`
      };
    }

    // Add diagram type combinations
    for (const [typePattern, diagramType] of Object.entries(DIAGRAM_TYPE_FALLBACK_MAPPINGS)) {
      mappings[`GENERATE_${typePattern}`] = {
        intent: DiagramIntent.GENERATE,
        confidence: 0.8,
        confidenceLevel: ConfidenceLevel.HIGH,
        diagramType,
        reasoning: `Generate ${diagramType} diagram based on pattern: ${typePattern}`
      };
    }

    return mappings;
  }

  /**
   * Handle classification errors with meaningful fallbacks
   */
  private handleClassificationError(error: unknown, params: MasterClassifierParams): MasterClassification {
    if (error instanceof z.ZodError) {
      logger.failure("Input validation", error, { userInput: params.userInput });

      return {
        ...createFallbackClassification(params.userInput, !!params.currentDiagram),
        reasoning: `Input validation failed: ${error.errors.map(e => e.message).join(', ')}`
      };
    }

    if (error instanceof Error) {
      logger.failure("Classification", error, { userInput: params.userInput });

      return {
        ...createFallbackClassification(params.userInput, !!params.currentDiagram),
        reasoning: `Classification failed due to error: ${error.message}`
      };
    }

    logger.error(`💥 Unknown classification error for: "${params.userInput.slice(0, 50)}..."`, error);

    return {
      ...createFallbackClassification(params.userInput, !!params.currentDiagram),
      reasoning: "Unknown error occurred during classification"
    };
  }

  /**
   * Get format instructions for this classifier
   */
  public getFormatInstructions(): string {
    return this.parser.getFormatInstructions();
  }

  /**
   * Convenience method for backward compatibility with inputProcessor interface
   */
  public async classifyIntent(params: {
    userInput: string;
    currentDiagram?: string;
    conversation?: string[];
  }): Promise<MasterClassification> {
    return this.classify({
      userInput: params.userInput,
      currentDiagram: params.currentDiagram,
      conversation: params.conversation
    });
  }
}

// Export singleton instance for easy imports
export const masterClassifier = new MasterClassifier();

// Export types for external use
// Removed duplicate export to resolve conflict
export type {
  MasterClassification,
  DiagramIntent,
  DiagramType,
  AnalysisType,
  ConfidenceLevel
} from "./schemas/MasterClassificationSchema";