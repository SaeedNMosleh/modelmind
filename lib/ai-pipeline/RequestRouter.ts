import { z } from "zod";
import { masterClassifier, MasterClassifierParams } from "./MasterClassifier";
import {
  MasterClassification,
  DiagramIntent,
  isGenerateClassification,
  isModifyClassification,
  isAnalyzeClassification,
  isUnknownClassification,
  ConfidenceLevel
} from "./schemas/MasterClassificationSchema";
import { diagramGenerator, GeneratorParams, GenerationResult } from "./agents/generator";
import { diagramModifier, ModifierParams, ModificationResult } from "./agents/modifier";
import { diagramAnalyzer, AnalyzerParams, AnalysisResult } from "./agents/analyzer";
import { contextManager } from "./contextManager";
import { createEnhancedLogger, withTiming } from "../utils/consola-logger";

// Setup enhanced logger
const logger = createEnhancedLogger('pipeline');

/**
 * Schema for request router input parameters
 */
const requestRouterParamsSchema = z.object({
  userInput: z.string().min(1, "User input is required"),
  currentDiagram: z.string().optional(),
  conversation: z.array(z.string()).optional(),
  context: z.record(z.unknown()).optional()
});

export type RequestRouterParams = z.infer<typeof requestRouterParamsSchema>;

/**
 * Union type for all possible agent results
 */
export type AgentResult = GenerationResult | ModificationResult | AnalysisResult;

/**
 * Standardized response format for the request router
 */
export interface RouterResponse {
  success: boolean;
  intent: DiagramIntent;
  classification: MasterClassification;
  result?: AgentResult;
  error?: {
    type: 'validation' | 'classification' | 'routing' | 'agent' | 'unknown';
    message: string;
    details?: unknown;
  };
}

/**
 * Request Router - Single entry point for the AI pipeline
 * 
 * Eliminates taskRouter.ts by using MasterClassifier results directly
 * for routing without additional LLM calls. Provides clean routing
 * based on comprehensive classification results.
 */
export class RequestRouter {
  /**
   * Process a diagram request using comprehensive classification and routing
   * @param params - Request parameters
   * @returns Standardized router response
   */
  public async processRequest(params: RequestRouterParams): Promise<RouterResponse> {
    try {
      // Validate input parameters
      const validatedParams = requestRouterParamsSchema.parse(params);
      
      logger.requestStart(!!validatedParams.currentDiagram || !!validatedParams.context);
      logger.debug(`📋 Processing request with pipeline architecture`);

      // Step 1: Comprehensive classification using MasterClassifier (single LLM call)
      const classification = await this.classifyRequest(validatedParams);
      
      logger.debug(`✅ Request classified | Intent: ${classification.intent} | Confidence: ${(classification.confidence * 100).toFixed(1)}%`);

      // Step 2: Validate classification requirements
      const validationResult = this.validateClassification(classification, validatedParams);
      if (!validationResult.isValid) {
        return this.createErrorResponse(
          classification,
          'validation',
          validationResult.message ?? 'Validation failed.'
        );
      }

      // Step 3: Route to appropriate agent based on classification
      const agentResult = await this.routeToAgent(classification, validatedParams);

      // Step 4: Update context manager
      this.updateContext(classification);

      // Step 5: Return successful response
      return {
        success: true,
        intent: classification.intent,
        classification,
        result: agentResult
      };

    } catch (error) {
      return this.handleRouterError(error, params);
    }
  }

  /**
   * Classify the request using MasterClassifier (single LLM call)
   * @private
   */
  private async classifyRequest(params: RequestRouterParams): Promise<MasterClassification> {
    try {
      const classifierParams: MasterClassifierParams = {
        userInput: params.userInput,
        currentDiagram: params.currentDiagram,
        conversation: params.conversation,
        context: params.context
      };

      return await masterClassifier.classify(classifierParams);
    } catch (error) {
      logger.error("Classification failed", { error });
      throw new Error(`Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate classification results against requirements
   * @private
   */
  private validateClassification(
    classification: MasterClassification,
    params: RequestRouterParams
  ): { isValid: boolean; message?: string } {
    // Check for MODIFY intent without current diagram
    if (isModifyClassification(classification) && !params.currentDiagram) {
      return {
        isValid: false,
        message: "Cannot modify diagram: No current diagram provided. Please provide a diagram to modify."
      };
    }

    // Check for ANALYZE intent without current diagram
    if (isAnalyzeClassification(classification) && !params.currentDiagram) {
      return {
        isValid: false,
        message: "Cannot analyze diagram: No current diagram provided. Please provide a diagram to analyze."
      };
    }

    // Check for very low confidence classifications
    if (classification.confidence < 0.3) {
      return {
        isValid: false,
        message: `I'm not confident about understanding your request (confidence: ${Math.round(classification.confidence * 100)}%). Could you please rephrase or provide more details?`
      };
    }

    return { isValid: true };
  }

  /**
   * Route request to appropriate agent based on classification
   * @private
   */
  private async routeToAgent(
    classification: MasterClassification,
    params: RequestRouterParams
  ): Promise<AgentResult> {
    try {
      if (isGenerateClassification(classification)) {
        return await this.routeToGenerator(classification, params);
      }

      if (isModifyClassification(classification)) {
        return await this.routeToModifier(classification, params);
      }

      if (isAnalyzeClassification(classification)) {
        return await this.routeToAnalyzer(classification, params);
      }

      if (isUnknownClassification(classification)) {
        throw new Error(this.createUnknownIntentMessage(classification));
      }

      // This should never happen due to discriminated union, but adding for safety
      throw new Error('Unsupported intent');

    } catch (error) {
      logger.error("Agent routing failed", { 
        intent: classification.intent,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Route to diagram generator
   * @private
   */
  private async routeToGenerator(
    classification: Extract<MasterClassification, { intent: DiagramIntent.GENERATE }>,
    params: RequestRouterParams
  ): Promise<GenerationResult> {
    const generatorParams: GeneratorParams = {
      userInput: classification.cleanedInstruction,
      diagramType: classification.diagramType,
      context: {
        ...params.context,
        generationRequirements: classification.generationRequirements,
        suggestedTemplates: classification.suggestedTemplates,
        domain: classification.domain
      }
    };

    logger.debug(`🎨 Routing to generator | Type: ${classification.diagramType}`);

    return await diagramGenerator.generate(generatorParams);
  }

  /**
   * Route to diagram modifier
   * @private
   */
  private async routeToModifier(
    classification: Extract<MasterClassification, { intent: DiagramIntent.MODIFY }>,
    params: RequestRouterParams
  ): Promise<ModificationResult> {
    if (!params.currentDiagram) {
      throw new Error("Current diagram is required for modification but was not provided");
    }

    const modifierParams: ModifierParams = {
      userInput: classification.cleanedInstruction,
      currentDiagram: params.currentDiagram,
      diagramType: classification.diagramType,
      context: {
        ...params.context,
        modificationRequests: classification.modificationRequests,
        targetElements: classification.targetElements,
        modificationScope: classification.modificationScope
      }
    };

    logger.debug(`🔧 Routing to modifier | Type: ${classification.diagramType}`);

    return await diagramModifier.modify(modifierParams);
  }

  /**
   * Route to diagram analyzer
   * @private
   */
  private async routeToAnalyzer(
    classification: Extract<MasterClassification, { intent: DiagramIntent.ANALYZE }>,
    params: RequestRouterParams
  ): Promise<AnalysisResult> {
    if (!params.currentDiagram) {
      throw new Error("Current diagram is required for analysis but was not provided");
    }

    const analyzerParams: AnalyzerParams = {
      userInput: classification.cleanedInstruction,
      diagram: params.currentDiagram,
      analysisType: classification.analysisType,
      diagramType: classification.diagramType,
      context: {
        ...params.context,
        analysisAspects: classification.analysisAspects,
        outputFormat: classification.outputFormat
      }
    };

    logger.debug(`🔍 Routing to analyzer | Type: ${classification.diagramType} | Analysis: ${classification.analysisType}`);

    return await diagramAnalyzer.analyze(analyzerParams);
  }

  /**
   * Update context manager with classification results
   * @private
   */
  private updateContext(classification: MasterClassification): void {
    try {
      contextManager.setLastIntent(classification.intent);
      
      if ('diagramType' in classification) {
        contextManager.setLastDiagramType(classification.diagramType);
      }
      
      if ('analysisType' in classification) {
        contextManager.setLastAnalysisType(classification.analysisType);
      }
    } catch (error) {
      logger.warn("Failed to update context", { error });
      // Non-critical error, don't throw
    }
  }

  /**
   * Create message for unknown intent
   * @private
   */
  private createUnknownIntentMessage(classification: MasterClassification): string {
    const suggestions = [
      "Try asking me to 'create a sequence diagram for...'",
      "Say 'modify the diagram to add...'", 
      "Ask me to 'analyze this diagram for...'",
      "Be more specific about what you want to do with the diagram"
    ];

    return `I'm not sure what you want me to do with the diagram. ${classification.reasoning || ''}\n\nHere are some things you can try:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
  }

  /**
   * Create standardized error response
   * @private
   */
  private createErrorResponse(
    classification: MasterClassification,
    errorType: 'validation' | 'classification' | 'routing' | 'agent' | 'unknown',
    message: string,
    details?: unknown
  ): RouterResponse {
    return {
      success: false,
      intent: classification.intent,
      classification,
      error: {
        type: errorType,
        message,
        details
      }
    };
  }

  /**
   * Handle router-level errors
   * @private
   */
  private handleRouterError(error: unknown, params: RequestRouterParams): RouterResponse {
    // Create fallback classification for error response
    const fallbackClassification: MasterClassification = {
      intent: DiagramIntent.UNKNOWN,
      confidence: 0.0,
      confidenceLevel: ConfidenceLevel.VERY_LOW,
      reasoning: "Error occurred during request processing",
      cleanedInstruction: params.userInput.trim(),
      hasDiagramContext: !!params.currentDiagram
    };

    if (error instanceof z.ZodError) {
      logger.error("Input validation error", { errors: error.errors });
      return this.createErrorResponse(
        fallbackClassification,
        'validation',
        `Invalid input parameters: ${error.errors.map(e => e.message).join(', ')}`,
        error.errors
      );
    }

    if (error instanceof Error) {
      logger.error("Router error", { 
        message: error.message,
        stack: error.stack,
        userInput: params.userInput
      });

      // Determine error type based on error message
      let errorType: 'validation' | 'classification' | 'routing' | 'agent' | 'unknown' = 'unknown';
      if (error.message.includes('Classification failed')) {
        errorType = 'classification';
      } else if (error.message.includes('Current diagram is required')) {
        errorType = 'validation';
      } else if (error.message.includes('routing') || error.message.includes('agent')) {
        errorType = 'routing';
      }

      return this.createErrorResponse(
        fallbackClassification,
        errorType,
        error.message,
        { stack: error.stack }
      );
    }

    logger.error("Unknown router error", { error, userInput: params.userInput });
    return this.createErrorResponse(
      fallbackClassification,
      'unknown',
      "An unexpected error occurred while processing your request. Please try again."
    );
  }

  /**
   * Get router health status (for monitoring)
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      masterClassifier: 'up' | 'down';
      generator: 'up' | 'down';
      modifier: 'up' | 'down';
      analyzer: 'up' | 'down';
    };
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    
    try {
      // Simple health checks for each component
      const components = {
        masterClassifier: 'up' as const,
        generator: 'up' as const,
        modifier: 'up' as const,
        analyzer: 'up' as const
      };

      // Could add actual health checks here if needed
      // For now, assume all components are healthy if no errors

      return {
        status: 'healthy',
        components,
        timestamp
      };
    } catch (error) {
      logger.error("Health check failed", { error });
      return {
        status: 'unhealthy',
        components: {
          masterClassifier: 'down',
          generator: 'down',
          modifier: 'down',
          analyzer: 'down'
        },
        timestamp
      };
    }
  }
}

// Export singleton instance for easy imports
export const requestRouter = new RequestRouter();

// Export types for external use
// (Removed duplicate type exports to resolve conflicts)

// Re-export useful types from classification schema
export { DiagramIntent } from "./schemas/MasterClassificationSchema";
export type { DiagramType, AnalysisType, MasterClassification } from "./schemas/MasterClassificationSchema";