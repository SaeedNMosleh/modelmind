import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { model, baseSystemPrompt } from "./baseChain";
import { UnifiedOutputParser, UnifiedParserFactory } from "./parsers/UnifiedOutputParser";
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
import { getPrompt, substituteVariables, logPromptUsage } from "../prompts/loader";
import { AgentType, PromptOperation } from "../database/types";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

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

      logger.info("Starting master classification", {
        userInput: validatedParams.userInput,
        hasDiagram: !!validatedParams.currentDiagram,
        hasContext: !!validatedParams.context
      });

      // Prepare context for classification
      const classificationContext = this.prepareClassificationContext(validatedParams);

      // Execute the comprehensive classification
      const result = await this.classificationChain.invoke(classificationContext);

      // Validate and enhance the result
      const validatedResult = this.validateAndEnhanceResult(result, validatedParams);

      logger.info("Master classification completed", {
        intent: validatedResult.intent,
        confidence: validatedResult.confidence,
        confidenceLevel: validatedResult.confidenceLevel,
        diagramType: 'diagramType' in validatedResult ? validatedResult.diagramType : 'N/A',
        analysisType: 'analysisType' in validatedResult ? validatedResult.analysisType : 'N/A'
      });

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
      this.createClassificationPrompt(),
      model,
      this.parser
    ]);
  }

  /**
   * Create the comprehensive classification prompt template
   */
  private createClassificationPrompt(): PromptTemplate {
    const promptTemplate = `
${baseSystemPrompt}

You are a master classifier for PlantUML diagram operations. Your task is to comprehensively analyze the user's request and provide a complete classification in a single response.

CONTEXT:
- User Input: {userInput}
- Current Diagram Present: {hasDiagramContext}
- Current Diagram: {currentDiagram}
- Conversation History: {conversationHistory}
- Additional Context: {additionalContext}

CLASSIFICATION TASK:
Analyze the user's request and determine:

1. PRIMARY INTENT:
   - GENERATE: User wants to create a new diagram or completely different one
   - MODIFY: User wants to change, update, or edit an existing diagram
   - ANALYZE: User wants to understand, explain, or get insights about a diagram
   - UNKNOWN: Intent cannot be clearly determined

2. DIAGRAM TYPE (if applicable):
   - SEQUENCE: Interactions between components over time
   - CLASS: System structure, objects, and relationships
   - ACTIVITY: Workflows, processes, and business logic
   - STATE: State transitions and behaviors
   - COMPONENT: System components and interfaces
   - DEPLOYMENT: Physical deployment of components
   - USE_CASE: System/actor interactions and use cases
   - ENTITY_RELATIONSHIP: Data modeling and database schemas
   - UNKNOWN: Cannot determine type

3. ANALYSIS TYPE (for ANALYZE intent):
   - GENERAL: Overall assessment and explanation
   - QUALITY: Best practices and quality assessment
   - COMPONENTS: Inventory and explanation of parts
   - RELATIONSHIPS: Analysis of connections and associations
   - COMPLEXITY: Complexity and maintainability assessment
   - IMPROVEMENTS: Suggestions for enhancement

4. CONFIDENCE ASSESSMENT:
   - Provide numerical confidence (0.0 to 1.0)
   - Explain your reasoning
   - Consider context and clarity of the request

CLASSIFICATION GUIDELINES:

For GENERATE intent:
- Look for words like: create, generate, build, make, new, design
- User wants something that doesn't exist yet
- May specify diagram type or describe what they want

For MODIFY intent:
- Look for words like: modify, change, update, edit, add, remove, delete
- User references existing diagram or wants changes
- Requires current diagram context

For ANALYZE intent:
- Look for words like: analyze, explain, describe, review, check, what, how, why
- User wants to understand or get insights
- May specify what aspect to analyze

DIAGRAM TYPE DETECTION:
- Look for explicit mentions of diagram types
- Infer from context (e.g., "login flow" suggests SEQUENCE)
- Consider domain (e.g., "database design" suggests ENTITY_RELATIONSHIP)
- Default to most likely type based on intent and context

{formatInstructions}

IMPORTANT:
- Be thorough in your analysis but concise in reasoning
- Always provide confidence score with justification
- Clean and normalize the user instruction
- Consider the full context when making decisions
- If unsure, be honest about low confidence rather than guessing
    `.trim();

    return PromptTemplate.fromTemplate(promptTemplate);
  }

  /**
   * Prepare context for classification
   */
  private prepareClassificationContext(params: MasterClassifierParams): Record<string, string> {
    const { userInput, currentDiagram = "", conversation = [], context = {} } = params;

    return {
      userInput,
      hasDiagramContext: currentDiagram ? "YES" : "NO",
      currentDiagram: currentDiagram || "None",
      conversationHistory: conversation.length > 0 
        ? `Previous messages:\n${conversation.join('\n')}` 
        : "No previous conversation",
      additionalContext: Object.keys(context).length > 0
        ? JSON.stringify(context, null, 2)
        : "No additional context",
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
      logger.warn("Result validation failed, using fallback", { error });
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
      logger.error("Input validation error in master classifier", { 
        errors: error.errors,
        userInput: params.userInput 
      });

      return {
        ...createFallbackClassification(params.userInput, !!params.currentDiagram),
        reasoning: `Input validation failed: ${error.errors.map(e => e.message).join(', ')}`
      };
    }

    if (error instanceof Error) {
      logger.error("Classification error", { 
        message: error.message,
        stack: error.stack,
        userInput: params.userInput
      });

      return {
        ...createFallbackClassification(params.userInput, !!params.currentDiagram),
        reasoning: `Classification failed due to error: ${error.message}`
      };
    }

    logger.error("Unknown classification error", { error, userInput: params.userInput });

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
export type { MasterClassifierParams };
export {
  MasterClassification,
  DiagramIntent,
  DiagramType,
  AnalysisType,
  ConfidenceLevel
} from "./schemas/MasterClassificationSchema";