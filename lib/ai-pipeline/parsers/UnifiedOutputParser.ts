import { BaseOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Configuration interface for the unified parser
 */
export interface UnifiedParserConfig<T> {
  /** Zod schema for structured validation */
  schema: z.ZodSchema<T>;
  /** Fallback mappings for simple string patterns */
  fallbackMappings?: Record<string, Partial<T>>;
  /** Common patterns to extract from text */
  extractPatterns?: {
    /** Pattern name to regex mapping */
    [key: string]: RegExp;
  };
  /** Default fallback value when all parsing fails */
  defaultFallback: T;
  /** Whether to attempt JSON parsing first (default: true) */
  tryJsonFirst?: boolean;
}

/**
 * Universal structured output parser that eliminates redundant parsing logic
 * across all AI pipeline agents. Supports both JSON and string-based fallback parsing.
 */
export class UnifiedOutputParser<T> extends BaseOutputParser<T> {
  private config: UnifiedParserConfig<T>;

  constructor(config: UnifiedParserConfig<T>) {
    super();
    this.config = {
      ...config,
      tryJsonFirst: config.tryJsonFirst ?? true,
    };
  }

  /**
   * Parse the output using multiple strategies:
   * 1. JSON parsing with Zod validation (most reliable)
   * 2. Pattern extraction fallback
   * 3. Default fallback
   */
  async parse(text: string): Promise<T> {
    const cleanText = text.trim();
    
    // Strategy 1: Try JSON parsing first (most reliable)
    if (this.config.tryJsonFirst) {
      const jsonResult = await this.tryJsonParsing(cleanText);
      if (jsonResult !== null) {
        logger.info("Successfully parsed with JSON strategy");
        return jsonResult;
      }
    }

    // Strategy 2: Try pattern extraction
    const patternResult = await this.tryPatternExtraction(cleanText);
    if (patternResult !== null) {
      logger.info("Successfully parsed with pattern extraction strategy");
      return patternResult;
    }

    // Strategy 3: Return default fallback
    logger.warn("All parsing strategies failed, using default fallback", {
      textLength: cleanText.length,
      textPreview: cleanText.substring(0, 100)
    });
    
    return this.config.defaultFallback;
  }

  /**
   * Attempt to parse as JSON and validate with Zod schema
   */
  private async tryJsonParsing(text: string): Promise<T | null> {
    try {
      // Try to find JSON objects in the text
      const jsonMatches = [
        // Look for complete JSON objects
        text.match(/\{[\s\S]*\}/),
        // Look for JSON between code fences
        text.match(/```json\s*([\s\S]*?)\s*```/),
        // Look for JSON in markdown code blocks
        text.match(/```\s*([\s\S]*?)\s*```/)
      ].filter(Boolean);

      for (const match of jsonMatches) {
        if (!match) continue;
        
        try {
          const jsonText = match[1] || match[0];
          const parsed = JSON.parse(jsonText);
          
          // Validate with Zod schema
          const validated = this.config.schema.parse(parsed);
          return validated;
        } catch (parseError) {
          // Continue to next match or strategy
          continue;
        }
      }

      // Direct JSON parse attempt
      const directParsed = JSON.parse(text);
      const validated = this.config.schema.parse(directParsed);
      return validated;
      
    } catch (error) {
      logger.debug("JSON parsing failed", { error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * Extract patterns from text and map to object structure
   */
  private async tryPatternExtraction(text: string): Promise<T | null> {
    try {
      if (!this.config.extractPatterns || !this.config.fallbackMappings) {
        return null;
      }

      const extractedData: Record<string, string> = {};
      
      // Extract patterns from text
      for (const [patternName, regex] of Object.entries(this.config.extractPatterns)) {
        const match = text.match(regex);
        if (match) {
          extractedData[patternName] = match[1] || match[0];
        }
      }

      // Find best matching fallback mapping
      let bestMatch: Partial<T> | null = null;
      let bestMatchScore = 0;

      for (const [key, mapping] of Object.entries(this.config.fallbackMappings)) {
        const score = this.calculateMatchScore(key, extractedData, text);
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatch = mapping;
        }
      }

      if (bestMatch && bestMatchScore > 0) {
        // Merge extracted data with best match
        const merged = { ...bestMatch };
        
        // Apply extracted patterns to the result
        for (const [key, value] of Object.entries(extractedData)) {
          if (key in merged) {
            (merged as any)[key] = value;
          }
        }

        // Validate the result
        const validated = this.config.schema.parse(merged);
        return validated;
      }

      return null;
    } catch (error) {
      logger.debug("Pattern extraction failed", { error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * Calculate match score for fallback mappings
   */
  private calculateMatchScore(
    mappingKey: string, 
    extractedData: Record<string, string>, 
    text: string
  ): number {
    let score = 0;
    const upperText = text.toUpperCase();
    const upperKey = mappingKey.toUpperCase();

    // Direct key match in text
    if (upperText.includes(upperKey)) {
      score += 10;
    }

    // Partial key matches
    const keyWords = upperKey.split(/[\s_-]+/);
    for (const word of keyWords) {
      if (word.length > 2 && upperText.includes(word)) {
        score += 2;
      }
    }

    // Pattern data matches
    for (const [patternName, value] of Object.entries(extractedData)) {
      if (value.toUpperCase().includes(upperKey)) {
        score += 5;
      }
    }

    return score;
  }

  /**
   * Get format instructions for LLM responses
   */
  getFormatInstructions(): string {
    const schemaDescription = this.generateSchemaDescription();
    
    return `
Please respond with a valid JSON object that matches this structure:

${schemaDescription}

IMPORTANT: 
- Your response should be valid JSON that can be parsed directly
- If you cannot provide structured JSON, you may respond with simple text containing key information
- Supported fallback patterns: ${Object.keys(this.config.fallbackMappings || {}).join(', ')}

Example JSON response:
\`\`\`json
${this.generateExampleJson()}
\`\`\`
    `.trim();
  }

  /**
   * Generate schema description from Zod schema
   */
  private generateSchemaDescription(): string {
    try {
      // Create a sample object to understand the schema structure
      const sampleResult = this.config.defaultFallback;
      const entries = Object.entries(sampleResult as any);
      
      return entries.map(([key, value]) => {
        const type = typeof value;
        const isArray = Array.isArray(value);
        const typeDesc = isArray ? `array of ${typeof value[0] || 'unknown'}` : type;
        return `  "${key}": (${typeDesc}) - required`;
      }).join('\n');
    } catch (error) {
      return "Structure determined by the specific agent schema";
    }
  }

  /**
   * Generate example JSON from default fallback
   */
  private generateExampleJson(): string {
    try {
      return JSON.stringify(this.config.defaultFallback, null, 2);
    } catch (error) {
      return '{\n  "example": "value"\n}';
    }
  }
}

/**
 * Common pattern extractors for AI pipeline agents
 */
export const CommonPatterns = {
  // Intent classification patterns
  INTENT: /\b(GENERATE|MODIFY|ANALYZE|UNKNOWN)\b/i,
  
  // Diagram type patterns
  DIAGRAM_TYPE: /\b(SEQUENCE|CLASS|ACTIVITY|STATE|COMPONENT|DEPLOYMENT|USE_CASE|ENTITY_RELATIONSHIP)\b/i,
  
  // Analysis type patterns
  ANALYSIS_TYPE: /\b(GENERAL|QUALITY|COMPONENTS|RELATIONSHIPS|COMPLEXITY|IMPROVEMENTS)\b/i,
  
  // PlantUML diagram extraction
  PLANTUML_DIAGRAM: /@startuml[\s\S]*?@enduml/i,
  
  // Confidence extraction
  CONFIDENCE: /confidence[:\s]*([0-9]*\.?[0-9]+)/i,
  
  // Score extraction  
  SCORE: /score[:\s]*([0-9]+)/i,
  
  // List items (bullet points)
  LIST_ITEMS: /^[-*•]\s*(.+)$/gm,
  
  // Quoted strings
  QUOTED_STRING: /"([^"]+)"/g,
} as const;

/**
 * Factory function to create parsers for common agent types
 */
export class UnifiedParserFactory {
  /**
   * Create parser for intent classification
   */
  static createIntentParser<T>(schema: z.ZodSchema<T>, defaultFallback: T) {
    return new UnifiedOutputParser({
      schema,
      defaultFallback,
      extractPatterns: {
        intent: CommonPatterns.INTENT,
        confidence: CommonPatterns.CONFIDENCE,
      },
      fallbackMappings: {
        'GENERATE': { intent: 'GENERATE', confidence: 0.8 } as Partial<T>,
        'MODIFY': { intent: 'MODIFY', confidence: 0.8 } as Partial<T>,
        'ANALYZE': { intent: 'ANALYZE', confidence: 0.8 } as Partial<T>,
        'UNKNOWN': { intent: 'UNKNOWN', confidence: 0.3 } as Partial<T>,
      }
    });
  }

  /**
   * Create parser for diagram generation
   */
  static createGenerationParser<T>(schema: z.ZodSchema<T>, defaultFallback: T) {
    return new UnifiedOutputParser({
      schema,
      defaultFallback,
      extractPatterns: {
        diagram: CommonPatterns.PLANTUML_DIAGRAM,
        diagramType: CommonPatterns.DIAGRAM_TYPE,
      },
      fallbackMappings: {
        'SEQUENCE': { diagramType: 'SEQUENCE' } as Partial<T>,
        'CLASS': { diagramType: 'CLASS' } as Partial<T>,
        'ACTIVITY': { diagramType: 'ACTIVITY' } as Partial<T>,
        'STATE': { diagramType: 'STATE' } as Partial<T>,
        'COMPONENT': { diagramType: 'COMPONENT' } as Partial<T>,
        'DEPLOYMENT': { diagramType: 'DEPLOYMENT' } as Partial<T>,
        'USE_CASE': { diagramType: 'USE_CASE' } as Partial<T>,
        'ENTITY_RELATIONSHIP': { diagramType: 'ENTITY_RELATIONSHIP' } as Partial<T>,
      }
    });
  }

  /**
   * Create parser for diagram modification
   */
  static createModificationParser<T>(schema: z.ZodSchema<T>, defaultFallback: T) {
    return new UnifiedOutputParser({
      schema,
      defaultFallback,
      extractPatterns: {
        diagram: CommonPatterns.PLANTUML_DIAGRAM,
        diagramType: CommonPatterns.DIAGRAM_TYPE,
        changes: CommonPatterns.LIST_ITEMS,
      },
      fallbackMappings: {
        'MODIFIED': { changes: ['Diagram modified as requested'] } as Partial<T>,
        'UPDATED': { changes: ['Diagram updated'] } as Partial<T>,
        'CHANGED': { changes: ['Changes applied'] } as Partial<T>,
      }
    });
  }

  /**
   * Create parser for diagram analysis
   */
  static createAnalysisParser<T>(schema: z.ZodSchema<T>, defaultFallback: T) {
    return new UnifiedOutputParser({
      schema,
      defaultFallback,
      extractPatterns: {
        diagramType: CommonPatterns.DIAGRAM_TYPE,
        analysisType: CommonPatterns.ANALYSIS_TYPE,
        score: CommonPatterns.SCORE,
      },
      fallbackMappings: {
        'GENERAL': { analysisType: 'GENERAL' } as Partial<T>,
        'QUALITY': { analysisType: 'QUALITY' } as Partial<T>,
        'COMPONENTS': { analysisType: 'COMPONENTS' } as Partial<T>,
        'RELATIONSHIPS': { analysisType: 'RELATIONSHIPS' } as Partial<T>,
        'COMPLEXITY': { analysisType: 'COMPLEXITY' } as Partial<T>,
        'IMPROVEMENTS': { analysisType: 'IMPROVEMENTS' } as Partial<T>,
      }
    });
  }

  /**
   * Create simple type detection parser
   */
  static createTypeDetectionParser<T extends string>(
    validTypes: readonly T[],
    defaultType: T
  ) {
    const schema = z.enum(validTypes as [T, ...T[]]);
    
    return new UnifiedOutputParser({
      schema,
      defaultFallback: defaultType,
      tryJsonFirst: false, // Simple string responses don't need JSON
      extractPatterns: {
        type: new RegExp(`\\b(${validTypes.join('|')})\\b`, 'i'),
      },
      fallbackMappings: Object.fromEntries(
        validTypes.map(type => [type.toUpperCase(), type])
      ) as Record<string, T>
    });
  }
}