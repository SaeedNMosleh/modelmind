/**
 * Simple prompt loader with MongoDB fallback for serverless compatibility
 */

import { createEnhancedLogger } from '../utils/consola-logger';
import { Prompt } from '../database/models/prompt';
import { AgentType, PromptOperation, PromptEnvironment } from '../database/types';
import { getEmbeddedPrompt, EMBEDDED_PROMPTS } from './embedded';

const logger = createEnhancedLogger('prompts');

/**
 * Configuration for prompt loading
 */
export interface PromptLoaderConfig {
  timeout: number; // DB query timeout in ms
  fallbackToEmbedded: boolean; // Whether to fallback to embedded prompts
  environment: PromptEnvironment; // Current environment
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PromptLoaderConfig = {
  timeout: 2000, // 2 second timeout
  fallbackToEmbedded: true,
  environment: process.env.NODE_ENV === 'production' 
    ? PromptEnvironment.PRODUCTION 
    : PromptEnvironment.DEVELOPMENT
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
    
    try {
      // Try to load from MongoDB first
      const dbPrompt = await this.loadFromMongoDB(agentType, operation, diagramType);
      if (dbPrompt) {
        const duration = Date.now() - startTime;
        logger.promptLoaded('mongodb', agentType, duration);
        return dbPrompt;
      }
    } catch (error) {
      logger.warn('MongoDB prompt loading failed, falling back to embedded', { 
        agentType, 
        operation, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Fallback to embedded prompts
    if (this.config.fallbackToEmbedded) {
      const embeddedPrompt = this.loadFromEmbedded(agentType, operation);
      if (embeddedPrompt) {
        const duration = Date.now() - startTime;
        logger.promptLoaded('embedded', agentType, duration);
        return embeddedPrompt;
      }
    }

    // If all else fails, throw an error
    throw new Error(`No prompt found for agent: ${agentType}, operation: ${operation}`);
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
    // Define the expected query type for Prompt.findOne
    interface PromptQuery {
      agentType: AgentType | string;
      operation: PromptOperation | string;
      environments: PromptEnvironment;
      isProduction: boolean;
      diagramType?: { $in: string[] };
    }
    const query: PromptQuery = {
      agentType,
      operation,
      environments: this.config.environment,
      isProduction: this.config.environment === PromptEnvironment.PRODUCTION
    };

    // Add diagram type filter if provided
    if (diagramType) {
      query.diagramType = { $in: [diagramType] };
    }

    // Create a promise with timeout
    const queryPromise = Prompt.findOne(query)
      .sort({ updatedAt: -1 }) // Get the most recent
      .lean()
      .exec();

    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('MongoDB query timeout')), this.config.timeout)
    );

    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (!result) {
        return null;
      }

      // Check if result has versions and metadata properties
      // Use IPrompt type from database/types
      // Safely cast result to IPrompt after narrowing to unknown
      const promptResult = result as unknown as import('../database/types').IPrompt;
      if (!promptResult.versions || !Array.isArray(promptResult.versions)) {
        logger.warn('No versions found for prompt', { agentType, operation });
        return null;
      }
      // Get the primary version
      const primaryVersion = promptResult.versions.find((v: import('../database/types').IPromptVersion) => v.version === promptResult.primaryVersion);
      if (!primaryVersion) {
        logger.warn('No primary version found for prompt', { agentType, operation, primaryVersion: promptResult.primaryVersion });
        return null;
      }

      // Extract variables from template (simple pattern matching)
      const variables = this.extractVariables(primaryVersion.template);

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
      
      logger.error(`💥 MongoDB query failed for ${operation}`, {
        agentType,
        operation,
        error: errorMessage,
        ...(errorStack && { stack: errorStack })
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
  duration: number,
  success: boolean = true
) {
  logger.debug(`📊 Prompt usage tracked | Agent: ${agentType} | Source: ${source} | Duration: ${duration}ms`);
}