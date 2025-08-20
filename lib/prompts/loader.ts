/**
 * Simple prompt loader with MongoDB fallback for serverless compatibility
 */

import { createEnhancedLogger } from '../utils/consola-logger';
import { Prompt } from '../database/models/prompt';
import { AgentType, PromptOperation, IPrompt } from '../database/types';
import { getEmbeddedPrompt, EMBEDDED_PROMPTS } from './embedded';
import { shouldFilterByDiagramType } from './validation';
import { Document } from 'mongoose';

// Type for lean query results from Mongoose
type LeanPrompt = Omit<IPrompt, keyof Document> & { _id: unknown; __v?: number; };

const logger = createEnhancedLogger('prompts');

/**
 * Configuration for prompt loading
 */
export interface PromptLoaderConfig {
  timeout: number; // DB query timeout in ms
  fallbackToEmbedded: boolean; // Whether to fallback to embedded prompts
  environment: 'production' | 'development'; // Current environment
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PromptLoaderConfig = {
  timeout: 2000, // 2 second timeout
  fallbackToEmbedded: true,
  environment: process.env.NODE_ENV === 'production' 
    ? 'production'
    : 'development'
};

/**
 * Loaded prompt data
 */
export interface LoadedPrompt {
  template: string;
  variables: string[];
  source: 'mongodb' | 'embedded';
  version?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Simple prompt loader that fetches from MongoDB with embedded fallback
 */
export class PromptLoader {
  private config: PromptLoaderConfig;

  constructor(config: Partial<PromptLoaderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load a prompt by agent type and operation
   * @param agentType - The agent type (generator, modifier, analyzer, classifier)
   * @param operation - The operation type
   * @param diagramType - Optional diagram type filter
   * @returns Promise<LoadedPrompt>
   */
  async getPrompt(
    agentType: AgentType | string, 
    operation: PromptOperation | string,
    diagramType?: string
  ): Promise<LoadedPrompt> {
    const startTime = Date.now();
    
    // Enhanced logging for the entry point
    logger.info(`🎯 Prompt request received`, {
      agentType: String(agentType),
      operation: String(operation),
      diagramType: diagramType || 'none',
      timestamp: new Date().toISOString()
    });
    
    try {
      // Try to load from MongoDB first
      logger.debug(`🔄 Attempting MongoDB lookup...`);
      const dbPrompt = await this.loadFromMongoDB(agentType, operation, diagramType);
      if (dbPrompt) {
        const duration = Date.now() - startTime;
        logger.promptLoaded('mongodb', agentType, duration);
        logger.info(`✅ Prompt successfully loaded from MongoDB`, {
          agentType: String(agentType),
          operation: String(operation),
          source: 'mongodb',
          duration: `${duration}ms`
        });
        return dbPrompt;
      } else {
        logger.warn(`❌ MongoDB lookup failed - no prompt found`, {
          agentType: String(agentType),
          operation: String(operation),
          diagramType: diagramType || 'none'
        });
      }
    } catch (error) {
      logger.warn('🚨 MongoDB prompt loading failed, falling back to embedded', { 
        agentType: String(agentType), 
        operation: String(operation), 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Fallback to embedded prompts
    if (this.config.fallbackToEmbedded) {
      logger.debug(`🔄 Attempting embedded fallback...`);
      const embeddedPrompt = this.loadFromEmbedded(agentType, operation);
      if (embeddedPrompt) {
        const duration = Date.now() - startTime;
        logger.promptLoaded('embedded', agentType, duration);
        logger.info(`✅ Prompt loaded from embedded fallback`, {
          agentType: String(agentType),
          operation: String(operation),
          source: 'embedded',
          duration: `${duration}ms`
        });
        return embeddedPrompt;
      } else {
        logger.error(`❌ Embedded fallback also failed`, {
          agentType: String(agentType),
          operation: String(operation)
        });
      }
    }

    // If all else fails, throw an error
    const errorMsg = `No prompt found for agent: ${agentType}, operation: ${operation}`;
    logger.error(`💥 Complete prompt loading failure`, {
      agentType: String(agentType),
      operation: String(operation),
      diagramType: diagramType || 'none',
      duration: `${Date.now() - startTime}ms`,
      mongoDbAttempted: true,
      embeddedAttempted: this.config.fallbackToEmbedded
    });
    throw new Error(errorMsg);
  }

  /**
   * Load prompt from MongoDB with timeout
   * @private
   */
  private async loadFromMongoDB(
    agentType: AgentType | string, 
    operation: PromptOperation | string,
    diagramType?: string
  ): Promise<LoadedPrompt | null> {
    logger.debug(`🔍 Starting MongoDB query for ${agentType}/${operation}`, { diagramType });
    
    // Define the expected query type for Prompt.findOne
    interface PromptQuery {
      agentType: AgentType | string;
      operation: PromptOperation | string;
      isProduction: boolean;
      diagramType?: { $in: string[] } | { $size: number };
    }

    // Ensure we're using string values for the query (not enum objects)
    const agentTypeStr = String(agentType);
    const operationStr = String(operation);
    const diagramTypeStr = diagramType ? String(diagramType) : undefined;

    const query: PromptQuery = {
      agentType: agentTypeStr,
      operation: operationStr,
      isProduction: true  // Always query for production prompts (activated prompts)
    };

    // Enhanced diagram type filtering logic
    if (diagramTypeStr && shouldFilterByDiagramType(agentType, operation, diagramTypeStr)) {
      // Check if we should filter by specific diagram type or match empty arrays
      if (diagramTypeStr.toLowerCase() === 'unknown' || diagramTypeStr === '') {
        // For unknown or empty diagram types, match prompts with empty diagram type arrays
        query.diagramType = { $size: 0 };
        logger.debug(`🎯 Filtering for empty diagramType array (${diagramTypeStr}) for ${agentTypeStr}/${operationStr}`);
      } else {
        // For specific diagram types, look for prompts that include this diagram type
        query.diagramType = { $in: [diagramTypeStr] };
        logger.debug(`🎯 Filtering by specific diagram type: ${diagramTypeStr} for ${agentTypeStr}/${operationStr}`);
      }
    } else if (diagramTypeStr) {
      logger.debug(`⏭️ Ignoring diagram type filter for generic operation: ${agentTypeStr}/${operationStr}`);
    }

    // Enhanced logging for debugging
    logger.debug(`📝 MongoDB query constructed:`, JSON.stringify(query, null, 2));
    logger.debug(`� Query parameter details:`, {
      originalAgentType: agentType,
      agentTypeString: agentTypeStr,
      agentTypeType: typeof agentType,
      originalOperation: operation,
      operationString: operationStr,
      operationType: typeof operation,
      originalDiagramType: diagramType,
      diagramTypeString: diagramTypeStr,
      isProduction: query.isProduction,
      diagramTypeQuery: query.diagramType
    });

    // Create a promise with timeout
    const queryPromise = Prompt.findOne(query)
      .sort({ updatedAt: -1 }) // Get the most recent
      .lean()
      .exec();

    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('MongoDB query timeout')), this.config.timeout)
    );

    try {
      logger.debug(`🚀 Executing MongoDB query...`);
      const result = await Promise.race([queryPromise, timeoutPromise]) as LeanPrompt | null;
      
      if (!result) {
        logger.warn(`❌ No prompt found in MongoDB`, {
          agentType: agentTypeStr,
          operation: operationStr,
          diagramType: diagramTypeStr,
          query: JSON.stringify(query, null, 2)
        });
        
        // Additional debugging: try to find any prompts for this agent/operation without diagram type filter
        try {
          const debugQuery = {
            agentType: agentTypeStr,
            operation: operationStr,
            isProduction: true
          };
          const debugResult = await Prompt.findOne(debugQuery).lean().exec() as LeanPrompt | null;
          if (debugResult) {
            logger.debug(`🔍 Debug: Found prompt without diagram filter`, {
              foundPrompt: {
                name: debugResult.name,
                agentType: debugResult.agentType,
                operation: debugResult.operation,
                diagramType: debugResult.diagramType,
                isProduction: debugResult.isProduction
              }
            });
          } else {
            logger.debug(`🔍 Debug: No prompts found even without diagram filter for ${agentTypeStr}/${operationStr}`);
            
            // Even more debugging: check what's actually in the database
            const allProduction = await Prompt.find({ isProduction: true }).lean().limit(5).exec() as LeanPrompt[];
            logger.debug(`🔍 Debug: Sample of production prompts in database`, {
              totalFound: allProduction.length,
              samples: allProduction.map(p => ({
                name: p.name,
                agentType: p.agentType,
                operation: p.operation,
                diagramType: p.diagramType,
                isProduction: p.isProduction
              }))
            });
          }
        } catch (debugError) {
          logger.error('Debug query failed', { error: debugError });
        }
        
        return null;
      }

      logger.info(`✅ Found prompt in MongoDB`, {
        name: result.name,
        agentType: result.agentType,
        operation: result.operation,
        diagramType: result.diagramType,
        isProduction: result.isProduction
      });

      // Check if result has versions and metadata properties
      // Use IPrompt type from database/types
      // Safely cast result to IPrompt after narrowing to unknown
      const promptResult = result as unknown as import('../database/types').IPrompt;
      if (!promptResult.versions || !Array.isArray(promptResult.versions)) {
        logger.warn('No versions found for prompt', { agentType: agentTypeStr, operation: operationStr });
        return null;
      }
      // Get the primary version
      const primaryVersion = promptResult.versions.find((v: import('../database/types').IPromptVersion) => v.version === promptResult.primaryVersion);
      if (!primaryVersion) {
        logger.warn('No primary version found for prompt', { agentType: agentTypeStr, operation: operationStr, primaryVersion: promptResult.primaryVersion });
        return null;
      }

      // Extract variables from template (simple pattern matching)
      const variables = this.extractVariables(primaryVersion.template);

      logger.info(`🎉 Successfully loaded prompt from MongoDB`, {
        name: promptResult.name,
        version: primaryVersion.version,
        templateLength: primaryVersion.template.length,
        variableCount: variables.length
      });

      return {
        template: primaryVersion.template,
        variables,
        source: 'mongodb',
        version: primaryVersion.version,
        metadata: promptResult.metadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(`💥 MongoDB query failed for ${operationStr}`, {
        error: errorMessage,
        stack: errorStack,
        query: JSON.stringify(query, null, 2),
        timeout: errorMessage.includes('timeout'),
        agentType: agentTypeStr,
        operation: operationStr,
        diagramType: diagramTypeStr
      });
      return null;
    }
  }

  /**
   * Load prompt from embedded fallback
   * @private
   */
  private loadFromEmbedded(
    agentType: AgentType | string, 
    operation: PromptOperation | string
  ): LoadedPrompt | null {
    const embeddedPrompt = getEmbeddedPrompt(agentType, operation);
    
    if (!embeddedPrompt) {
      return null;
    }

    return {
      template: embeddedPrompt.template,
      variables: embeddedPrompt.variables,
      source: 'embedded'
    };
  }

  /**
   * Extract variables from template using simple pattern matching
   * Looks for {variableName} patterns
   * @private
   */
  private extractVariables(template: string): string[] {
    const variableRegex = /\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Test database connectivity
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    try {
      await Prompt.findOne().limit(1).lean().exec();
      return true;
    } catch (error) {
      logger.error('Database connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get loader statistics
   */
  getStats() {
    return {
      config: this.config,
      embeddedPromptsCount: EMBEDDED_PROMPTS.size
    };
  }
}

/**
 * Default prompt loader instance
 */
export const promptLoader = new PromptLoader();

/**
 * Convenience function to get a prompt
 */
export async function getPrompt(
  agentType: AgentType | string, 
  operation: PromptOperation | string,
  diagramType?: string
): Promise<LoadedPrompt> {
  return promptLoader.getPrompt(agentType, operation, diagramType);
}

/**
 * Template variable substitution utility
 */
export function substituteVariables(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(pattern, value || '');
  });
  
  return result;
}

/**
 * Log prompt usage for monitoring
 */
export function logPromptUsage(
  agentType: string,
  operation: string,
  source: 'mongodb' | 'embedded',
  duration: number
) {
  logger.debug(`📊 Prompt usage tracked | Agent: ${agentType} | Source: ${source} | Duration: ${duration}ms`);
}