#!/usr/bin/env tsx

import { createEnhancedLogger } from '../lib/utils/consola-logger';
import { fileURLToPath } from 'url';
import { backupManager } from '../lib/scripts/backup-utils';
import path from 'path';

const logger = createEnhancedLogger('db-list-backups');

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format timestamp in human-readable format
 */
function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Create a detailed table format for backup listing
 */
function formatBackupTable(backups: any[]): string {
  if (backups.length === 0) {
    return 'No backup files found.\\n\\nTo create a backup, run: npm run db:backup';
  }

  // Calculate column widths
  const headers = ['Filename', 'Size', 'Created', 'Prompts', 'Tests', 'Results', 'Metrics', 'Status'];
  const rows = backups.map(backup => [
    backup.filename,
    formatFileSize(backup.fileSize),
    formatTimestamp(backup.metadata.timestamp),
    backup.metadata.collections.prompts.toString(),
    backup.metadata.collections.testCases.toString(),
    backup.metadata.collections.testResults.toString(),
    backup.metadata.collections.promptMetrics.toString(),
    backup.metadata.integrity === 'valid' ? '✓' : backup.metadata.integrity === 'corrupted' ? '✗' : '?'
  ]);

  const colWidths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => row[i].length))
  );

  // Create separator
  const separator = colWidths.map(width => '-'.repeat(width)).join('-+-');

  // Format header
  const headerRow = headers.map((header, i) => header.padEnd(colWidths[i])).join(' | ');

  // Format rows
  const dataRows = rows.map(row => 
    row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\\n');
}

/**
 * Display detailed backup information
 */
function displayBackupDetails(backups: any[]) {
  if (backups.length === 0) {
    console.log('\\n📂 No backup files found');
    console.log('\\nTo create your first backup, run:');
    console.log('   npm run db:backup');
    return;
  }

  console.log(`\\n📂 Found ${backups.length} backup file(s) in the backups directory:`);
  console.log('\\n' + formatBackupTable(backups));

  // Summary statistics
  const validBackups = backups.filter(b => b.metadata.integrity === 'valid');
  const corruptedBackups = backups.filter(b => b.metadata.integrity === 'corrupted');
  const totalSize = backups.reduce((sum, backup) => sum + backup.fileSize, 0);
  const newestBackup = backups[0]; // Already sorted by date (newest first)
  const oldestBackup = backups[backups.length - 1];

  console.log('\\n📊 Summary:');
  console.log(`   Valid backups: ${validBackups.length}`);
  if (corruptedBackups.length > 0) {
    console.log(`   Corrupted backups: ${corruptedBackups.length}`);
  }
  console.log(`   Total size: ${formatFileSize(totalSize)}`);
  
  if (newestBackup) {
    console.log(`   Newest: ${newestBackup.filename} (${formatTimestamp(newestBackup.metadata.timestamp)})`);
  }
  
  if (oldestBackup && oldestBackup !== newestBackup) {
    console.log(`   Oldest: ${oldestBackup.filename} (${formatTimestamp(oldestBackup.metadata.timestamp)})`);
  }

  // Show backup directory path
  const backupDir = path.resolve(process.cwd(), 'backups');
  console.log(`\\n📁 Backup directory: ${backupDir}`);

  // Usage instructions
  console.log('\\n💡 Usage:');
  console.log('   • Create new backup: npm run db:backup');
  console.log('   • Restore from backup: npm run db:restore <filename>');
  console.log('   • Example restore: npm run db:restore ' + (newestBackup ? newestBackup.filename : 'backup-file.json'));

  // Warnings for corrupted backups
  if (corruptedBackups.length > 0) {
    console.log('\\n⚠️  Warning: Some backup files are corrupted and cannot be restored:');
    corruptedBackups.forEach(backup => {
      console.log(`   - ${backup.filename}`);
    });
  }
}

/**
 * Show backup details with optional filtering
 */
async function listBackups(showDetails = true) {
  try {
    console.log('🔍 Scanning for backup files...');
    
    const backups = await backupManager.listBackups();
    
    if (showDetails) {
      displayBackupDetails(backups);
    } else {
      // Simple list format
      if (backups.length === 0) {
        console.log('No backup files found.');
      } else {
        console.log('\\nAvailable backups:');
        backups.forEach((backup, index) => {
          const status = backup.metadata.integrity === 'valid' ? '✓' : 
                        backup.metadata.integrity === 'corrupted' ? '✗' : '?';
          console.log(`${index + 1}. ${backup.filename} ${status} (${formatFileSize(backup.fileSize)})`);
        });
      }
    }
    
    return backups;
    
  } catch (error) {
    logger.error({ error }, 'Failed to list backups');
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const simple = args.includes('--simple');
    const count = args.includes('--count');
    
    if (count) {
      // Just show count
      const backups = await backupManager.listBackups();
      console.log(backups.length);
      return;
    }
    
    await listBackups(!simple);
    process.exit(0);
    
  } catch (error) {
    logger.error({ error }, 'List backups script failed');
    console.error('❌ Failed to list backups:', (error as Error).message);
    process.exit(1);
  }
}

// Run if called directly
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  main();
}

export { listBackups, formatBackupTable };