#!/usr/bin/env ts-node

import { Command } from 'commander';
const program = new Command();
import pino from 'pino';
import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { extractAllPrompts } from '../lib/migration/extractor';
import { convertAllExtractedPrompts } from '../lib/migration/converter-simple';
import { seedPromptsFromPipeline } from '../lib/database/seeders/prompts';

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
 * Migration configuration
 */
interface MigrationConfig {
  dryRun: boolean;
  force: boolean;
  backup: boolean;
  verbose: boolean;
  outputFile?: string;
}

/**
 * Migration result
 */
interface MigrationResult {
  success: boolean;
  promptsExtracted: number;
  promptsCreated: number;
  promptsUpdated: number;
  promptsSkipped: number;
  errors: string[];
  backupFile?: string;
}

/**
 * Extract prompts from AI pipeline and migrate to database
 */
async function migratePromptsFromPipeline(config: MigrationConfig): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    promptsExtracted: 0,
    promptsCreated: 0,
    promptsUpdated: 0,
    promptsSkipped: 0,
    errors: []
  };

  try {
    logger.info('Starting migration from AI pipeline to database');
    
    if (config.dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes will be made to the database');
    }

    // Connect to database
    await connectToDatabase();
    logger.info('Connected to database');

    // Create backup if requested
    if (config.backup && !config.dryRun) {
      logger.info('Creating backup of existing prompts...');
      const backupResult = await createPromptsBackup();
      result.backupFile = backupResult.filename;
      logger.info(`Backup created: ${result.backupFile}`);
    }

    // Extract prompts from AI pipeline
    logger.info('Extracting prompts from AI pipeline...');
    const extractedPrompts = extractAllPrompts();
    result.promptsExtracted = extractedPrompts.length;
    
    if (config.verbose) {
      logger.info('Extracted prompts:', extractedPrompts.map(p => p.name));
    }

    // Convert to database format
    logger.info('Converting prompts to database format...');
    const databasePrompts = convertAllExtractedPrompts(extractedPrompts);

    if (config.outputFile) {
      // Save extracted prompts to file
      const fs = await import('fs');
      const outputData = {
        extractedAt: new Date().toISOString(),
        totalPrompts: databasePrompts.length,
        prompts: databasePrompts
      };
      
      fs.writeFileSync(config.outputFile, JSON.stringify(outputData, null, 2));
      logger.info(`Extracted prompts saved to: ${config.outputFile}`);
    }

    if (config.dryRun) {
      logger.info(`DRY RUN: Would process ${databasePrompts.length} prompts`);
      result.success = true;
      return result;
    }

    // Migrate each prompt
    logger.info(`Migrating ${databasePrompts.length} prompts...`);
    
    for (const promptData of databasePrompts) {
      try {
        // Check if prompt already exists
        const existing = await Prompt.findOne({ 
          name: promptData.name
        });

        if (existing) {
          const currentVersion = existing.versions.find(v => v.version === existing.currentVersion);
          const newTemplate = promptData.versions[0].template;
          
          if (config.force || !currentVersion || currentVersion.template !== newTemplate) {
            // Update existing prompt
            await Prompt.findByIdAndUpdate(existing._id, promptData);
            result.promptsUpdated++;
            
            if (config.verbose) {
              logger.info(`Updated prompt: ${promptData.name}`);
            }
          } else {
            result.promptsSkipped++;
            
            if (config.verbose) {
              logger.debug(`Skipped unchanged prompt: ${promptData.name}`);
            }
          }
        } else {
          // Create new prompt
          const prompt = new Prompt(promptData);
          await prompt.save();
          result.promptsCreated++;
          
          if (config.verbose) {
            logger.info(`Created prompt: ${promptData.name}`);
          }
        }
      } catch (error) {
        const errorMsg = `Error migrating prompt ${promptData.name}: ${error.message}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    result.success = result.errors.length === 0;

    logger.info('Migration completed', {
      success: result.success,
      extracted: result.promptsExtracted,
      created: result.promptsCreated,
      updated: result.promptsUpdated,
      skipped: result.promptsSkipped,
      errors: result.errors.length
    });

    return result;

  } catch (error) {
    logger.error('Migration failed:', error);
    result.errors.push(error.message);
    result.success = false;
    return result;
  } finally {
    await disconnectFromDatabase();
  }
}

/**
 * Create backup of existing prompts
 */
async function createPromptsBackup(): Promise<{ filename: string; count: number }> {
  const fs = await import('fs');
  const path = await import('path');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `prompts-backup-${timestamp}.json`;
  const backupPath = path.join(process.cwd(), 'backups', filename);

  // Ensure backup directory exists
  const backupDir = path.dirname(backupPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get all existing prompts
  const existingPrompts = await Prompt.find({}).lean();
  
  // Save backup
  const backupData = {
    createdAt: new Date().toISOString(),
    totalPrompts: existingPrompts.length,
    prompts: existingPrompts
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  
  return {
    filename: backupPath,
    count: existingPrompts.length
  };
}

/**
 * Restore prompts from backup
 */
async function restoreFromBackup(backupFile: string): Promise<void> {
  const fs = await import('fs');
  
  logger.info(`Restoring prompts from backup: ${backupFile}`);
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  
  await connectToDatabase();
  
  try {
    // Clear existing prompts
    await Prompt.deleteMany({});
    logger.info('Cleared existing prompts');

    // Restore from backup
    if (backupData.prompts && backupData.prompts.length > 0) {
      await Prompt.insertMany(backupData.prompts);
      logger.info(`Restored ${backupData.prompts.length} prompts from backup`);
    }

  } finally {
    await disconnectFromDatabase();
  }
}

/**
 * Validate migration result
 */
async function validateMigration(): Promise<void> {
  logger.info('Validating migration...');
  
  await connectToDatabase();
  
  try {
    const totalPrompts = await Prompt.countDocuments();
    const activePrompts = await Prompt.countDocuments({ isActive: true });
    const promptsByAgent = await Prompt.aggregate([
      { $group: { _id: '$agentType', count: { $sum: 1 } } }
    ]);

    logger.info('Migration validation results:', {
      totalPrompts,
      activePrompts,
      promptsByAgent: promptsByAgent.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {})
    });

    // Check for required agent types
    const requiredAgents = ['GENERATOR', 'MODIFIER', 'ANALYZER', 'CLASSIFIER'];
    const existingAgents = promptsByAgent.map(p => p._id);
    const missingAgents = requiredAgents.filter(agent => !existingAgents.includes(agent));

    if (missingAgents.length > 0) {
      logger.warn('Missing prompts for agent types:', missingAgents);
    } else {
      logger.info('✅ All required agent types have prompts');
    }

  } finally {
    await disconnectFromDatabase();
  }
}

/**
 * CLI program setup
 */
program
  .name('migrate-from-pipeline')
  .description('Migrate prompts from AI pipeline to MongoDB database')
  .version('1.0.0');

program
  .command('migrate')
  .description('Extract and migrate prompts from AI pipeline')
  .option('--dry-run', 'Preview changes without modifying database', false)
  .option('--force', 'Force update existing prompts even if unchanged', false)
  .option('--backup', 'Create backup before migration', true)
  .option('--verbose', 'Show detailed logging', false)
  .option('-o, --output <file>', 'Save extracted prompts to JSON file')
  .action(async (options) => {
    try {
      const config: MigrationConfig = {
        dryRun: options.dryRun,
        force: options.force,
        backup: options.backup,
        verbose: options.verbose,
        outputFile: options.output
      };

      const result = await migratePromptsFromPipeline(config);
      
      if (result.success) {
        logger.info('✅ Migration completed successfully');
        process.exit(0);
      } else {
        logger.error('❌ Migration failed');
        logger.error('Errors:', result.errors);
        process.exit(1);
      }
    } catch (error) {
      logger.error('Migration error:', error);
      process.exit(1);
    }
  });

program
  .command('restore')
  .description('Restore prompts from backup file')
  .argument('<backup-file>', 'Path to backup file')
  .action(async (backupFile) => {
    try {
      await restoreFromBackup(backupFile);
      logger.info('✅ Restore completed successfully');
    } catch (error) {
      logger.error('Restore error:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate migration results')
  .action(async () => {
    try {
      await validateMigration();
      logger.info('✅ Validation completed');
    } catch (error) {
      logger.error('Validation error:', error);
      process.exit(1);
    }
  });

program
  .command('quick-seed')
  .description('Quick seed using the seeder (recommended)')
  .action(async () => {
    try {
      logger.info('Running quick seed from pipeline...');
      await seedPromptsFromPipeline();
      logger.info('✅ Quick seed completed successfully');
    } catch (error) {
      logger.error('Quick seed error:', error);
      process.exit(1);
    }
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