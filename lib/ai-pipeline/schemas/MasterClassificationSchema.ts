import { z } from "zod";

/**
 * Master Classification Schema
 * 
 * Consolidates all routing decisions into a single comprehensive classification
 * that eliminates redundant LLM calls across the AI pipeline.
 */

// ============================================================================
// CORE ENUMS - Consolidated from all agents
// ============================================================================

/**
 * Primary user intent for diagram operations
 */
export enum DiagramIntent {
  GENERATE = "GENERATE",   // Create a new diagram
  MODIFY = "MODIFY",       // Change an existing diagram  
  ANALYZE = "ANALYZE",     // Analyze or get insights about a diagram
  UNKNOWN = "UNKNOWN"      // Intent couldn't be determined
}

/**
 * PlantUML diagram types supported across all agents
 */
export enum DiagramType {
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
 * Types of analysis that can be performed on diagrams
 */
export enum AnalysisType {
  GENERAL = "GENERAL",           // Overall assessment
  QUALITY = "QUALITY",           // Quality and best practices assessment
  COMPONENTS = "COMPONENTS",     // Component inventory and explanation
  RELATIONSHIPS = "RELATIONSHIPS", // Relationship analysis
  COMPLEXITY = "COMPLEXITY",     // Complexity assessment
  IMPROVEMENTS = "IMPROVEMENTS"  // Improvement suggestions
}

/**
 * Confidence levels for classification certainty
 */
export enum ConfidenceLevel {
  VERY_HIGH = "VERY_HIGH",  // 0.9-1.0
  HIGH = "HIGH",            // 0.7-0.89
  MEDIUM = "MEDIUM",        // 0.5-0.69
  LOW = "LOW",              // 0.3-0.49
  VERY_LOW = "VERY_LOW"     // 0.0-0.29
}

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * Base classification that's always required
 */
const baseClassificationSchema = z.object({
  /** Primary user intent */
  intent: z.nativeEnum(DiagramIntent),
  
  /** Numerical confidence score (0.0 to 1.0) */
  confidence: z.number().min(0).max(1),
  
  /** Categorical confidence level */
  confidenceLevel: z.nativeEnum(ConfidenceLevel),
  
  /** Brief reasoning for the classification decision */
  reasoning: z.string().min(1).max(500),
  
  /** Cleaned/normalized version of user input */
  cleanedInstruction: z.string().min(1),
  
  /** Whether current diagram context exists */
  hasDiagramContext: z.boolean(),
});

/**
 * Additional fields for GENERATE intent
 */
const generateClassificationSchema = z.object({
  /** Type of diagram to generate */
  diagramType: z.nativeEnum(DiagramType),
  
  /** Specific requirements extracted from user input */
  generationRequirements: z.array(z.string()).optional(),
  
  /** Suggested templates that might be relevant */
  suggestedTemplates: z.array(z.string()).optional(),
  
  /** Domain or context (e.g., "software architecture", "business process") */
  domain: z.string().optional(),
});

/**
 * Additional fields for MODIFY intent  
 */
const modifyClassificationSchema = z.object({
  /** Type of the existing diagram */
  diagramType: z.nativeEnum(DiagramType),
  
  /** Specific modifications requested */
  modificationRequests: z.array(z.string()).min(1),
  
  /** Parts of diagram to focus on */
  targetElements: z.array(z.string()).optional(),
  
  /** Whether this is a major or minor modification */
  modificationScope: z.enum(["MINOR", "MAJOR", "COMPLETE_REWRITE"]).optional(),
});

/**
 * Additional fields for ANALYZE intent
 */
const analyzeClassificationSchema = z.object({
  /** Type of the diagram to analyze */
  diagramType: z.nativeEnum(DiagramType),
  
  /** Type of analysis requested */
  analysisType: z.nativeEnum(AnalysisType),
  
  /** Specific aspects to focus analysis on */
  analysisAspects: z.array(z.string()).optional(),
  
  /** Expected output format (e.g., "summary", "detailed", "checklist") */
  outputFormat: z.enum(["SUMMARY", "DETAILED", "CHECKLIST", "COMPARISON"]).optional(),
});

/**
 * Complete master classification schema with conditional fields
 */
export const masterClassificationSchema = z.discriminatedUnion("intent", [
  // GENERATE intent with generation-specific fields
  baseClassificationSchema.extend({
    intent: z.literal(DiagramIntent.GENERATE),
  }).merge(generateClassificationSchema),
  
  // MODIFY intent with modification-specific fields  
  baseClassificationSchema.extend({
    intent: z.literal(DiagramIntent.MODIFY),
  }).merge(modifyClassificationSchema),
  
  // ANALYZE intent with analysis-specific fields
  baseClassificationSchema.extend({
    intent: z.literal(DiagramIntent.ANALYZE),
  }).merge(analyzeClassificationSchema),
  
  // UNKNOWN intent with minimal fields
  baseClassificationSchema.extend({
    intent: z.literal(DiagramIntent.UNKNOWN),
  }),
]);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Master classification result type
 */
export type MasterClassification = z.infer<typeof masterClassificationSchema>;

/**
 * Generate-specific classification
 */
export type GenerateClassification = Extract<MasterClassification, { intent: DiagramIntent.GENERATE }>;

/**
 * Modify-specific classification  
 */
export type ModifyClassification = Extract<MasterClassification, { intent: DiagramIntent.MODIFY }>;

/**
 * Analyze-specific classification
 */
export type AnalyzeClassification = Extract<MasterClassification, { intent: DiagramIntent.ANALYZE }>;

/**
 * Unknown classification
 */
export type UnknownClassification = Extract<MasterClassification, { intent: DiagramIntent.UNKNOWN }>;

// ============================================================================
// FALLBACK MAPPINGS FOR STRING PARSING
// ============================================================================

/**
 * Intent detection patterns and mappings
 */
export const INTENT_FALLBACK_MAPPINGS: Record<string, Partial<MasterClassification>> = {
  // Generate patterns
  "CREATE": { intent: DiagramIntent.GENERATE, confidence: 0.8, confidenceLevel: ConfidenceLevel.HIGH },
  "GENERATE": { intent: DiagramIntent.GENERATE, confidence: 0.9, confidenceLevel: ConfidenceLevel.VERY_HIGH },
  "BUILD": { intent: DiagramIntent.GENERATE, confidence: 0.7, confidenceLevel: ConfidenceLevel.HIGH },
  "MAKE": { intent: DiagramIntent.GENERATE, confidence: 0.7, confidenceLevel: ConfidenceLevel.HIGH },
  "NEW": { intent: DiagramIntent.GENERATE, confidence: 0.8, confidenceLevel: ConfidenceLevel.HIGH },
  
  // Modify patterns
  "MODIFY": { intent: DiagramIntent.MODIFY, confidence: 0.9, confidenceLevel: ConfidenceLevel.VERY_HIGH },
  "CHANGE": { intent: DiagramIntent.MODIFY, confidence: 0.8, confidenceLevel: ConfidenceLevel.HIGH },
  "UPDATE": { intent: DiagramIntent.MODIFY, confidence: 0.8, confidenceLevel: ConfidenceLevel.HIGH },
  "EDIT": { intent: DiagramIntent.MODIFY, confidence: 0.8, confidenceLevel: ConfidenceLevel.HIGH },
  "ADD": { intent: DiagramIntent.MODIFY, confidence: 0.7, confidenceLevel: ConfidenceLevel.HIGH },
  "REMOVE": { intent: DiagramIntent.MODIFY, confidence: 0.7, confidenceLevel: ConfidenceLevel.HIGH },
  "DELETE": { intent: DiagramIntent.MODIFY, confidence: 0.7, confidenceLevel: ConfidenceLevel.HIGH },
  
  // Analyze patterns
  "ANALYZE": { intent: DiagramIntent.ANALYZE, confidence: 0.9, confidenceLevel: ConfidenceLevel.VERY_HIGH },
  "EXPLAIN": { intent: DiagramIntent.ANALYZE, confidence: 0.8, confidenceLevel: ConfidenceLevel.HIGH },
  "DESCRIBE": { intent: DiagramIntent.ANALYZE, confidence: 0.7, confidenceLevel: ConfidenceLevel.HIGH },
  "REVIEW": { intent: DiagramIntent.ANALYZE, confidence: 0.7, confidenceLevel: ConfidenceLevel.HIGH },
  "CHECK": { intent: DiagramIntent.ANALYZE, confidence: 0.6, confidenceLevel: ConfidenceLevel.MEDIUM },
  "WHAT": { intent: DiagramIntent.ANALYZE, confidence: 0.6, confidenceLevel: ConfidenceLevel.MEDIUM },
  "HOW": { intent: DiagramIntent.ANALYZE, confidence: 0.6, confidenceLevel: ConfidenceLevel.MEDIUM },
  "WHY": { intent: DiagramIntent.ANALYZE, confidence: 0.6, confidenceLevel: ConfidenceLevel.MEDIUM },
};

/**
 * Diagram type detection patterns
 */
export const DIAGRAM_TYPE_FALLBACK_MAPPINGS: Record<string, DiagramType> = {
  "SEQUENCE": DiagramType.SEQUENCE,
  "INTERACTION": DiagramType.SEQUENCE,
  "FLOW": DiagramType.SEQUENCE,
  "TIMELINE": DiagramType.SEQUENCE,
  
  "CLASS": DiagramType.CLASS,
  "OBJECT": DiagramType.CLASS,
  "UML": DiagramType.CLASS,
  "STRUCTURE": DiagramType.CLASS,
  
  "ACTIVITY": DiagramType.ACTIVITY,
  "PROCESS": DiagramType.ACTIVITY,
  "WORKFLOW": DiagramType.ACTIVITY,
  "PROCEDURE": DiagramType.ACTIVITY,
  
  "STATE": DiagramType.STATE,
  "MACHINE": DiagramType.STATE,
  "TRANSITION": DiagramType.STATE,
  
  "COMPONENT": DiagramType.COMPONENT,
  "MODULE": DiagramType.COMPONENT,
  "SYSTEM": DiagramType.COMPONENT,
  "ARCHITECTURE": DiagramType.COMPONENT,
  
  "DEPLOYMENT": DiagramType.DEPLOYMENT,
  "INFRASTRUCTURE": DiagramType.DEPLOYMENT,
  "PHYSICAL": DiagramType.DEPLOYMENT,
  
  "USE_CASE": DiagramType.USE_CASE,
  "USECASE": DiagramType.USE_CASE,
  "USER": DiagramType.USE_CASE,
  "ACTOR": DiagramType.USE_CASE,
  
  "ENTITY_RELATIONSHIP": DiagramType.ENTITY_RELATIONSHIP,
  "ER": DiagramType.ENTITY_RELATIONSHIP,
  "DATABASE": DiagramType.ENTITY_RELATIONSHIP,
  "DATA": DiagramType.ENTITY_RELATIONSHIP,
};

/**
 * Analysis type detection patterns
 */
export const ANALYSIS_TYPE_FALLBACK_MAPPINGS: Record<string, AnalysisType> = {
  "GENERAL": AnalysisType.GENERAL,
  "OVERALL": AnalysisType.GENERAL,
  "SUMMARY": AnalysisType.GENERAL,
  
  "QUALITY": AnalysisType.QUALITY,
  "BEST_PRACTICES": AnalysisType.QUALITY,
  "STANDARDS": AnalysisType.QUALITY,
  "PRACTICES": AnalysisType.QUALITY,
  
  "COMPONENTS": AnalysisType.COMPONENTS,
  "ELEMENTS": AnalysisType.COMPONENTS,
  "PARTS": AnalysisType.COMPONENTS,
  "ITEMS": AnalysisType.COMPONENTS,
  
  "RELATIONSHIPS": AnalysisType.RELATIONSHIPS,
  "CONNECTIONS": AnalysisType.RELATIONSHIPS,
  "LINKS": AnalysisType.RELATIONSHIPS,
  "ASSOCIATIONS": AnalysisType.RELATIONSHIPS,
  
  "COMPLEXITY": AnalysisType.COMPLEXITY,
  "COMPLEX": AnalysisType.COMPLEXITY,
  "DIFFICULTY": AnalysisType.COMPLEXITY,
  
  "IMPROVEMENTS": AnalysisType.IMPROVEMENTS,
  "SUGGESTIONS": AnalysisType.IMPROVEMENTS,
  "RECOMMENDATIONS": AnalysisType.IMPROVEMENTS,
  "OPTIMIZE": AnalysisType.IMPROVEMENTS,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert numerical confidence to categorical level
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return ConfidenceLevel.VERY_HIGH;
  if (confidence >= 0.7) return ConfidenceLevel.HIGH;
  if (confidence >= 0.5) return ConfidenceLevel.MEDIUM;
  if (confidence >= 0.3) return ConfidenceLevel.LOW;
  return ConfidenceLevel.VERY_LOW;
}

/**
 * Create default fallback classification for unknown intents
 */
export function createFallbackClassification(
  userInput: string,
  hasDiagramContext: boolean = false
): UnknownClassification {
  return {
    intent: DiagramIntent.UNKNOWN,
    confidence: 0.1,
    confidenceLevel: ConfidenceLevel.VERY_LOW,
    reasoning: "Could not determine user intent from the provided input",
    cleanedInstruction: userInput.trim(),
    hasDiagramContext,
  };
}

/**
 * Validate and normalize a master classification result
 */
export function validateClassification(data: unknown): MasterClassification {
  try {
    return masterClassificationSchema.parse(data);
  } catch (error) {
    // Return fallback if validation fails
    return createFallbackClassification(
      typeof data === 'object' && data !== null && 'cleanedInstruction' in data
        ? String(data.cleanedInstruction)
        : "Invalid input"
    );
  }
}

/**
 * Type guard functions for specific classification types
 */
export function isGenerateClassification(
  classification: MasterClassification
): classification is GenerateClassification {
  return classification.intent === DiagramIntent.GENERATE;
}

export function isModifyClassification(
  classification: MasterClassification  
): classification is ModifyClassification {
  return classification.intent === DiagramIntent.MODIFY;
}

export function isAnalyzeClassification(
  classification: MasterClassification
): classification is AnalyzeClassification {
  return classification.intent === DiagramIntent.ANALYZE;
}

export function isUnknownClassification(
  classification: MasterClassification
): classification is UnknownClassification {
  return classification.intent === DiagramIntent.UNKNOWN;
}

// ============================================================================
// FORMAT INSTRUCTIONS FOR LLM
// ============================================================================

/**
 * Generate comprehensive format instructions for the LLM
 */
export function getMasterClassificationInstructions(): string {
  return `
You must respond with a JSON object that classifies the user's request comprehensively.

REQUIRED FIELDS (always include):
- "intent": One of "GENERATE", "MODIFY", "ANALYZE", or "UNKNOWN"
- "confidence": Number between 0.0 and 1.0 indicating classification certainty
- "confidenceLevel": One of "VERY_HIGH", "HIGH", "MEDIUM", "LOW", "VERY_LOW"
- "reasoning": Brief explanation (max 500 chars) for your classification decision
- "cleanedInstruction": Normalized version of the user's request
- "hasDiagramContext": Boolean indicating if there's an existing diagram

CONDITIONAL FIELDS (include based on intent):

FOR "GENERATE" intent, also include:
- "diagramType": One of "SEQUENCE", "CLASS", "ACTIVITY", "STATE", "COMPONENT", "DEPLOYMENT", "USE_CASE", "ENTITY_RELATIONSHIP", "UNKNOWN"
- "generationRequirements": Array of specific requirements (optional)
- "suggestedTemplates": Array of relevant template names (optional)
- "domain": Context domain like "software architecture" (optional)

FOR "MODIFY" intent, also include:
- "diagramType": Type of the existing diagram
- "modificationRequests": Array of specific changes requested (required)
- "targetElements": Array of diagram parts to focus on (optional)
- "modificationScope": One of "MINOR", "MAJOR", "COMPLETE_REWRITE" (optional)

FOR "ANALYZE" intent, also include:
- "diagramType": Type of diagram to analyze
- "analysisType": One of "GENERAL", "QUALITY", "COMPONENTS", "RELATIONSHIPS", "COMPLEXITY", "IMPROVEMENTS"
- "analysisAspects": Array of specific aspects to focus on (optional)
- "outputFormat": One of "SUMMARY", "DETAILED", "CHECKLIST", "COMPARISON" (optional)

Example JSON response:
\`\`\`json
{
  "intent": "GENERATE",
  "confidence": 0.85,
  "confidenceLevel": "HIGH",
  "reasoning": "User clearly wants to create a new sequence diagram for login flow",
  "cleanedInstruction": "Create a sequence diagram showing the user login process",
  "hasDiagramContext": false,
  "diagramType": "SEQUENCE",
  "generationRequirements": ["user authentication", "login flow", "system interactions"],
  "domain": "software architecture"
}
\`\`\`
  `.trim();
}