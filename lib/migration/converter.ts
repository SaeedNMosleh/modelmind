import { Types } from 'mongoose';
import { ExtractedPrompt } from './extractor';
import { 
  IPrompt, 
  DiagramType, 
  AgentType, 
  PromptOperation, 
  PromptEnvironment 
} from '../database/types';

/**
 * Convert extracted prompts to database format
 */
export function convertExtractedPromptToDatabase(
  extracted: ExtractedPrompt
): Omit<IPrompt, '_id' | 'createdAt' | 'updatedAt'> {
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
export function convertAllExtractedPrompts(extractedPrompts: ExtractedPrompt[]): Omit<IPrompt, '_id' | 'createdAt' | 'updatedAt'>[] {
  return extractedPrompts.map(extracted => convertExtractedPromptToDatabase(extracted));
}

/**
 * Create enhanced prompt templates for different diagram types
 */
export function createEnhancedPromptTemplates(): Omit<IPrompt, '_id' | 'createdAt' | 'updatedAt'>[] {
  const templates: Omit<IPrompt, '_id' | 'createdAt' | 'updatedAt'>[] = [];

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

User requirements: {userInput}

Guidelines for sequence diagrams:
- Use participants to define actors and systems
- Show message flow with arrows (-> for synchronous, ->> for asynchronous)
- Include activation boxes for processing time
- Use notes for clarifications
- Group related interactions with alt/opt/loop constructs
- Follow proper PlantUML syntax

{guidelines}

Create a detailed sequence diagram that accurately represents the interactions described.

{formatInstructions}`,
    variables: ['userInput', 'guidelines', 'formatInstructions'],
    agentType: AgentType.GENERATOR,
    diagramTypes: [DiagramType.SEQUENCE],
    operations: [PromptOperation.GENERATION],
    environment: PromptEnvironment.DEVELOPMENT,
    version: '1.0.0',
    isActive: true,
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
    description: 'Specialized generator for class diagrams with proper OOP modeling',
    template: `You are an expert in creating PlantUML class diagrams that model system structure and relationships.

User requirements: {userInput}

Guidelines for class diagrams:
- Define classes with proper visibility modifiers (+, -, #, ~)
- Include attributes and methods with types
- Show relationships: inheritance (--|>), composition (--*), aggregation (--o), association (--), dependency (..>)
- Use interfaces and abstract classes when appropriate
- Group related classes in packages
- Follow UML and PlantUML best practices

{guidelines}

Create a detailed class diagram that accurately represents the system structure described.

{formatInstructions}`,
    variables: ['userInput', 'guidelines', 'formatInstructions'],
    agentType: AgentType.GENERATOR,
    diagramTypes: [DiagramType.CLASS],
    operations: [PromptOperation.GENERATION],
    environment: PromptEnvironment.DEVELOPMENT,
    version: '1.0.0',
    isActive: true,
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
    description: 'Specialized generator for activity diagrams modeling workflows and processes',
    template: `You are an expert in creating PlantUML activity diagrams that model workflows and business processes.

User requirements: {userInput}

Guidelines for activity diagrams:
- Use start and end nodes for flow boundaries
- Include decision diamonds for branching logic
- Show parallel activities with fork/join
- Use swimlanes for different actors/systems
- Include notes for business rules and conditions
- Model exception handling with error flows
- Follow workflow modeling best practices

{guidelines}

Create a detailed activity diagram that accurately represents the process described.

{formatInstructions}`,
    variables: ['userInput', 'guidelines', 'formatInstructions'],
    agentType: AgentType.GENERATOR,
    diagramTypes: [DiagramType.ACTIVITY],
    operations: [PromptOperation.GENERATION],
    environment: PromptEnvironment.DEVELOPMENT,
    version: '1.0.0',
    isActive: true,
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
    description: 'Specialized generator for state diagrams modeling state transitions and behaviors',
    template: `You are an expert in creating PlantUML state diagrams that model state transitions and system behaviors.

User requirements: {userInput}

Guidelines for state diagrams:
- Define clear states with meaningful names
- Show transitions with triggers and guards
- Include entry/exit actions for states
- Use composite states for hierarchical modeling
- Model concurrent states with parallel regions
- Include initial and final states
- Follow state machine modeling principles

{guidelines}

Create a detailed state diagram that accurately represents the state behavior described.

{formatInstructions}`,
    variables: ['userInput', 'guidelines', 'formatInstructions'],
    agentType: AgentType.GENERATOR,
    diagramTypes: [DiagramType.STATE],
    operations: [PromptOperation.GENERATION],
    environment: PromptEnvironment.DEVELOPMENT,
    version: '1.0.0',
    isActive: true,
    metadata: {
      tags: ['state', 'generator', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  // Quality analyzer
  templates.push({
    name: 'diagram-quality-analyzer',
    description: 'Specialized analyzer for assessing diagram quality and best practices',
    template: `You are an expert in analyzing PlantUML diagrams for quality and best practices adherence.

Diagram to analyze:
\`\`\`plantuml
{diagram}
\`\`\`

Analysis focus: {analysisType}
Diagram type: {diagramType}

Quality assessment criteria:
- Syntax correctness and PlantUML compliance
- Clarity and readability of the diagram
- Proper use of diagram elements and relationships
- Adherence to UML and diagramming best practices
- Completeness relative to the domain being modeled
- Consistency in naming and styling

{guidelines}

Provide a comprehensive quality analysis with specific strengths, weaknesses, and improvement suggestions.

{formatInstructions}`,
    variables: ['diagram', 'analysisType', 'diagramType', 'guidelines', 'formatInstructions'],
    agentType: AgentType.ANALYZER,
    diagramTypes: [
      DiagramType.SEQUENCE,
      DiagramType.CLASS,
      DiagramType.ACTIVITY,
      DiagramType.STATE,
      DiagramType.COMPONENT,
      DiagramType.DEPLOYMENT,
      DiagramType.USE_CASE,
      DiagramType.ENTITY_RELATIONSHIP
    ],
    operations: [PromptOperation.ANALYSIS],
    environment: PromptEnvironment.DEVELOPMENT,
    version: '1.0.0',
    isActive: true,
    metadata: {
      tags: ['quality', 'analyzer', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  // Smart modifier
  templates.push({
    name: 'smart-diagram-modifier',
    description: 'Intelligent modifier that preserves diagram structure while implementing changes',
    template: `You are an expert in modifying PlantUML diagrams while preserving their structural integrity and style.

Current diagram:
\`\`\`plantuml
{currentDiagram}
\`\`\`

User modification request: {userInput}
Diagram type: {diagramType}

Modification principles:
- Preserve existing naming conventions and style
- Maintain structural relationships unless explicitly changed
- Add elements in appropriate locations
- Ensure syntax remains valid after changes
- Keep the diagram's overall purpose and clarity
- Make minimal changes to achieve the requested modifications

{guidelines}

Implement the requested changes while maintaining diagram quality and consistency.

{formatInstructions}`,
    variables: ['currentDiagram', 'userInput', 'diagramType', 'guidelines', 'formatInstructions'],
    agentType: AgentType.MODIFIER,
    diagramTypes: [
      DiagramType.SEQUENCE,
      DiagramType.CLASS,
      DiagramType.ACTIVITY,
      DiagramType.STATE,
      DiagramType.COMPONENT,
      DiagramType.DEPLOYMENT,
      DiagramType.USE_CASE,
      DiagramType.ENTITY_RELATIONSHIP
    ],
    operations: [PromptOperation.MODIFICATION],
    environment: PromptEnvironment.DEVELOPMENT,
    version: '1.0.0',
    isActive: true,
    metadata: {
      tags: ['smart', 'modifier', 'enhanced'],
      author: 'system-seeder',
      originalFile: 'seeder-enhanced',
      extractedAt: new Date()
    }
  });

  return templates;
}

/**
 * Create production-ready prompt variants
 */
export function createProductionPrompts(developmentPrompts: Omit<IPrompt, '_id' | 'createdAt' | 'updatedAt'>[]): Omit<IPrompt, '_id' | 'createdAt' | 'updatedAt'>[] {
  return developmentPrompts.map(prompt => ({
    ...prompt,
    name: `${prompt.name}-prod`,
    description: `${prompt.description} (Production variant)`,
    environment: PromptEnvironment.PRODUCTION,
    version: '1.0.0-prod',
    metadata: {
      ...prompt.metadata,
      tags: [...(prompt.metadata?.tags || []), 'production'],
      parentPrompt: prompt.name
    }
  }));
}