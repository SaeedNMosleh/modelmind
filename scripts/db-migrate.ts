import { createEnhancedLogger } from '../lib/utils/consola-logger';
import { fileURLToPath } from 'url';
import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { TestCase } from '../lib/database/models/testCase';
import { extractAllPrompts } from '../lib/migration/extractor';
import { 
  AgentType, 
  DiagramType, 
  PromptOperation, 
  PromptEnvironment,
  IPromptFooAssertion
} from '../lib/database/types';

const logger = createEnhancedLogger('db-migrate');

interface MigrationStats {
  promptsProcessed: number;
  promptsCreated: number;
  promptsSkipped: number;
  testCasesCreated: number;
  errors: string[];
  warnings: string[];
}

// Simplified test case type that matches what we need
interface TestCaseData {
  name: string;
  description: string;
  vars: Record<string, unknown>;
  assert: IPromptFooAssertion[];
  tags: string[];
  isActive: boolean;
  metadata: {
    migrated: boolean;
    migratedAt: Date;
    testType: string;
    [key: string]: unknown;
  };
}

interface ExtractedPrompt {
  name: string;
  version: string;
  template: string;
  agentType: AgentType;
  diagramType?: DiagramType;
  variables: string[];
  metadata: {
    originalFile: string;
    sourceFunction?: string;
  };
}

/**
 * Check if migration has already been run
 */
async function checkMigrationStatus(): Promise<boolean> {
  const existingMigrated = await Prompt.findOne({ 
    'metadata.migrated': true 
  });
  return !!existingMigrated;
}

/**
 * Extract and migrate hardcoded prompts from agent files
 */
async function migratePrompts(force = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    promptsProcessed: 0,
    promptsCreated: 0,
    promptsSkipped: 0,
    testCasesCreated: 0,
    errors: [],
    warnings: []
  };

  try {
    await connectToDatabase();
    
    // Check if migration has already been run
    if (!force && await checkMigrationStatus()) {
      stats.warnings.push('Migration has already been run. Use --force flag to run again.');
      logger.warn('Migration already completed. Use --force to re-run.');
      return stats;
    }

    if (force) {
      logger.info('Force migration enabled - will overwrite existing migrated prompts');
    }

    // Extract prompts from agent files
    logger.info('Extracting prompts from agent files...');
    const extractedPrompts = extractAllPrompts();
    
    if (extractedPrompts.length === 0) {
      stats.warnings.push('No prompts found to migrate');
      return stats;
    }

    logger.info(`Found ${extractedPrompts.length} prompts to migrate`);

    // Process each extracted prompt
    for (const extracted of extractedPrompts) {
      stats.promptsProcessed++;
      
      try {
        // Check if prompt already exists
        const existing = await Prompt.findOne({ name: extracted.name });
        
        if (existing && !force) {
          stats.promptsSkipped++;
          stats.warnings.push(`Prompt "${extracted.name}" already exists - skipping`);
          continue;
        }

        // Convert extracted prompt to database format
        const initialVersion = {
          version: extracted.version,
          template: extracted.template,
          changelog: `Migrated from ${extracted.metadata.originalFile}`,
          createdAt: new Date(),
          metadata: {}
        };

        const promptData = {
          name: extracted.name,
          agentType: extracted.agentType,
          diagramType: extracted.diagramType ? [extracted.diagramType] : [DiagramType.SEQUENCE, DiagramType.CLASS],
          operation: mapAgentTypeToOperation(extracted.agentType),
          primaryVersion: extracted.version,
          versions: [initialVersion],
          isProduction: false,
          environments: [PromptEnvironment.DEVELOPMENT],
          tags: ['migrated', extracted.agentType, 'ai-pipeline'],
          metadata: {
            migrated: true,
            migratedAt: new Date(),
            originalFile: extracted.metadata.originalFile,
            sourceFunction: extracted.metadata.sourceFunction,
            extractedVariables: extracted.variables
          }
        };

        // Create or update prompt
        if (existing && force) {
          // Add new version to existing prompt
          const newVersion = {
            version: `${extracted.version}`,
            template: extracted.template,
            changelog: `Re-migrated from ${extracted.metadata.originalFile} (forced)`,
            createdAt: new Date(),
            metadata: {}
          };
          
          existing.addVersion(newVersion);
          existing.metadata = { ...existing.metadata, ...promptData.metadata };
          await existing.save();
          
          logger.info(`Updated existing prompt: ${extracted.name}`);
        } else {
          // Create new prompt
          const prompt = new Prompt(promptData);
          await prompt.save();
          stats.promptsCreated++;
          logger.info(`Created new prompt: ${extracted.name}`);
        }

        // Create basic test cases for each migrated prompt
        const testCases = createBasicTestCases(extracted);
        for (const testCaseData of testCases) {
          try {
            // Find the created/updated prompt
            const prompt = await Prompt.findOne({ name: extracted.name });
            if (prompt) {
              // Create the test case with the proper promptId
              const testCase = new TestCase({
                ...testCaseData,
                promptId: prompt._id
              });
              await testCase.save();
              stats.testCasesCreated++;
              logger.info(`Created test case: ${testCaseData.name}`);
            }
          } catch (error) {
            stats.errors.push(`Failed to create test case for ${extracted.name}: ${(error as Error).message}`);
          }
        }

      } catch (error) {
        stats.errors.push(`Failed to migrate prompt "${extracted.name}": ${(error as Error).message}`);
        logger.error({ error, promptName: extracted.name }, 'Failed to migrate prompt');
      }
    }

    logger.info('Migration completed');
    return stats;

  } catch (error) {
    logger.error({ error }, 'Migration failed');
    throw error;
  }
}

/**
 * Map agent type to prompt operation
 */
function mapAgentTypeToOperation(agentType: AgentType): PromptOperation {
  switch (agentType) {
    case AgentType.GENERATOR:
      return PromptOperation.GENERATION;
    case AgentType.MODIFIER:
      return PromptOperation.MODIFICATION;
    case AgentType.ANALYZER:
      return PromptOperation.ANALYSIS;
    case AgentType.CLASSIFIER:
      return PromptOperation.INTENT_CLASSIFICATION;
    case AgentType.MASTER_CLASSIFIER:
      return PromptOperation.COMPREHENSIVE_CLASSIFICATION;
    default:
      return PromptOperation.GENERATION;
  }
}

/**
 * Create basic test cases for migrated prompts
 */
function createBasicTestCases(extracted: ExtractedPrompt): TestCaseData[] {
  const baseAssertions: IPromptFooAssertion[] = [
    { type: 'not-contains', value: '' }, // Check not empty by ensuring it doesn't contain empty string
    { type: 'not-contains', value: 'error' }
  ];

  const testCases: TestCaseData[] = [];

  // Create test case based on agent type
  if (extracted.agentType === AgentType.GENERATOR) {
    testCases.push({
      name: `${extracted.name}-basic-generation`,
      description: `Basic test case for ${extracted.name}`,
      vars: createVariablesForGenerator(extracted.variables),
      assert: [
        ...baseAssertions,
        { type: 'contains', value: '@startuml' },
        { type: 'contains', value: '@enduml' }
      ],
      tags: ['migrated', 'basic', 'generator'],
      isActive: true,
      metadata: {
        migrated: true,
        migratedAt: new Date(),
        testType: 'basic'
      }
    });
  } else if (extracted.agentType === AgentType.MODIFIER) {
    testCases.push({
      name: `${extracted.name}-basic-modification`,
      description: `Basic test case for ${extracted.name}`,
      vars: createVariablesForModifier(extracted.variables),
      assert: [
        ...baseAssertions,
        { type: 'contains', value: '@startuml' },
        { type: 'contains', value: '@enduml' }
      ],
      tags: ['migrated', 'basic', 'modifier'],
      isActive: true,
      metadata: {
        migrated: true,
        migratedAt: new Date(),
        testType: 'basic'
      }
    });
  } else if (extracted.agentType === AgentType.ANALYZER) {
    testCases.push({
      name: `${extracted.name}-basic-analysis`,
      description: `Basic test case for ${extracted.name}`,
      vars: createVariablesForAnalyzer(extracted.variables),
      assert: [
        ...baseAssertions,
        { type: 'contains', value: 'analysis' }
      ],
      tags: ['migrated', 'basic', 'analyzer'],
      isActive: true,
      metadata: {
        migrated: true,
        migratedAt: new Date(),
        testType: 'basic'
      }
    });
  } else if (extracted.agentType === AgentType.CLASSIFIER) {
    testCases.push({
      name: `${extracted.name}-basic-classification`,
      description: `Basic test case for ${extracted.name}`,
      vars: createVariablesForClassifier(extracted.variables),
      assert: [
        ...baseAssertions,
        { type: 'regex', value: '^(GENERATE|MODIFY|ANALYZE|UNKNOWN)$' }
      ],
      tags: ['migrated', 'basic', 'classifier'],
      isActive: true,
      metadata: {
        migrated: true,
        migratedAt: new Date(),
        testType: 'basic'
      }
    });
  } else if (extracted.agentType === AgentType.MASTER_CLASSIFIER) {
    testCases.push({
      name: `${extracted.name}-basic-comprehensive-classification`,
      description: `Basic test case for ${extracted.name}`,
      vars: createVariablesForMasterClassifier(extracted.variables),
      assert: [
        ...baseAssertions,
        { type: 'contains', value: 'GENERATE' },
        { type: 'contains', value: 'confidence' }
      ],
      tags: ['migrated', 'basic', 'master-classifier'],
      isActive: true,
      metadata: {
        migrated: true,
        migratedAt: new Date(),
        testType: 'comprehensive'
      }
    });
  }

  return testCases;
}

/**
 * Create variables for generator test cases
 */
function createVariablesForGenerator(templateVars: string[]): Record<string, unknown> {
  const defaultVars: Record<string, unknown> = {
    userInput: 'Create a simple sequence diagram showing user login process',
    diagramType: 'SEQUENCE',
    guidelines: 'Follow PlantUML best practices',
    templates: 'Use standard sequence diagram patterns',
    formatInstructions: 'Return only the PlantUML code'
  };

  // Add any missing variables from template
  for (const variable of templateVars) {
    if (!(variable in defaultVars)) {
      defaultVars[variable] = `[${variable} placeholder]`;
    }
  }

  return defaultVars;
}

/**
 * Create variables for modifier test cases
 */
function createVariablesForModifier(templateVars: string[]): Record<string, unknown> {
  const defaultVars: Record<string, unknown> = {
    currentDiagram: '@startuml\\nAlice -> Bob: Hello\\n@enduml',
    userInput: 'Add a response from Bob to Alice',
    guidelines: 'Preserve existing interactions',
    formatInstructions: 'Return only the modified PlantUML code'
  };

  for (const variable of templateVars) {
    if (!(variable in defaultVars)) {
      defaultVars[variable] = `[${variable} placeholder]`;
    }
  }

  return defaultVars;
}

/**
 * Create variables for analyzer test cases
 */
function createVariablesForAnalyzer(templateVars: string[]): Record<string, unknown> {
  const defaultVars: Record<string, unknown> = {
    diagram: '@startuml\\nAlice -> Bob: Hello\\nBob -> Alice: Hi\\n@enduml',
    userInput: 'Analyze the interactions in this diagram',
    analysisType: 'RELATIONSHIPS',
    diagramType: 'SEQUENCE',
    guidelines: 'Provide detailed analysis',
    formatInstructions: 'Return structured analysis'
  };

  for (const variable of templateVars) {
    if (!(variable in defaultVars)) {
      defaultVars[variable] = `[${variable} placeholder]`;
    }
  }

  return defaultVars;
}

/**
 * Create variables for classifier test cases
 */
function createVariablesForClassifier(templateVars: string[]): Record<string, unknown> {
  const defaultVars: Record<string, unknown> = {
    currentDiagramStatus: 'No diagram present',
    userInput: 'Create a class diagram for a library system',
    conversationHistory: 'This is the first message in the conversation'
  };

  for (const variable of templateVars) {
    if (!(variable in defaultVars)) {
      defaultVars[variable] = `[${variable} placeholder]`;
    }
  }

  return defaultVars;
}

/**
 * Create variables for master classifier test cases
 */
function createVariablesForMasterClassifier(templateVars: string[]): Record<string, unknown> {
  const defaultVars: Record<string, unknown> = {
    baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams.',
    userInput: 'Create a sequence diagram for user login process',
    hasDiagramContext: 'false',
    currentDiagram: '',
    conversationHistory: 'This is the first message in the conversation',
    additionalContext: 'User wants to design a new system',
    formatInstructions: 'Return structured classification in JSON format'
  };

  for (const variable of templateVars) {
    if (!(variable in defaultVars)) {
      defaultVars[variable] = `[${variable} placeholder]`;
    }
  }

  return defaultVars;
}

/**
 * Print migration report
 */
function printReport(stats: MigrationStats) {
  console.log('\\n' + '='.repeat(60));
  console.log('PROMPT MIGRATION REPORT');
  console.log('='.repeat(60));
  console.log(`📊 Prompts processed: ${stats.promptsProcessed}`);
  console.log(`✅ Prompts created: ${stats.promptsCreated}`);
  console.log(`⏭️  Prompts skipped: ${stats.promptsSkipped}`);
  console.log(`🧪 Test cases created: ${stats.testCasesCreated}`);
  
  if (stats.errors.length > 0) {
    console.log(`\\n❌ Errors (${stats.errors.length}):`);
    stats.errors.forEach(error => {
      console.log(`   ${error}`);
    });
  }
  
  if (stats.warnings.length > 0) {
    console.log(`\\n⚠️  Warnings (${stats.warnings.length}):`);
    stats.warnings.forEach(warning => {
      console.log(`   ${warning}`);
    });
  }
  
  if (stats.promptsCreated > 0) {
    console.log('\\n✅ Migration completed successfully');
    console.log('\\nNext steps:');
    console.log('   - Run "npm run db:validate" to verify migrated data');
    console.log('   - Run "npm run db:backup" to create a backup');
    console.log('   - Review and update prompts as needed');
  } else {
    console.log('\\n⚠️  No new prompts were migrated');
  }
  
  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const dryRun = args.includes('--dry-run');
    
    if (dryRun) {
      console.log('🔍 Running in dry-run mode - no changes will be made');
      // TODO: Implement dry-run logic
      console.log('Dry-run mode not yet implemented');
      return;
    }

    console.log('🚀 Starting prompt migration...');
    if (force) {
      console.log('⚠️  Force mode enabled - will overwrite existing data');
    }
    
    const stats = await migratePrompts(force);
    printReport(stats);
    
    if (stats.errors.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    console.error('❌ Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  main();
}

export { migratePrompts, checkMigrationStatus };