/**
 * Types for the prompt engineering system
 */

import { DiagramType } from '../knowledge/guidelines';


/**
 * Type of agent that will use the prompt
 */
export enum AgentType {
  GENERATOR = 'generator',
  MODIFIER = 'modifier',
  ANALYZER = 'analyzer',
  CLASSIFIER = 'classifier',
}

/**
 * Type of operation the prompt is designed for
 */
export enum PromptOperation {
  GENERATION = 'generation',
  MODIFICATION = 'modification',
  ANALYSIS = 'analysis',
  INTENT_CLASSIFICATION = 'intent-classification',
  ERROR_CORRECTION = 'error-correction',
  EXPLANATION = 'explanation',
}

/**
 * Environment where the prompt is active
 */
export enum PromptEnvironment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Metadata for a prompt template
 */
export interface PromptMetadata {
  /** Unique identifier for the prompt */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Agent type that uses this prompt */
  agentType: AgentType;
  
  /** Diagram type this prompt handles (if applicable) */
  diagramType?: DiagramType;
  
  /** Operation this prompt is designed for */
  operation: PromptOperation;
  
  /** Semantic version of the prompt */
  version: string;
  
  /** Author of the prompt */
  author?: string;
  
  /** When the prompt was created */
  createdAt: Date;
  
  /** When the prompt was last modified */
  updatedAt: Date;
  
  /** Brief description of the prompt's purpose */
  description: string;
  
  /** Is this prompt active in production */
  isProduction: boolean;
  
  /** Traffic allocation percentage (0-100) */
  trafficAllocation: number;
  
  /** Environments where this prompt is active */
  environments: PromptEnvironment[];
  
  /** Tags for categorization and search */
  tags: string[];
  
  /** Reference to related prompts (e.g., earlier versions, alternatives) */
  relatedPrompts?: string[];
  
  /** Custom properties for specific use cases */
  properties?: Record<string, unknown>;
}

/**
 * Complete prompt template with content and metadata
 */
export interface PromptTemplate {
  /** Metadata about the prompt */
  metadata: PromptMetadata;
  
  /** The actual prompt template content */
  template: string;
  
  /** Optional examples for few-shot learning */
  examples?: Array<{
    input: Record<string, string>;
    output: string;
  }>;
}