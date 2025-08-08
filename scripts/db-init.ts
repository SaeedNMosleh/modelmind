#!/usr/bin/env tsx

import { createEnhancedLogger } from '../lib/utils/consola-logger';
import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { TestCase } from '../lib/database/models/testCase';
import { TestResult } from '../lib/database/models/testResult';
import { PromptMetrics } from '../lib/database/models/promptMetrics';
import { 
  AgentType, 
  DiagramType, 
  PromptOperation, 
  PromptEnvironment,
  IPromptFooAssertion
} from '../lib/database/types';
import { Types } from 'mongoose';

// Define a simpler interface for creating test cases without the Document methods
interface TestCaseTemplate {
  promptId: Types.ObjectId;
  name: string;
  description: string;
  vars: Record<string, unknown>;
  assert: IPromptFooAssertion[];
  tags: string[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

const logger = createEnhancedLogger('db-init');

interface InitStats {
  prompts: number;
  testCases: number;
  indexes: number;
  warnings: string[];
}

/**
 * Initialize MongoDB collections with empty prompt templates and basic structure
 */
async function initializeCollections(): Promise<InitStats> {
  const stats: InitStats = {
    prompts: 0,
    testCases: 0,
    indexes: 0,
    warnings: []
  };

  try {
    await connectToDatabase();
    logger.info('Connected to database, starting initialization...');

    // Check for existing data
    const existingPrompts = await Prompt.countDocuments();
    const existingTestCases = await TestCase.countDocuments();
    const existingTestResults = await TestResult.countDocuments();
    const existingMetrics = await PromptMetrics.countDocuments();

    if (existingPrompts > 0 || existingTestCases > 0 || existingTestResults > 0 || existingMetrics > 0) {
      stats.warnings.push(
        `Database contains existing data: ${existingPrompts} prompts, ${existingTestCases} test cases, ${existingTestResults} test results, ${existingMetrics} metrics records`
      );
      logger.warn('Database contains existing data - initialization will add to existing records');
    }

    // Create empty prompt templates for each agent type
    const promptTemplates = createPromptTemplates();
    
    for (const template of promptTemplates) {
      try {
        // Check if prompt with same name already exists
        const existing = await Prompt.findOne({ name: template.name });
        if (existing) {
          stats.warnings.push(`Prompt "${template.name}" already exists - skipping`);
          continue;
        }

        const prompt = new Prompt(template);
        await prompt.save();
        stats.prompts++;
        logger.info(`Created prompt template: ${template.name}`);
      } catch (error) {
        logger.error({ error, promptName: template.name }, 'Failed to create prompt template');
        stats.warnings.push(`Failed to create prompt "${template.name}": ${(error as Error).message}`);
      }
    }

    // Create sample test case templates
    const testCaseTemplates = await createTestCaseTemplates();
    
    for (const template of testCaseTemplates) {
      try {
        const testCase = new TestCase(template);
        await testCase.save();
        stats.testCases++;
        logger.info(`Created test case template: ${template.name}`);
      } catch (error) {
        logger.error({ error, testCaseName: template.name }, 'Failed to create test case template');
        stats.warnings.push(`Failed to create test case "${template.name}": ${(error as Error).message}`);
      }
    }

    // Initialize empty metrics collection structure (no records, just ensure collection exists)
    const metricsCollection = PromptMetrics.collection;
    await metricsCollection.createIndex(
      { promptId: 1, promptVersion: 1, period: 1, timestamp: 1 } as Record<string, number>,
      { background: true }
    );
    stats.indexes++;

    // Create additional useful indexes
    const indexes = [
      { collection: Prompt.collection, index: { name: 1 } as Record<string, number>, options: { unique: true, background: true } },
      { collection: Prompt.collection, index: { agentType: 1, diagramType: 1 } as Record<string, number>, options: { background: true } },
      { collection: Prompt.collection, index: { isProduction: 1 } as Record<string, number>, options: { background: true } },
      { collection: TestCase.collection, index: { promptId: 1 } as Record<string, number>, options: { background: true } },
      { collection: TestCase.collection, index: { isActive: 1 } as Record<string, number>, options: { background: true } },
      { collection: TestResult.collection, index: { promptId: 1, promptVersion: 1 } as Record<string, number>, options: { background: true } },
      { collection: TestResult.collection, index: { createdAt: -1 } as Record<string, number>, options: { background: true } }
    ];

    for (const { collection, index, options } of indexes) {
      try {
        await collection.createIndex(index, options);
        stats.indexes++;
      } catch (error) {
        // Index might already exist, that's okay
        logger.debug({ error }, 'Index creation skipped (might already exist)');
      }
    }

    logger.info('Database initialization completed successfully');
    return stats;

  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    throw error;
  }
}

/**
 * Create empty prompt templates for each agent type
 * Updated to match the new unified architecture from embedded.ts
 */
function createPromptTemplates() {
  const baseMetadata = {
    initialized: true,
    initializedAt: new Date(),
    source: 'db-init'
  };

  return [
    // Master Classifier - NEW UNIFIED APPROACH
    {
      name: 'master-classifier-comprehensive-template',
      agentType: AgentType.MASTER_CLASSIFIER,
      diagramType: [
        DiagramType.SEQUENCE, 
        DiagramType.CLASS, 
        DiagramType.ACTIVITY, 
        DiagramType.STATE,
        DiagramType.COMPONENT,
        DiagramType.DEPLOYMENT,
        DiagramType.USE_CASE,
        DiagramType.ENTITY_RELATIONSHIP,
        DiagramType.UNKNOWN
      ],
      operation: PromptOperation.COMPREHENSIVE_CLASSIFICATION,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'master-classifier', 'comprehensive'],
      versions: [{
        version: '1.0.0',
        template: `{baseSystemPrompt}

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
- If unsure, be honest about low confidence rather than guessing`,
        changelog: 'Initial unified master classifier template',
        metadata: { ...baseMetadata }
      }],
      primaryVersion: '1.0.0',
      metadata: { ...baseMetadata }
    },
    // Generator - SIMPLIFIED (no type detection needed)
    {
      name: 'generator-main-template',
      agentType: AgentType.GENERATOR,
      diagramType: [
        DiagramType.SEQUENCE, 
        DiagramType.CLASS, 
        DiagramType.ACTIVITY, 
        DiagramType.STATE,
        DiagramType.COMPONENT,
        DiagramType.DEPLOYMENT,
        DiagramType.USE_CASE,
        DiagramType.ENTITY_RELATIONSHIP
      ],
      operation: PromptOperation.GENERATION,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'generator', 'main'],
      versions: [{
        version: '1.0.0',
        template: `{baseSystemPrompt}

You are a specialist in creating PlantUML diagrams based on user requirements.

User requirements: {userInput}

Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Available Templates:
{templates}

Based on the requirements, create a detailed PlantUML diagram.
Focus on clarity, proper syntax, and following best practices.

{formatInstructions}`,
        changelog: 'Simplified template for diagram generation (no type detection needed)',
        metadata: { ...baseMetadata }
      }],
      primaryVersion: '1.0.0',
      metadata: { ...baseMetadata }
    },
    // Modifier - SIMPLIFIED (no type detection needed)
    {
      name: 'modifier-main-template',
      agentType: AgentType.MODIFIER,
      diagramType: [
        DiagramType.SEQUENCE, 
        DiagramType.CLASS, 
        DiagramType.ACTIVITY, 
        DiagramType.STATE,
        DiagramType.COMPONENT,
        DiagramType.DEPLOYMENT,
        DiagramType.USE_CASE,
        DiagramType.ENTITY_RELATIONSHIP
      ],
      operation: PromptOperation.MODIFICATION,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'modifier', 'main'],
      versions: [{
        version: '1.0.0',
        template: `{baseSystemPrompt}

You are a specialist in modifying PlantUML diagrams based on user instructions.

Current diagram:
\`\`\`plantuml
{currentDiagram}
\`\`\`

User modification request: {userInput}

Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Modify the diagram according to the user's instructions.
Preserve existing structure while implementing the requested changes.
Ensure the modified diagram uses correct PlantUML syntax.

{formatInstructions}`,
        changelog: 'Simplified template for diagram modification (no type detection needed)',
        metadata: { ...baseMetadata }
      }],
      primaryVersion: '1.0.0',
      metadata: { ...baseMetadata }
    },
    // Analyzer - SIMPLIFIED (no type detection needed)
    {
      name: 'analyzer-main-template',
      agentType: AgentType.ANALYZER,
      diagramType: [
        DiagramType.SEQUENCE, 
        DiagramType.CLASS, 
        DiagramType.ACTIVITY, 
        DiagramType.STATE,
        DiagramType.COMPONENT,
        DiagramType.DEPLOYMENT,
        DiagramType.USE_CASE,
        DiagramType.ENTITY_RELATIONSHIP
      ],
      operation: PromptOperation.ANALYSIS,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'analyzer', 'main'],
      versions: [{
        version: '1.0.0',
        template: `{baseSystemPrompt}

You are a specialist in analyzing PlantUML diagrams.

Diagram to analyze:
\`\`\`plantuml
{diagram}
\`\`\`

User analysis request: {userInput}

Analysis type: {analysisType}
Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Analyze the diagram based on the analysis type and user request.
Provide detailed and insightful analysis.

{formatInstructions}`,
        changelog: 'Simplified template for diagram analysis (no type detection needed)',
        metadata: { ...baseMetadata }
      }],
      primaryVersion: '1.0.0',
      metadata: { ...baseMetadata }
    }
  ];
}

/**
 * Create sample test case templates with proper PromptFoo format
 * Updated to match the new unified architecture from embedded.ts
 */
async function createTestCaseTemplates() {
  // Get the created prompts to reference their IDs
  const prompts = await Prompt.find({ 'metadata.initialized': true });
  const testCases: TestCaseTemplate[] = [];

  const baseAssertions: IPromptFooAssertion[] = [
    {
      type: 'contains',
      value: '@startuml'
    },
    {
      type: 'contains', 
      value: '@enduml'
    },
    {
      type: 'not-contains',
      value: 'error'
    }
  ];

  for (const prompt of prompts) {
    const baseTemplate = {
      promptId: prompt._id,
      description: `Sample test case for ${prompt.name}`,
      assert: [...baseAssertions],
      tags: ['template', 'sample', prompt.agentType],
      isActive: true,
      metadata: {
        initialized: true,
        initializedAt: new Date(),
        source: 'db-init'
      }
    };

    if (prompt.agentType === AgentType.MASTER_CLASSIFIER) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-generate-classification`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          userInput: 'Create a sequence diagram for user login process',
          hasDiagramContext: 'false',
          currentDiagram: '',
          conversationHistory: 'This is the first message in the conversation',
          additionalContext: 'User wants to design a new system',
          formatInstructions: 'Return structured classification in JSON format'
        },
        assert: [
          {
            type: 'contains',
            value: 'GENERATE'
          },
          {
            type: 'contains',
            value: 'SEQUENCE'
          }
        ]
      });

      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-modify-classification`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          userInput: 'Add error handling to the existing diagram',
          hasDiagramContext: 'true',
          currentDiagram: '@startuml\\nAlice -> Bob: Login\\n@enduml',
          conversationHistory: 'Previous messages about login flow',
          additionalContext: 'User wants to enhance existing diagram',
          formatInstructions: 'Return structured classification in JSON format'
        },
        assert: [
          {
            type: 'contains',
            value: 'MODIFY'
          }
        ]
      });

      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-analyze-classification`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          userInput: 'Explain the interactions in this diagram',
          hasDiagramContext: 'true',
          currentDiagram: '@startuml\\nAlice -> Bob: Login\\nBob -> Database: Validate\\n@enduml',
          conversationHistory: 'User uploaded a diagram',
          additionalContext: 'User wants to understand the diagram',
          formatInstructions: 'Return structured classification in JSON format'
        },
        assert: [
          {
            type: 'contains',
            value: 'ANALYZE'
          }
        ]
      });
    } else if (prompt.agentType === AgentType.GENERATOR) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-sequence`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          userInput: 'Create a sequence diagram for user login process',
          diagramType: 'SEQUENCE',
          guidelines: 'Follow PlantUML best practices for sequence diagrams',
          templates: 'Use standard sequence diagram patterns',
          formatInstructions: 'Return only the PlantUML code'
        }
      });

      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-class`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          userInput: 'Create a class diagram for a library management system',
          diagramType: 'CLASS',
          guidelines: 'Follow PlantUML best practices for class diagrams',
          templates: 'Use standard class diagram patterns',
          formatInstructions: 'Return only the PlantUML code'
        }
      });
    } else if (prompt.agentType === AgentType.MODIFIER) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-modify`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          currentDiagram: '@startuml\\nAlice -> Bob: Hello\\n@enduml',
          userInput: 'Add a response from Bob to Alice',
          diagramType: 'SEQUENCE',
          guidelines: 'Preserve existing interactions and follow PlantUML best practices',
          formatInstructions: 'Return only the modified PlantUML code'
        }
      });

      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-add-error-handling`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          currentDiagram: '@startuml\\nUser -> System: Login\\nSystem -> Database: Validate\\n@enduml',
          userInput: 'Add error handling for invalid credentials',
          diagramType: 'SEQUENCE',
          guidelines: 'Add proper error flows while maintaining existing structure',
          formatInstructions: 'Return only the modified PlantUML code'
        }
      });
    } else if (prompt.agentType === AgentType.ANALYZER) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-relationship-analysis`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          diagram: '@startuml\\nAlice -> Bob: Hello\\nBob -> Alice: Hi\\n@enduml',
          userInput: 'Analyze the relationships in this diagram',
          analysisType: 'RELATIONSHIPS',
          diagramType: 'SEQUENCE',
          guidelines: 'Provide detailed analysis of interactions and relationships',
          formatInstructions: 'Return structured analysis'
        },
        assert: [
          {
            type: 'contains',
            value: 'Alice'
          },
          {
            type: 'contains',
            value: 'Bob'
          },
          {
            type: 'contains',
            value: 'relationship'
          }
        ]
      });

      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-quality-analysis`,
        vars: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
          diagram: '@startuml\\nclass User {\\n  +login()\\n}\\nclass Database\\n@enduml',
          userInput: 'Assess the quality of this class diagram',
          analysisType: 'QUALITY',
          diagramType: 'CLASS',
          guidelines: 'Evaluate best practices and design quality',
          formatInstructions: 'Return structured quality assessment'
        },
        assert: [
          {
            type: 'contains',
            value: 'quality'
          },
          {
            type: 'contains',
            value: 'User'
          }
        ]
      });
    }
  }

  return testCases;
}

/**
 * Print initialization report
 */
function printReport(stats: InitStats) {
  console.log('\\n' + '='.repeat(60));
  console.log('DATABASE INITIALIZATION REPORT');
  console.log('='.repeat(60));
  console.log(`✓ Created ${stats.prompts} prompt templates`);
  console.log(`✓ Created ${stats.testCases} test case templates`);
  console.log(`✓ Created ${stats.indexes} database indexes`);
  
  if (stats.warnings.length > 0) {
    console.log(`\\n⚠️  Warnings:`);
    stats.warnings.forEach(warning => {
      console.log(`   ${warning}`);
    });
  }
  
  console.log('\\n✅ Database initialization completed successfully');
  console.log('\\nNext steps:');
  console.log('   - Run "npm run db:migrate" to import existing prompts');
  console.log('   - Run "npm run db:validate" to check data integrity');
  console.log('   - Run "npm run db:backup" to create a backup');
  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting database initialization...');
    
    const stats = await initializeCollections();
    printReport(stats);
    
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    console.error('❌ Database initialization failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (process.argv[1] === import.meta.url.substring(7)) {
  main();
}

export { initializeCollections, createPromptTemplates, createTestCaseTemplates };