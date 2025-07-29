#!/usr/bin/env tsx

import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { TestCase } from '../lib/database/models/testCase';
import { TestResult } from '../lib/database/models/testResult';
import { PromptMetrics } from '../lib/database/models/promptMetrics';
import { initializeCollections } from './db-init';
import pino from 'pino';
import readline from 'readline';

const logger = pino({ name: 'db-reset' });

interface ResetStats {
  collectionsDropped: number;
  recordsDeleted: {
    prompts: number;
    testCases: number;
    testResults: number;
    promptMetrics: number;
  };
  indexesRecreated: number;
  initializationRun: boolean;
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
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Get current database statistics
 */
async function getDatabaseStats() {
  const [prompts, testCases, testResults, promptMetrics] = await Promise.all([
    Prompt.countDocuments(),
    TestCase.countDocuments(),
    TestResult.countDocuments(),
    PromptMetrics.countDocuments()
  ]);

  return { prompts, testCases, testResults, promptMetrics };
}

/**
 * Drop all prompt-related collections
 */
async function dropCollections(stats: ResetStats): Promise<void> {
  logger.info('Dropping collections...');
  
  const collections = [
    { name: 'prompts', model: Prompt },
    { name: 'testcases', model: TestCase },
    { name: 'testresults', model: TestResult },
    { name: 'promptmetrics', model: PromptMetrics }
  ];

  for (const { name, model } of collections) {
    try {
      await model.collection.drop();
      stats.collectionsDropped++;
      stats.operations.push(`Dropped collection: ${name}`);
      console.log(`✅ Dropped collection: ${name}`);
    } catch (error) {
      // Collection might not exist, that's okay
      const err = error as Error;
      if (err.message.includes('ns not found')) {
        stats.operations.push(`Collection ${name} did not exist`);
        console.log(`ℹ️  Collection ${name} did not exist`);
      } else {
        logger.warn({ error }, `Failed to drop collection ${name}`);
        stats.operations.push(`Failed to drop collection ${name}: ${err.message}`);
      }
    }
  }
}

/**
 * Delete all records (alternative to dropping collections)
 */
async function deleteAllRecords(stats: ResetStats): Promise<void> {
  logger.info('Deleting all records...');
  
  const deletions = await Promise.all([
    Prompt.deleteMany({}),
    TestCase.deleteMany({}),
    TestResult.deleteMany({}),
    PromptMetrics.deleteMany({})
  ]);

  stats.recordsDeleted.prompts = deletions[0].deletedCount || 0;
  stats.recordsDeleted.testCases = deletions[1].deletedCount || 0;
  stats.recordsDeleted.testResults = deletions[2].deletedCount || 0;
  stats.recordsDeleted.promptMetrics = deletions[3].deletedCount || 0;

  const totalDeleted = Object.values(stats.recordsDeleted).reduce((sum, count) => sum + count, 0);
  
  stats.operations.push(`Deleted ${totalDeleted} total records`);
  stats.operations.push(`  - Prompts: ${stats.recordsDeleted.prompts}`);
  stats.operations.push(`  - Test Cases: ${stats.recordsDeleted.testCases}`);
  stats.operations.push(`  - Test Results: ${stats.recordsDeleted.testResults}`);
  stats.operations.push(`  - Prompt Metrics: ${stats.recordsDeleted.promptMetrics}`);
  
  console.log(`✅ Deleted ${totalDeleted} records across all collections`);
}

/**
 * Recreate collection indexes
 */
async function recreateIndexes(stats: ResetStats): Promise<void> {
  logger.info('Recreating indexes...');
  
  const indexes = [
    { 
      collection: Prompt.collection, 
      index: { name: 1 }, 
      options: { unique: true, background: true },
      name: 'prompts.name'
    },
    { 
      collection: Prompt.collection, 
      index: { agentType: 1, diagramType: 1 }, 
      options: { background: true },
      name: 'prompts.agentType_diagramType'
    },
    { 
      collection: Prompt.collection, 
      index: { isProduction: 1 }, 
      options: { background: true },
      name: 'prompts.isProduction'
    },
    { 
      collection: TestCase.collection, 
      index: { promptId: 1 }, 
      options: { background: true },
      name: 'testCases.promptId'
    },
    { 
      collection: TestCase.collection, 
      index: { isActive: 1 }, 
      options: { background: true },
      name: 'testCases.isActive'
    },
    { 
      collection: TestResult.collection, 
      index: { promptId: 1, promptVersion: 1 }, 
      options: { background: true },
      name: 'testResults.promptId_promptVersion'
    },
    { 
      collection: TestResult.collection, 
      index: { createdAt: -1 }, 
      options: { background: true },
      name: 'testResults.createdAt'
    },
    { 
      collection: PromptMetrics.collection, 
      index: { promptId: 1, promptVersion: 1, period: 1, timestamp: 1 }, 
      options: { background: true },
      name: 'promptMetrics.compound'
    }
  ];

  for (const { collection, index, options, name } of indexes) {
    try {
      await collection.createIndex(index, options);
      stats.indexesRecreated++;
      stats.operations.push(`Created index: ${name}`);
      console.log(`✅ Created index: ${name}`);
    } catch (error) {
      // Index might already exist, that's usually okay
      logger.debug({ error }, `Index creation skipped for ${name}`);
    }
  }
}

/**
 * Reset database completely
 */
async function resetDatabase(
  runInitialization = false,
  skipConfirmation = false
): Promise<ResetStats> {
  const stats: ResetStats = {
    collectionsDropped: 0,
    recordsDeleted: {
      prompts: 0,
      testCases: 0,
      testResults: 0,
      promptMetrics: 0
    },
    indexesRecreated: 0,
    initializationRun: false,
    operations: []
  };

  try {
    await connectToDatabase();
    
    // Get current stats
    const currentStats = await getDatabaseStats();
    const totalRecords = Object.values(currentStats).reduce((sum, count) => sum + count, 0);
    
    console.log('📊 Current database state:');
    console.log(`   - Prompts: ${currentStats.prompts}`);
    console.log(`   - Test Cases: ${currentStats.testCases}`);
    console.log(`   - Test Results: ${currentStats.testResults}`);
    console.log(`   - Prompt Metrics: ${currentStats.promptMetrics}`);
    console.log(`   - Total Records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('\\nℹ️  Database is already empty');
      stats.operations.push('Database was already empty');
    } else {
      // Confirmation prompt
      if (!skipConfirmation) {
        console.log('\\n⚠️  WARNING: This will permanently delete ALL prompt-related data!');
        console.log('🔥 This action cannot be undone!');
        
        if (runInitialization) {
          console.log('\\n✨ After reset, the database will be re-initialized with empty templates');
        }
        
        const confirmed = await askConfirmation('\\nAre you absolutely sure you want to continue?');
        
        if (!confirmed) {
          console.log('❌ Reset cancelled by user');
          stats.operations.push('Reset cancelled by user');
          return stats;
        }
      }
      
      // Delete all records (safer than dropping collections)
      await deleteAllRecords(stats);
    }
    
    // Recreate indexes
    await recreateIndexes(stats);
    
    // Run initialization if requested
    if (runInitialization) {
      console.log('\\n🚀 Running database initialization...');
      try {
        const initStats = await initializeCollections();
        stats.initializationRun = true;
        stats.operations.push(`Initialization completed: ${initStats.prompts} prompts, ${initStats.testCases} test cases created`);
        console.log('✅ Database initialization completed');
      } catch (error) {
        logger.error({ error }, 'Initialization failed');
        stats.operations.push(`Initialization failed: ${(error as Error).message}`);
        throw error;
      }
    }
    
    console.log('\\n✅ Database reset completed successfully');
    return stats;
    
  } catch (error) {
    logger.error({ error }, 'Database reset failed');
    throw error;
  }
}

/**
 * Print reset report
 */
function printReport(stats: ResetStats) {
  console.log('\\n' + '='.repeat(60));
  console.log('DATABASE RESET REPORT');
  console.log('='.repeat(60));
  
  if (stats.collectionsDropped > 0) {
    console.log(`🗑️  Collections dropped: ${stats.collectionsDropped}`);
  }
  
  const totalDeleted = Object.values(stats.recordsDeleted).reduce((sum, count) => sum + count, 0);
  if (totalDeleted > 0) {
    console.log(`🗑️  Records deleted: ${totalDeleted}`);
    console.log(`   - Prompts: ${stats.recordsDeleted.prompts}`);
    console.log(`   - Test Cases: ${stats.recordsDeleted.testCases}`);
    console.log(`   - Test Results: ${stats.recordsDeleted.testResults}`);
    console.log(`   - Prompt Metrics: ${stats.recordsDeleted.promptMetrics}`);
  }
  
  if (stats.indexesRecreated > 0) {
    console.log(`📊 Indexes recreated: ${stats.indexesRecreated}`);
  }
  
  if (stats.initializationRun) {
    console.log(`✨ Database re-initialized with template data`);
  }
  
  console.log('\\n📝 Operations log:');
  stats.operations.forEach(op => {
    console.log(`   ${op}`);
  });
  
  console.log('\\n✅ Database reset completed');
  
  if (stats.initializationRun) {
    console.log('\\nNext steps:');
    console.log('   - Run "npm run db:migrate" to import existing prompts');
    console.log('   - Run "npm run db:validate" to verify data integrity');
  } else {
    console.log('\\nNext steps:');
    console.log('   - Run "npm run db:init" to set up template data');
    console.log('   - Or restore from a backup using "npm run db:restore <backup-file>"');
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
    const init = args.includes('--init');
    
    console.log('🚀 Starting database reset...');
    if (force) {
      console.log('⚠️  Force mode enabled - skipping confirmation prompts');
    }
    if (init) {
      console.log('✨ Initialization will run after reset');
    }
    
    const stats = await resetDatabase(init, force);
    printReport(stats);
    
    process.exit(0);
    
  } catch (error) {
    logger.error({ error }, 'Reset script failed');
    console.error('❌ Database reset failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { resetDatabase };