import { ExtractedPrompt } from './extractor';
import { PromptSeedData } from './types';
import { 
  AgentType, 
  PromptOperation, 
  PromptEnvironment 
} from '../database/types';

// Import only the needed types, removing unused DiagramType import

/**
 * Convert extracted prompts to database format
 */
export function convertExtractedPromptToDatabase(
  extracted: ExtractedPrompt
): PromptSeedData {
  let operation: PromptOperation;
  switch (extracted.agentType) {
    case AgentType.GENERATOR:
      operation = PromptOperation.GENERATION;
      break;
    case AgentType.MODIFIER:
      operation = PromptOperation.MODIFICATION;
      break;
    case AgentType.ANALYZER:
      operation = PromptOperation.ANALYSIS;
      break;
    case AgentType.CLASSIFIER:
      operation = PromptOperation.INTENT_CLASSIFICATION;
      break;
    default:
      operation = PromptOperation.GENERATION;
  }

  return {
    name: extracted.name,
    agentType: extracted.agentType,
    diagramType: extracted.diagramType ? [extracted.diagramType] : [],
    operation,
    primaryVersion: extracted.version,
    versions: [{
      version: extracted.version,
      template: extracted.template,
      changelog: `Initial migration from AI pipeline. ${extracted.description}`,
      createdAt: extracted.metadata.extractedAt,
      metadata: extracted.metadata
    }],
    isProduction: false,
    environments: [PromptEnvironment.DEVELOPMENT],
    tags: ['migrated', 'ai-pipeline'],
    metadata: {
      ...extracted.metadata,
      author: 'system-migration'
    }
  };
}

/**
 * Convert multiple extracted prompts to database format
 */
export function convertAllExtractedPrompts(extractedPrompts: ExtractedPrompt[]): PromptSeedData[] {
  return extractedPrompts.map(extracted => convertExtractedPromptToDatabase(extracted));
}

/**
 * Create production-ready prompt variants
 */
export function createProductionPrompts(developmentPrompts: PromptSeedData[]): PromptSeedData[] {
  return developmentPrompts.map(prompt => ({
    ...prompt,
    name: `${prompt.name}-prod`,
    isProduction: true,
    environments: [PromptEnvironment.PRODUCTION],
    currentVersion: '1.0.0-prod',
    versions: prompt.versions.map(v => ({
      ...v,
      version: '1.0.0-prod',
      changelog: `${v.changelog} (Production variant)`
    })),
    metadata: {
      ...prompt.metadata,
      parentPrompt: prompt.name
    }
  }));
}