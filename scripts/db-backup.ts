#!/usr/bin/env tsx

import { fileURLToPath } from 'url';
import { disconnectFromDatabase } from '../lib/database/connection';
import { backupManager } from '../lib/scripts/backup-utils';
import { createEnhancedLogger } from '../lib/utils/consola-logger';

const logger = createEnhancedLogger('db-backup');

/**
 * Create a database backup
 */
async function createBackup(compress = true) {
  try {
    console.log('🚀 Starting database backup...');
    
    if (compress) {
      console.log('📦 Compression enabled');
    }

    const backupPath = await backupManager.createBackup(compress);
    
    console.log('\\n' + '='.repeat(60));
    console.log('BACKUP COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`📁 Backup saved to: ${backupPath}`);
    
    // Get backup info
    const backups = await backupManager.listBackups();
    const currentBackup = backups.find(b => b.filename === backupPath.split('/').pop());
    
    if (currentBackup) {
      console.log(`📊 Collections backed up:`);
      console.log(`   - Prompts: ${currentBackup.metadata.collections.prompts}`);
      console.log(`   - Test Cases: ${currentBackup.metadata.collections.testCases}`);
      console.log(`   - Test Results: ${currentBackup.metadata.collections.testResults}`);
      console.log(`   - Prompt Metrics: ${currentBackup.metadata.collections.promptMetrics}`);
      console.log(`💾 File size: ${currentBackup.fileSize} bytes`);
      console.log(`🗜️  Compressed: ${currentBackup.metadata.compressed ? 'Yes' : 'No'}`);
    }
    
    console.log('\\nNext steps:');
    console.log('   - Backup is stored in the /backups directory');
    console.log('   - Use "npm run db:list-backups" to view all backups');
    console.log('   - Use "npm run db:restore <filename>" to restore if needed');
    console.log('='.repeat(60));
    
  } catch (error) {
    logger.error({ error }, 'Backup failed');
    console.error('❌ Backup failed:', (error as Error).message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const compress = !args.includes('--no-compress');
    
    await createBackup(compress);
    process.exit(0);
    
  } catch (error) {
    logger.error({ error }, 'Backup script failed');
    console.error('❌ Backup script failed:', (error as Error).message);
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

export { createBackup };