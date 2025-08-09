/* eslint-disable */
/* TODO: Continue improving type handling with the database models */

import { Types } from 'mongoose';
import { ExtractedPrompt } from './extractor';
import { 
  IPrompt, 
  DiagramType, 
  AgentType, 
  PromptOperation, 
  IPromptVersion
} from '../database/types';

// Define types for database conversion to avoid Mongoose Document interface issues
export type SimplifiedPrompt = {
  name: string;
  agentType: AgentType;
  diagramType: (DiagramType | string)[];
  operation: PromptOperation;
  currentVersion: string;
  versions: SimplifiedPromptVersion[];
  isProduction: boolean;
  tags: string[];
  description?: string;
  environment?: 'production' | 'development';
  version?: string;
  metadata?: {
    [key: string]: any;
    tags?: string[];
    author?: string;
    originalFile?: string;
    extractedAt?: Date;
    sourceFunction?: string;
    parentPrompt?: string;
  };
};

export type SimplifiedPromptVersion = {
  version: string;
  template: string;
  changelog: string;
  createdAt: Date;
  isActive: boolean;
  variables?: string[];
  metadata?: Record<string, any>;
};

// Add missing enum values that are used in this file
enum ExtendedDiagramType {
  DEPLOYMENT = 'deployment',
  ENTITY_RELATIONSHIP = 'entity-relationship'
}

/**
 * Convert extracted prompts to database format
 */
export function convertExtractedPromptToDatabase(
  extracted: ExtractedPrompt
): SimplifiedPrompt {
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
    currentVersion: extracted.version,
    versions: [{
      version: extracted.version,
      template: extracted.template,
      changelog: `Initial migration from AI pipeline. ${extracted.description}`,
      createdAt: extracted.metadata.extractedAt,
      isActive: extracted.isActive,
      variables: extracted.variables,
      metadata: extracted.metadata
    } as SimplifiedPromptVersion],
    isProduction: false,
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
export function convertAllExtractedPrompts(extractedPrompts: ExtractedPrompt[]): SimplifiedPrompt[] {
  return extractedPrompts.map(extracted => convertExtractedPromptToDatabase(extracted));
}

/**
 * Create enhanced prompt templates for different diagram types
 */
export function createEnhancedPromptTemplates(): SimplifiedPrompt[] {
  const templates: SimplifiedPrompt[] = [];

  // Sequence diagram generator
  templates.push({
    name: 'sequence-diagram-generator',
    agentType: AgentType.GENERATOR,
    diagramType: [DiagramType.SEQUENCE],
    operation: PromptOperation.GENERATION,
    currentVersion: '1.0.0',
    versions: [{
      version: '1.0.0',
      template: `You are an expert in creating PlantUML sequence diagrams that model interactions between components over time.

{userInput}

{guidelines}

Create a detailed sequence diagram that accurately represents the interactions described.

{formatInstructions}`,
      variables: ['userInput', 'guidelines', 'formatInstructions'],
      isActive: true,
      createdAt: new Date(),
      changelog: 'Initial enhanced sequence diagram generator'
    } as SimplifiedPromptVersion],
    description: 'Specialized generator for sequence diagrams with proper interaction modeling',
    isProduction: false,
    tags: ['sequence', 'generator', 'enhanced'],
    metadata: {
      tags: ['sequence', 'generator', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  // Class diagram generator
  templates.push({
    name: 'class-diagram-generator',
    agentType: AgentType.GENERATOR,
    diagramType: [DiagramType.CLASS],
    operation: PromptOperation.GENERATION,
    currentVersion: '1.0.0',
    versions: [{
      version: '1.0.0',
      template: `You are an expert in creating PlantUML class diagrams that model object-oriented structures and relationships.

{userInput}

{guidelines}

Create a detailed class diagram that accurately represents the object-oriented design described.

{formatInstructions}`,
      variables: ['userInput', 'guidelines', 'formatInstructions'],
      isActive: true,
      createdAt: new Date(),
      changelog: 'Initial enhanced class diagram generator'
    } as SimplifiedPromptVersion],
    description: 'Specialized generator for class diagrams with proper OOP modeling',
    isProduction: false,
    tags: ['class', 'generator', 'enhanced'],
    metadata: {
      tags: ['class', 'generator', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  // Activity diagram generator
  templates.push({
    name: 'activity-diagram-generator',
    agentType: AgentType.GENERATOR,
    diagramType: [DiagramType.ACTIVITY],
    operation: PromptOperation.GENERATION,
    currentVersion: '1.0.0',
    versions: [{
      version: '1.0.0',
      template: `You are an expert in creating PlantUML activity diagrams that model workflows and processes.

{userInput}

{guidelines}

Create a detailed activity diagram that accurately represents the workflow or process described.

{formatInstructions}`,
      variables: ['userInput', 'guidelines', 'formatInstructions'],
      isActive: true,
      createdAt: new Date(),
      changelog: 'Initial enhanced activity diagram generator'
    } as SimplifiedPromptVersion],
    description: 'Specialized generator for activity diagrams modeling workflows and processes',
    isProduction: false,
    tags: ['activity', 'generator', 'enhanced'],
    metadata: {
      tags: ['activity', 'generator', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  // State diagram generator
  templates.push({
    name: 'state-diagram-generator',
    agentType: AgentType.GENERATOR,
    diagramType: [DiagramType.STATE],
    operation: PromptOperation.GENERATION,
    currentVersion: '1.0.0',
    versions: [{
      version: '1.0.0',
      template: `You are an expert in creating PlantUML state diagrams that model states and transitions.

{userInput}

{guidelines}

Create a detailed state diagram that accurately represents the states and transitions described.

{formatInstructions}`,
      variables: ['userInput', 'guidelines', 'formatInstructions'],
      isActive: true,
      createdAt: new Date(),
      changelog: 'Initial enhanced state diagram generator'
    } as SimplifiedPromptVersion],
    description: 'Specialized generator for state diagrams modeling state transitions and behaviors',
    isProduction: false,
    tags: ['state', 'generator', 'enhanced'],
    metadata: {
      tags: ['state', 'generator', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  // Diagram analyzer
  templates.push({
    name: 'diagram-analyzer',
    agentType: AgentType.ANALYZER,
    diagramType: [
      DiagramType.SEQUENCE,
      DiagramType.CLASS,
      DiagramType.ACTIVITY,
      DiagramType.STATE,
      DiagramType.COMPONENT,
      DiagramType.USE_CASE,
      ExtendedDiagramType.DEPLOYMENT as string,
      ExtendedDiagramType.ENTITY_RELATIONSHIP as string
    ],
    operation: PromptOperation.ANALYSIS,
    currentVersion: '1.0.0',
    versions: [{
      version: '1.0.0',
      template: `You are an expert in analyzing UML diagrams for quality, correctness, and best practices.

{diagram}

Analyze this {diagramType} diagram for the following aspects: {analysisType}

{guidelines}

Provide a comprehensive quality analysis with specific strengths, weaknesses, and improvement suggestions.

{formatInstructions}`,
      variables: ['diagram', 'analysisType', 'diagramType', 'guidelines', 'formatInstructions'],
      isActive: true,
      createdAt: new Date(),
      changelog: 'Initial enhanced diagram analyzer'
    } as SimplifiedPromptVersion],
    description: 'Specialized analyzer for assessing diagram quality and best practices',
    isProduction: false,
    tags: ['analyzer', 'quality', 'enhanced'],
    metadata: {
      tags: ['analyzer', 'quality', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  // Diagram modifier
  templates.push({
    name: 'diagram-modifier',
    agentType: AgentType.MODIFIER,
    diagramType: [
      DiagramType.SEQUENCE,
      DiagramType.CLASS,
      DiagramType.ACTIVITY,
      DiagramType.STATE,
      DiagramType.COMPONENT,
      DiagramType.USE_CASE,
      ExtendedDiagramType.DEPLOYMENT as string,
      ExtendedDiagramType.ENTITY_RELATIONSHIP as string
    ],
    operation: PromptOperation.MODIFICATION,
    currentVersion: '1.0.0',
    versions: [{
      version: '1.0.0',
      template: `You are an expert in modifying and improving UML diagrams while preserving their structure and intent.

{diagram}

Apply the following changes to this {diagramType} diagram: {changes}

{guidelines}

Provide the updated diagram with the requested changes carefully implemented.

{formatInstructions}`,
      variables: ['diagram', 'changes', 'diagramType', 'guidelines', 'formatInstructions'],
      isActive: true,
      createdAt: new Date(),
      changelog: 'Initial enhanced diagram modifier'
    } as SimplifiedPromptVersion],
    description: 'Intelligent modifier that preserves diagram structure while implementing changes',
    isProduction: false,
    tags: ['modifier', 'enhancement', 'advanced'],
    metadata: {
      tags: ['modifier', 'enhancement', 'advanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  return templates;
}

/**
 * Generate production variants of the prompts
 */
export function generateProductionPrompts(prompts: SimplifiedPrompt[]): SimplifiedPrompt[] {
  return prompts.map(prompt => ({
    name: `${prompt.name}-production`,
    agentType: prompt.agentType,
    diagramType: prompt.diagramType,
    operation: prompt.operation,
    currentVersion: '1.0.0-prod',
    versions: [...prompt.versions],
    isProduction: true,
    tags: [...(prompt.tags || []), 'production'],
    description: `${prompt.description} (Production variant)`,
    environment: 'production',
    version: '1.0.0-prod',
    metadata: {
      ...prompt.metadata,
      tags: [...(prompt.metadata?.tags || []), 'production'],
      parentPrompt: prompt.name
    }
  }));
}
