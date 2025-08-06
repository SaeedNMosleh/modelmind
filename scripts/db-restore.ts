#!/usr/bin/env tsx

import { createEnhancedLogger } from '../lib/utils/consola-logger';
import { fileURLToPath } from 'url';
import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { TestCase } from '../lib/database/models/testCase';
import { TestResult } from '../lib/database/models/testResult';
import { PromptMetrics } from '../lib/database/models/promptMetrics';
import { backupManager, BackupData } from '../lib/scripts/backup-utils';
import readline from 'readline';

const logger = createEnhancedLogger('db-restore');

interface RestoreStats {
  prompts: { imported: number; errors: number };
  testCases: { imported: number; errors: number };
  testResults: { imported: number; errors: number };
  promptMetrics: { imported: number; errors: number };
  errors: string[];
  warnings: string[];
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
 * Clear all existing collections
 */
async function clearCollections(): Promise<void> {
  logger.info('Clearing existing collections...');
  
  await Promise.all([
    Prompt.deleteMany({}),
    TestCase.deleteMany({}),
    TestResult.deleteMany({}),
    PromptMetrics.deleteMany({})
  ]);
  
  console.log('✅ Existing data cleared');
}

/**
 * Recreate indexes after restore
 */
async function recreateIndexes(): Promise<void> {
  logger.info('Recreating database indexes...');
  
  try {
    await Promise.all([
      Prompt.collection.createIndex({ name: 1 }, { unique: true, background: true }),
      Prompt.collection.createIndex({ agentType: 1, diagramType: 1 }, { background: true }),
      Prompt.collection.createIndex({ isProduction: 1 }, { background: true }),
      TestCase.collection.createIndex({ promptId: 1 }, { background: true }),
      TestCase.collection.createIndex({ isActive: 1 }, { background: true }),
      TestResult.collection.createIndex({ promptId: 1, promptVersion: 1 }, { background: true }),
      TestResult.collection.createIndex({ createdAt: -1 }, { background: true }),
      PromptMetrics.collection.createIndex(
        { promptId: 1, promptVersion: 1, period: 1, timestamp: 1 },
        { background: true }
      )
    ]);
    
    console.log('✅ Database indexes recreated');
  } catch (error) {
    logger.warn({ error }, 'Some indexes might already exist');
  }
}

/**
 * Import collection data with error handling
 */
async function importCollection<T>(
  collectionName: string,
  Model: any,
  data: T[],
  stats: RestoreStats
): Promise<void> {
  if (!data || data.length === 0) {
    logger.info(`No ${collectionName} data to import`);
    return;
  }

  console.log(`📤 Importing ${data.length} ${collectionName} records...`);
  
  for (const item of data) {
    try {
      const document = new Model(item);
      await document.save();
      
      // Update stats based on collection
      if (collectionName === 'prompts') {
        stats.prompts.imported++;
      } else if (collectionName === 'testCases') {
        stats.testCases.imported++;
      } else if (collectionName === 'testResults') {
        stats.testResults.imported++;
      } else if (collectionName === 'promptMetrics') {
        stats.promptMetrics.imported++;
      }
      
    } catch (error) {
      const errorMsg = `Failed to import ${collectionName} record: ${(error as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error({ error, item }, `Failed to import ${collectionName} record`);
      
      // Update error stats
      if (collectionName === 'prompts') {
        stats.prompts.errors++;
      } else if (collectionName === 'testCases') {
        stats.testCases.errors++;
      } else if (collectionName === 'testResults') {
        stats.testResults.errors++;
      } else if (collectionName === 'promptMetrics') {
        stats.promptMetrics.errors++;
      }
    }
  }
  
  console.log(`✅ ${collectionName} import completed`);
}

/**
 * Restore database from backup file
 */
async function restoreFromBackup(
  backupFilePath: string,
  skipConfirmation = false
): Promise<RestoreStats> {
  const stats: RestoreStats = {
    prompts: { imported: 0, errors: 0 },
    testCases: { imported: 0, errors: 0 },
    testResults: { imported: 0, errors: 0 },
    promptMetrics: { imported: 0, errors: 0 },
    errors: [],
    warnings: []
  };

  try {
    await connectToDatabase();
    
    // Load and validate backup
    console.log(`📂 Loading backup from: ${backupFilePath}`);
    const backupData: BackupData = await backupManager.loadBackup(backupFilePath);
    
    // Validate backup integrity
    const isValid = await backupManager.validateBackupIntegrity(backupFilePath);
    if (!isValid) {
      throw new Error('Backup file is corrupted or invalid');
    }
    
    console.log('✅ Backup file validated successfully');
    console.log(`📊 Backup contains:`);
    console.log(`   - Prompts: ${backupData.metadata.collections.prompts}`);
    console.log(`   - Test Cases: ${backupData.metadata.collections.testCases}`);
    console.log(`   - Test Results: ${backupData.metadata.collections.testResults}`);
    console.log(`   - Prompt Metrics: ${backupData.metadata.collections.promptMetrics}`);
    console.log(`📅 Created: ${new Date(backupData.metadata.timestamp).toLocaleString()}`);
    
    // Confirmation prompt
    if (!skipConfirmation) {
      console.log('\\n⚠️  WARNING: This will permanently delete all existing data!');
      const confirmed = await askConfirmation('Are you sure you want to continue with the restore?');
      
      if (!confirmed) {
        console.log('❌ Restore cancelled by user');
        return stats;
      }
    }
    
    // Clear existing data
    await clearCollections();
    
    // Import data
    console.log('\\n📥 Starting data import...');
    
    await importCollection('prompts', Prompt, backupData.data.prompts, stats);
    await importCollection('testCases', TestCase, backupData.data.testCases, stats);
    await importCollection('testResults', TestResult, backupData.data.testResults, stats);
    await importCollection('promptMetrics', PromptMetrics, backupData.data.promptMetrics, stats);
    
    // Recreate indexes
    await recreateIndexes();
    
    console.log('\\n✅ Database restore completed successfully');
    return stats;
    
  } catch (error) {
    logger.error({ error }, 'Restore failed');
    throw error;
  }
}

/**
 * Print restore report
 */
function printReport(stats: RestoreStats, backupFile: string) {
  console.log('\\n' + '='.repeat(60));
  console.log('DATABASE RESTORE REPORT');
  console.log('='.repeat(60));
  console.log(`📂 Restored from: ${backupFile}`);
  console.log('')
  console.log('📊 Import Results:');
  console.log(`   Prompts: ${stats.prompts.imported} imported, ${stats.prompts.errors} errors`);
  console.log(`   Test Cases: ${stats.testCases.imported} imported, ${stats.testCases.errors} errors`);
  console.log(`   Test Results: ${stats.testResults.imported} imported, ${stats.testResults.errors} errors`);
  console.log(`   Prompt Metrics: ${stats.promptMetrics.imported} imported, ${stats.promptMetrics.errors} errors`);
  
  const totalImported = stats.prompts.imported + stats.testCases.imported + 
                       stats.testResults.imported + stats.promptMetrics.imported;
  const totalErrors = stats.prompts.errors + stats.testCases.errors + 
                      stats.testResults.errors + stats.promptMetrics.errors;
  
  console.log(`\\n📈 Total: ${totalImported} records imported, ${totalErrors} errors`);
  
  if (stats.errors.length > 0) {
    console.log(`\\n❌ Errors (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(error => { // Show first 10 errors
      console.log(`   ${error}`);
    });
    
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }
  
  if (stats.warnings.length > 0) {
    console.log(`\\n⚠️  Warnings (${stats.warnings.length}):`);
    stats.warnings.forEach(warning => {
      console.log(`   ${warning}`);
    });
  }
  
  if (totalErrors === 0) {
    console.log('\\n🎉 Restore completed without errors!');
  } else {
    console.log(`\\n⚠️  Restore completed with ${totalErrors} errors - check logs for details`);
  }
  
  console.log('\\nNext steps:');
  console.log('   - Run "npm run db:validate" to verify restored data');
  console.log('   - Create a new backup if needed');
  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const backupFile = args[0];
    const force = args.includes('--force');
    
    if (!backupFile) {
      console.error('❌ Error: Backup file path is required');
      console.log('\\nUsage: npm run db:restore <backup-file> [--force]');
      console.log('\\nExample: npm run db:restore backups/backup-2024-01-15-12-30-45.json');
      console.log('\\nUse "npm run db:list-backups" to see available backups');
      process.exit(1);
    }
    
    console.log('🚀 Starting database restore...');
    if (force) {
      console.log('⚠️  Force mode enabled - skipping confirmation prompts');
    }
    
    const stats = await restoreFromBackup(backupFile, force);
    printReport(stats, backupFile);
    
    if (stats.errors.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    logger.error({ error }, 'Restore script failed');
    console.error('❌ Restore failed:', (error as Error).message);
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

export { restoreFromBackup };