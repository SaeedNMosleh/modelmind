#!/usr/bin/env ts-node

import { Command } from 'commander';
const program = new Command();
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';
import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { TestCase } from '../lib/database/models/testCase';
import { TestResult } from '../lib/database/models/testResult';
import { PromptMetrics } from '../lib/database/models/promptMetrics';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
});

/**
 * Backup configuration
 */
interface BackupConfig {
  outputDir: string;
  includePrompts: boolean;
  includeTestCases: boolean;
  includeTestResults: boolean;
  includeMetrics: boolean;
  compress: boolean;
  splitFiles: boolean;
  verbose: boolean;
}

/**
 * Backup result
 */
interface BackupResult {
  success: boolean;
  backupPath: string;
  totalSize: number;
  collections: {
    prompts: number;
    testCases: number;
    testResults: number;
    metrics: number;
  };
  duration: number;
  errors: string[];
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDir(backupDir: string): void {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    logger.info(`Created backup directory: ${backupDir}`);
  }
}

/**
 * Create comprehensive backup of all prompt-related data
 */
async function createBackup(config: BackupConfig): Promise<BackupResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `modelmind-backup-${timestamp}`;
  const backupPath = path.join(config.outputDir, backupName);
  
  const result: BackupResult = {
    success: false,
    backupPath,
    totalSize: 0,
    collections: {
      prompts: 0,
      testCases: 0,
      testResults: 0,
      metrics: 0
    },
    duration: 0,
    errors: []
  };

  try {
    logger.info('Starting comprehensive backup...');
    
    // Ensure backup directory exists
    ensureBackupDir(config.outputDir);
    ensureBackupDir(backupPath);

    // Connect to database
    await connectToDatabase();
    logger.info('Connected to database');

    // Create backup metadata
    const metadata = {
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      description: 'ModelMind prompt management system backup',
      config
    };

    fs.writeFileSync(
      path.join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Backup prompts
    if (config.includePrompts) {
      logger.info('Backing up prompts...');
      const prompts = await Prompt.find({}).lean();
      result.collections.prompts = prompts.length;
      
      const promptsFile = path.join(backupPath, 'prompts.json');
      fs.writeFileSync(promptsFile, JSON.stringify(prompts, null, 2));
      
      if (config.verbose) {
        logger.info(`Backed up ${prompts.length} prompts`);
      }
    }

    // Backup test cases
    if (config.includeTestCases) {
      logger.info('Backing up test cases...');
      const testCases = await TestCase.find({}).lean();
      result.collections.testCases = testCases.length;
      
      if (config.splitFiles) {
        // Split by prompt ID for easier management
        const testCasesByPrompt = testCases.reduce((acc, tc) => {
          const promptId = tc.promptId.toString();
          if (!acc[promptId]) acc[promptId] = [];
          acc[promptId].push(tc);
          return acc;
        }, {} as Record<string, typeof testCases>);

        const testCasesDir = path.join(backupPath, 'test-cases');
        ensureBackupDir(testCasesDir);

        for (const [promptId, cases] of Object.entries(testCasesByPrompt)) {
          fs.writeFileSync(
            path.join(testCasesDir, `${promptId}.json`),
            JSON.stringify(cases, null, 2)
          );
        }
      } else {
        const testCasesFile = path.join(backupPath, 'test-cases.json');
        fs.writeFileSync(testCasesFile, JSON.stringify(testCases, null, 2));
      }
      
      if (config.verbose) {
        logger.info(`Backed up ${testCases.length} test cases`);
      }
    }

    // Backup test results
    if (config.includeTestResults) {
      logger.info('Backing up test results...');
      const testResults = await TestResult.find({}).lean();
      result.collections.testResults = testResults.length;
      
      if (config.splitFiles) {
        // Split by date for manageability
        const resultsByMonth = testResults.reduce((acc, tr) => {
          const month = tr.createdAt.toISOString().substring(0, 7); // YYYY-MM
          if (!acc[month]) acc[month] = [];
          acc[month].push(tr);
          return acc;
        }, {} as Record<string, typeof testResults>);

        const testResultsDir = path.join(backupPath, 'test-results');
        ensureBackupDir(testResultsDir);

        for (const [month, results] of Object.entries(resultsByMonth)) {
          fs.writeFileSync(
            path.join(testResultsDir, `${month}.json`),
            JSON.stringify(results, null, 2)
          );
        }
      } else {
        const testResultsFile = path.join(backupPath, 'test-results.json');
        fs.writeFileSync(testResultsFile, JSON.stringify(testResults, null, 2));
      }
      
      if (config.verbose) {
        logger.info(`Backed up ${testResults.length} test results`);
      }
    }

    // Backup metrics
    if (config.includeMetrics) {
      logger.info('Backing up metrics...');
      const metrics = await PromptMetrics.find({}).lean();
      result.collections.metrics = metrics.length;
      
      if (config.splitFiles) {
        // Split by prompt ID and month
        const metricsByPromptMonth = metrics.reduce((acc, metric) => {
          const promptId = metric.promptId.toString();
          const month = metric.date.toISOString().substring(0, 7);
          const key = `${promptId}-${month}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(metric);
          return acc;
        }, {} as Record<string, typeof metrics>);

        const metricsDir = path.join(backupPath, 'metrics');
        ensureBackupDir(metricsDir);

        for (const [key, metricGroup] of Object.entries(metricsByPromptMonth)) {
          fs.writeFileSync(
            path.join(metricsDir, `${key}.json`),
            JSON.stringify(metricGroup, null, 2)
          );
        }
      } else {
        const metricsFile = path.join(backupPath, 'metrics.json');
        fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
      }
      
      if (config.verbose) {
        logger.info(`Backed up ${metrics.length} metric records`);
      }
    }

    // Calculate total backup size
    const calculateDirSize = (dirPath: string): number => {
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += calculateDirSize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    };

    result.totalSize = calculateDirSize(backupPath);

    // Compress if requested
    if (config.compress) {
      logger.info('Compressing backup...');
      const archiver = await import('archiver');
      const archive = archiver.default('zip', { zlib: { level: 9 } });
      
      const output = fs.createWriteStream(`${backupPath}.zip`);
      archive.pipe(output);
      archive.directory(backupPath, false);
      
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.finalize();
      });

      // Remove uncompressed directory
      fs.rmSync(backupPath, { recursive: true });
      result.backupPath = `${backupPath}.zip`;
      
      logger.info(`Compressed backup to: ${result.backupPath}`);
    }

    result.duration = Date.now() - startTime;
    result.success = true;

    logger.info('Backup completed successfully', {
      backupPath: result.backupPath,
      duration: `${result.duration}ms`,
      totalSize: `${(result.totalSize / 1024 / 1024).toFixed(2)}MB`,
      collections: result.collections
    });

    return result;

  } catch (error) {
    logger.error('Backup failed:', error);
    result.errors.push(error.message);
    result.success = false;
    return result;
  } finally {
    await disconnectFromDatabase();
  }
}

/**
 * Restore from backup
 */
async function restoreFromBackup(backupPath: string, options: {
  restorePrompts: boolean;
  restoreTestCases: boolean;
  restoreTestResults: boolean;
  restoreMetrics: boolean;
  clearExisting: boolean;
  dryRun: boolean;
}): Promise<void> {
  try {
    logger.info(`Starting restore from backup: ${backupPath}`);
    
    if (options.dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes will be made');
    }

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    let extractedPath = backupPath;
    
    // Extract if compressed
    if (backupPath.endsWith('.zip')) {
      const extractTo = backupPath.replace('.zip', '-extracted');
      logger.info('Extracting compressed backup...');
      
      const AdmZip = await import('adm-zip');
      const zip = new AdmZip.default(backupPath);
      zip.extractAllTo(extractTo, true);
      extractedPath = extractTo;
    }

    // Read metadata
    const metadataPath = path.join(extractedPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Invalid backup: metadata.json not found');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    logger.info('Backup metadata:', {
      createdAt: metadata.createdAt,
      version: metadata.version
    });

    if (options.dryRun) {
      logger.info('DRY RUN: Would restore from backup created at', metadata.createdAt);
      return;
    }

    await connectToDatabase();

    // Restore prompts
    if (options.restorePrompts) {
      const promptsPath = path.join(extractedPath, 'prompts.json');
      if (fs.existsSync(promptsPath)) {
        logger.info('Restoring prompts...');
        
        if (options.clearExisting) {
          await Prompt.deleteMany({});
          logger.info('Cleared existing prompts');
        }

        const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
        if (prompts.length > 0) {
          await Prompt.insertMany(prompts);
          logger.info(`Restored ${prompts.length} prompts`);
        }
      }
    }

    // Restore test cases
    if (options.restoreTestCases) {
      const testCasesPath = path.join(extractedPath, 'test-cases.json');
      const testCasesDir = path.join(extractedPath, 'test-cases');
      
      if (fs.existsSync(testCasesPath) || fs.existsSync(testCasesDir)) {
        logger.info('Restoring test cases...');
        
        if (options.clearExisting) {
          await TestCase.deleteMany({});
          logger.info('Cleared existing test cases');
        }

        let allTestCases = [];

        if (fs.existsSync(testCasesPath)) {
          allTestCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));
        } else if (fs.existsSync(testCasesDir)) {
          const files = fs.readdirSync(testCasesDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const testCases = JSON.parse(fs.readFileSync(path.join(testCasesDir, file), 'utf8'));
              allTestCases.push(...testCases);
            }
          }
        }

        if (allTestCases.length > 0) {
          await TestCase.insertMany(allTestCases);
          logger.info(`Restored ${allTestCases.length} test cases`);
        }
      }
    }

    // Restore test results
    if (options.restoreTestResults) {
      const testResultsPath = path.join(extractedPath, 'test-results.json');
      const testResultsDir = path.join(extractedPath, 'test-results');
      
      if (fs.existsSync(testResultsPath) || fs.existsSync(testResultsDir)) {
        logger.info('Restoring test results...');
        
        if (options.clearExisting) {
          await TestResult.deleteMany({});
          logger.info('Cleared existing test results');
        }

        let allTestResults = [];

        if (fs.existsSync(testResultsPath)) {
          allTestResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
        } else if (fs.existsSync(testResultsDir)) {
          const files = fs.readdirSync(testResultsDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const testResults = JSON.parse(fs.readFileSync(path.join(testResultsDir, file), 'utf8'));
              allTestResults.push(...testResults);
            }
          }
        }

        if (allTestResults.length > 0) {
          await TestResult.insertMany(allTestResults);
          logger.info(`Restored ${allTestResults.length} test results`);
        }
      }
    }

    // Restore metrics
    if (options.restoreMetrics) {
      const metricsPath = path.join(extractedPath, 'metrics.json');
      const metricsDir = path.join(extractedPath, 'metrics');
      
      if (fs.existsSync(metricsPath) || fs.existsSync(metricsDir)) {
        logger.info('Restoring metrics...');
        
        if (options.clearExisting) {
          await PromptMetrics.deleteMany({});
          logger.info('Cleared existing metrics');
        }

        let allMetrics = [];

        if (fs.existsSync(metricsPath)) {
          allMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        } else if (fs.existsSync(metricsDir)) {
          const files = fs.readdirSync(metricsDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const metrics = JSON.parse(fs.readFileSync(path.join(metricsDir, file), 'utf8'));
              allMetrics.push(...metrics);
            }
          }
        }

        if (allMetrics.length > 0) {
          await PromptMetrics.insertMany(allMetrics);
          logger.info(`Restored ${allMetrics.length} metric records`);
        }
      }
    }

    // Clean up extracted files if from zip
    if (backupPath.endsWith('.zip') && extractedPath !== backupPath) {
      fs.rmSync(extractedPath, { recursive: true });
    }

    logger.info('✅ Restore completed successfully');

  } catch (error) {
    logger.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

/**
 * List available backups
 */
function listBackups(backupDir: string): void {
  try {
    if (!fs.existsSync(backupDir)) {
      logger.info('No backup directory found');
      return;
    }

    const files = fs.readdirSync(backupDir);
    const backups = files.filter(file => 
      file.startsWith('modelmind-backup-') && 
      (fs.statSync(path.join(backupDir, file)).isDirectory() || file.endsWith('.zip'))
    );

    if (backups.length === 0) {
      logger.info('No backups found');
      return;
    }

    logger.info(`Found ${backups.length} backups:`);
    for (const backup of backups) {
      const backupPath = path.join(backupDir, backup);
      const stats = fs.statSync(backupPath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      
      logger.info(`  ${backup} (${size}MB, ${stats.mtime.toISOString()})`);
    }

  } catch (error) {
    logger.error('Error listing backups:', error);
  }
}

/**
 * CLI program setup
 */
program
  .name('backup-prompts')
  .description('Backup and restore ModelMind prompt data')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new backup')
  .option('-o, --output <dir>', 'Output directory for backup', './backups')
  .option('--no-prompts', 'Exclude prompts from backup')
  .option('--no-test-cases', 'Exclude test cases from backup')
  .option('--no-test-results', 'Exclude test results from backup')
  .option('--no-metrics', 'Exclude metrics from backup')
  .option('--compress', 'Compress backup to ZIP file', false)
  .option('--split-files', 'Split large collections into multiple files', false)
  .option('--verbose', 'Show detailed progress', false)
  .action(async (options) => {
    try {
      const config: BackupConfig = {
        outputDir: options.output,
        includePrompts: options.prompts,
        includeTestCases: options.testCases,
        includeTestResults: options.testResults,
        includeMetrics: options.metrics,
        compress: options.compress,
        splitFiles: options.splitFiles,
        verbose: options.verbose
      };

      const result = await createBackup(config);
      
      if (result.success) {
        logger.info('✅ Backup created successfully');
        logger.info(`Backup location: ${result.backupPath}`);
      } else {
        logger.error('❌ Backup failed');
        result.errors.forEach(error => logger.error(error));
        process.exit(1);
      }
      
    } catch (error) {
      logger.error('Backup error:', error);
      process.exit(1);
    }
  });

program
  .command('restore')
  .description('Restore from backup')
  .argument('<backup-path>', 'Path to backup file or directory')
  .option('--no-prompts', 'Skip prompts restoration')
  .option('--no-test-cases', 'Skip test cases restoration')  
  .option('--no-test-results', 'Skip test results restoration')
  .option('--no-metrics', 'Skip metrics restoration')
  .option('--clear-existing', 'Clear existing data before restore', false)
  .option('--dry-run', 'Preview restore without making changes', false)
  .action(async (backupPath, options) => {
    try {
      await restoreFromBackup(backupPath, {
        restorePrompts: options.prompts,
        restoreTestCases: options.testCases,
        restoreTestResults: options.testResults,
        restoreMetrics: options.metrics,
        clearExisting: options.clearExisting,
        dryRun: options.dryRun
      });
      
    } catch (error) {
      logger.error('Restore error:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available backups')
  .option('-d, --dir <dir>', 'Backup directory to search', './backups')
  .action((options) => {
    listBackups(options.dir);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse command line arguments
if (require.main === module) {
  program.parse();
}