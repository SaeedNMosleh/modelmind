#!/usr/bin/env tsx

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
import pino from 'pino';

const logger = pino({ name: 'db-init' });

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
      { promptId: 1, promptVersion: 1, period: 1, timestamp: 1 },
      { background: true }
    );
    stats.indexes++;

    // Create additional useful indexes
    const indexes = [
      { collection: Prompt.collection, index: { name: 1 }, options: { unique: true, background: true } },
      { collection: Prompt.collection, index: { agentType: 1, diagramType: 1 }, options: { background: true } },
      { collection: Prompt.collection, index: { isProduction: 1 }, options: { background: true } },
      { collection: TestCase.collection, index: { promptId: 1 }, options: { background: true } },
      { collection: TestCase.collection, index: { isActive: 1 }, options: { background: true } },
      { collection: TestResult.collection, index: { promptId: 1, promptVersion: 1 }, options: { background: true } },
      { collection: TestResult.collection, index: { createdAt: -1 }, options: { background: true } }
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
 */
function createPromptTemplates() {
  const baseMetadata = {
    initialized: true,
    initializedAt: new Date(),
    source: 'db-init'
  };

  return [
    {
      name: 'generator-main-template',
      agentType: AgentType.GENERATOR,
      diagramType: [DiagramType.SEQUENCE, DiagramType.CLASS, DiagramType.ACTIVITY],
      operation: PromptOperation.GENERATION,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'generator', 'main'],
      versions: [{
        version: '1.0.0',
        template: `You are a specialist in creating PlantUML diagrams based on user requirements.

User requirements: {userInput}
Diagram type: {diagramType}

Guidelines:
{guidelines}

Available Templates:
{templates}

Based on the requirements, create a detailed PlantUML diagram.
Focus on clarity, proper syntax, and following best practices.

{formatInstructions}`,
        changelog: 'Initial template for diagram generation',
        isActive: true,
        metadata: { ...baseMetadata }
      }],
      currentVersion: '1.0.0',
      metadata: { ...baseMetadata }
    },
    {
      name: 'modifier-main-template',
      agentType: AgentType.MODIFIER,
      diagramType: [DiagramType.SEQUENCE, DiagramType.CLASS, DiagramType.ACTIVITY],
      operation: PromptOperation.MODIFICATION,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'modifier', 'main'],
      versions: [{
        version: '1.0.0',
        template: `You are a specialist in modifying PlantUML diagrams based on user instructions.

Current diagram:
\`\`\`plantuml
{currentDiagram}
\`\`\`

User modification request: {userInput}

Guidelines:
{guidelines}

Modify the diagram according to the user's instructions.
Preserve existing structure while implementing the requested changes.
Ensure the modified diagram uses correct PlantUML syntax.

{formatInstructions}`,
        changelog: 'Initial template for diagram modification',
        isActive: true,
        metadata: { ...baseMetadata }
      }],
      currentVersion: '1.0.0',
      metadata: { ...baseMetadata }
    },
    {
      name: 'analyzer-main-template',
      agentType: AgentType.ANALYZER,
      diagramType: [DiagramType.SEQUENCE, DiagramType.CLASS, DiagramType.ACTIVITY],
      operation: PromptOperation.ANALYSIS,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'analyzer', 'main'],
      versions: [{
        version: '1.0.0',
        template: `You are a specialist in analyzing PlantUML diagrams.

Diagram to analyze:
\`\`\`plantuml
{diagram}
\`\`\`

User analysis request: {userInput}
Analysis type: {analysisType}
Diagram type: {diagramType}

Guidelines:
{guidelines}

Analyze the diagram based on the analysis type and user request.
Provide detailed and insightful analysis.

{formatInstructions}`,
        changelog: 'Initial template for diagram analysis',
        isActive: true,
        metadata: { ...baseMetadata }
      }],
      currentVersion: '1.0.0',
      metadata: { ...baseMetadata }
    },
    {
      name: 'classifier-intent-template',
      agentType: AgentType.CLASSIFIER,
      diagramType: [DiagramType.SEQUENCE, DiagramType.CLASS, DiagramType.ACTIVITY],
      operation: PromptOperation.INTENT_CLASSIFICATION,
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['template', 'classifier', 'intent'],
      versions: [{
        version: '1.0.0',
        template: `Your task is to classify the user's intent regarding PlantUML diagrams.

Current diagram present: {currentDiagramStatus}
User request: {userInput}

{conversationHistory}

Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).

Return ONLY ONE WORD: GENERATE, MODIFY, ANALYZE, or UNKNOWN.

If you cannot clearly determine the user's intent, respond with UNKNOWN.`,
        changelog: 'Initial template for intent classification',
        isActive: true,
        metadata: { ...baseMetadata }
      }],
      currentVersion: '1.0.0',
      metadata: { ...baseMetadata }
    }
  ];
}

/**
 * Create sample test case templates with proper PromptFoo format
 */
async function createTestCaseTemplates() {
  // Get the created prompts to reference their IDs
  const prompts = await Prompt.find({ 'metadata.initialized': true });
  const testCases = [];

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

    if (prompt.agentType === AgentType.GENERATOR) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-sequence`,
        vars: {
          userInput: 'Create a sequence diagram for user login process',
          diagramType: 'SEQUENCE',
          guidelines: 'Follow PlantUML best practices',
          templates: 'Use standard sequence diagram patterns',
          formatInstructions: 'Return only the PlantUML code'
        }
      });
    } else if (prompt.agentType === AgentType.MODIFIER) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-modify`,
        vars: {
          currentDiagram: '@startuml\\nAlice -> Bob: Hello\\n@enduml',
          userInput: 'Add a response from Bob to Alice',
          guidelines: 'Preserve existing interactions',
          formatInstructions: 'Return only the modified PlantUML code'
        }
      });
    } else if (prompt.agentType === AgentType.ANALYZER) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-analysis`,
        vars: {
          diagram: '@startuml\\nAlice -> Bob: Hello\\nBob -> Alice: Hi\\n@enduml',
          userInput: 'Analyze the interactions in this diagram',
          analysisType: 'RELATIONSHIPS',
          diagramType: 'SEQUENCE',
          guidelines: 'Provide detailed analysis',
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
          }
        ]
      });
    } else if (prompt.agentType === AgentType.CLASSIFIER) {
      testCases.push({
        ...baseTemplate,
        name: `${prompt.name}-sample-classify`,
        vars: {
          currentDiagramStatus: 'No diagram present',
          userInput: 'Create a class diagram for a library system',
          conversationHistory: 'This is the first message in the conversation'
        },
        assert: [
          {
            type: 'equals',
            value: 'GENERATE'
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
if (require.main === module) {
  main();
}

export { initializeCollections, createPromptTemplates, createTestCaseTemplates };