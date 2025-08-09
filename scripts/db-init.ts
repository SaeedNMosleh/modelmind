#!/usr/bin/env tsx

import { createEnhancedLogger } from '../lib/utils/consola-logger';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { TestCase } from '../lib/database/models/testCase';
import { TestResult } from '../lib/database/models/testResult';
import { PromptMetrics } from '../lib/database/models/promptMetrics';

const logger = createEnhancedLogger('db-init');

interface InitStats {
  indexes: number;
  warnings: string[];
  operations: string[];
}

/**
 * Prompt user for confirmation
 */
function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Initialize MongoDB collections with empty structure
 */
async function initializeCollections(): Promise<InitStats> {
  const stats: InitStats = {
    indexes: 0,
    warnings: [],
    operations: []
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
      const totalExisting = existingPrompts + existingTestCases + existingTestResults + existingMetrics;
      console.log(`\n⚠️  Database contains existing data:`);
      console.log(`   - Prompts: ${existingPrompts}`);
      console.log(`   - Test Cases: ${existingTestCases}`);
      console.log(`   - Test Results: ${existingTestResults}`);
      console.log(`   - Prompt Metrics: ${existingMetrics}`);
      console.log(`   - Total Records: ${totalExisting}`);
      
      const confirmed = await askConfirmation('\nThis will DELETE ALL existing data and reset the database. Continue?');
      
      if (!confirmed) {
        console.log('❌ Initialization cancelled by user');
        stats.warnings.push('Initialization cancelled by user');
        return stats;
      }
      
      // Clear all existing data
      console.log('🗑️  Clearing existing data...');
      const deletions = await Promise.all([
        Prompt.deleteMany({}),
        TestCase.deleteMany({}),
        TestResult.deleteMany({}),
        PromptMetrics.deleteMany({})
      ]);
      
      const totalDeleted = deletions.reduce((sum, result) => sum + (result.deletedCount || 0), 0);
      console.log(`✅ Deleted ${totalDeleted} records`);
      stats.operations.push(`Deleted ${totalDeleted} existing records`);
    }

    // Just ensure collections exist by accessing them (they'll be created when indexes are added)
    logger.info('Ensuring collections exist...');
    console.log('✅ Empty collections ready');
    stats.operations.push('Empty collections will be created with indexes');

    // Create essential indexes
    const indexes = [
      { 
        collection: Prompt.collection, 
        index: { name: 1 } as Record<string, number>, 
        options: { unique: true, background: true },
        name: 'prompts.name'
      },
      { 
        collection: Prompt.collection, 
        index: { agentType: 1, diagramType: 1 } as Record<string, number>, 
        options: { background: true },
        name: 'prompts.agentType_diagramType'
      },
      { 
        collection: TestCase.collection, 
        index: { promptId: 1 } as Record<string, number>, 
        options: { background: true },
        name: 'testCases.promptId'
      },
      { 
        collection: TestResult.collection, 
        index: { promptId: 1, promptVersion: 1 } as Record<string, number>, 
        options: { background: true },
        name: 'testResults.promptId_promptVersion'
      },
      { 
        collection: PromptMetrics.collection, 
        index: { promptId: 1, promptVersion: 1, period: 1, timestamp: 1 } as Record<string, number>, 
        options: { background: true },
        name: 'promptMetrics.compound'
      }
    ];

    for (const { collection, index, options, name } of indexes) {
      try {
        await collection.createIndex(index, options);
        stats.indexes++;
        logger.info(`Created index: ${name}`);
      } catch (error) {
        // Index might already exist, that's okay
        logger.debug({ error }, `Index creation skipped for ${name}`);
      }
    }

    stats.operations.push(`Created ${stats.indexes} database indexes`);
    logger.info('Database initialization completed successfully');
    return stats;

  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    throw error;
  }
}

/**
 * Print initialization report
 */
function printReport(stats: InitStats) {
  console.log('\n' + '='.repeat(60));
  console.log('DATABASE INITIALIZATION REPORT');
  console.log('='.repeat(60));
  console.log(`✓ Created ${stats.indexes} database indexes`);
  
  if (stats.operations.length > 0) {
    console.log('\n📝 Operations performed:');
    stats.operations.forEach(op => {
      console.log(`   ${op}`);
    });
  }
  
  if (stats.warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    stats.warnings.forEach(warning => {
      console.log(`   ${warning}`);
    });
  }
  
  if (stats.warnings.length === 0) {
    console.log('\n✅ Database initialization completed successfully');
    console.log('\nNext steps:');
    console.log('   - Run "npm run db:migrate" to import prompts from code');
    console.log('   - Run "npm run db:validate" to check data integrity');
    console.log('   - Run "npm run db:backup" to create a backup');
  }
  
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
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  main();
}

export { initializeCollections };