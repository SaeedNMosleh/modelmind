#!/usr/bin/env ts-node

import { Command } from 'commander';
const program = new Command();
import pino from 'pino';
import { disconnectFromDatabase } from '../lib/database/connection';
import { 
  seedDatabase,
  seedPromptsOnly,
  seedTestCasesOnly,
  seedProduction,
  printSeedingStatistics,
  cleanupAllSeedData,
  validateSeedData,
  SeedingOptions
} from '../lib/database/seeders';

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
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await disconnectFromDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await disconnectFromDatabase();
  process.exit(0);
});

/**
 * CLI program setup
 */
program
  .name('seed-database')
  .description('Seed ModelMind database with prompts, test cases, and sample data')
  .version('1.0.0');

program
  .command('full')
  .description('Full database seeding (prompts, test cases, sample data)')
  .option('--dry-run', 'Preview what would be seeded without making changes', false)
  .option('--skip-existing', 'Skip items that already exist in database', true)
  .option('--no-prompts', 'Skip prompt seeding')
  .option('--no-test-cases', 'Skip test case seeding')
  .option('--no-sample-data', 'Skip sample data seeding')
  .option('--no-performance-tests', 'Skip performance test seeding')
  .option('--no-variations', 'Skip prompt variation seeding')
  .option('--no-version-history', 'Skip version history seeding')
  .action(async (options) => {
    try {
      logger.info('Starting full database seeding...');
      
      const seedingOptions: SeedingOptions = {
        includePrompts: options.prompts,
        includeTestCases: options.testCases,
        includeSampleData: options.sampleData,
        includePerformanceTests: options.performanceTests,
        includeVariations: options.variations,
        includeVersionHistory: options.versionHistory,
        skipExisting: options.skipExisting,
        dryRun: options.dryRun
      };

      await seedDatabase(seedingOptions);
      logger.info('✅ Full seeding completed successfully');
      
    } catch (error) {
      logger.error('❌ Full seeding failed:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  });

program
  .command('prompts')
  .description('Seed only prompts from AI pipeline')
  .action(async () => {
    try {
      logger.info('Starting prompts-only seeding...');
      await seedPromptsOnly();
      logger.info('✅ Prompts seeding completed successfully');
      
    } catch (error) {
      logger.error('❌ Prompts seeding failed:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  });

program
  .command('test-cases')
  .description('Seed only test cases')
  .action(async () => {
    try {
      logger.info('Starting test cases seeding...');
      await seedTestCasesOnly();
      logger.info('✅ Test cases seeding completed successfully');
      
    } catch (error) {
      logger.error('❌ Test cases seeding failed:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  });

program
  .command('production')
  .description('Seed for production environment (no sample data)')
  .action(async () => {
    try {
      logger.info('Starting production seeding...');
      await seedProduction();
      logger.info('✅ Production seeding completed successfully');
      
    } catch (error) {
      logger.error('❌ Production seeding failed:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  });

program
  .command('stats')
  .description('Show seeding statistics')
  .action(async () => {
    try {
      await printSeedingStatistics();
      
    } catch (error) {
      logger.error('❌ Error getting statistics:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  });

program
  .command('validate')
  .description('Validate seeded data integrity')
  .action(async () => {
    try {
      logger.info('Validating seeded data...');
      const validation = await validateSeedData();
      
      if (validation.isValid) {
        logger.info('✅ Data validation passed');
      } else {
        logger.error('❌ Data validation failed');
        validation.issues.forEach(issue => logger.error(`  - ${issue}`));
        process.exit(1);
      }
      
    } catch (error) {
      logger.error('❌ Validation error:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  });

program
  .command('cleanup')
  .description('Clean up all seeded data (DESTRUCTIVE)')
  .option('--confirm', 'Confirm cleanup operation', false)
  .action(async (options) => {
    try {
      if (!options.confirm) {
        logger.error('❌ Cleanup requires --confirm flag (this operation is destructive)');
        process.exit(1);
      }

      logger.warn('⚠️  Starting cleanup of all seeded data...');
      await cleanupAllSeedData();
      logger.info('✅ Cleanup completed successfully');
      
    } catch (error) {
      logger.error('❌ Cleanup failed:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  });

program
  .command('interactive')
  .description('Interactive seeding with prompts')
  .action(async () => {
    const inquirer = await import('inquirer');
    
    try {
      logger.info('🎯 Interactive Database Seeding');
      
      const answers = await inquirer.default.prompt([
        {
          type: 'checkbox',
          name: 'components',
          message: 'Select components to seed:',
          choices: [
            { name: 'Prompts from AI Pipeline', value: 'prompts', checked: true },
            { name: 'Test Cases', value: 'testCases', checked: true },
            { name: 'Sample Data', value: 'sampleData', checked: false },
            { name: 'Performance Tests', value: 'performanceTests', checked: false },
            { name: 'Prompt Variations (A/B)', value: 'variations', checked: false },
            { name: 'Version History', value: 'versionHistory', checked: false }
          ]
        },
        {
          type: 'confirm',
          name: 'skipExisting',
          message: 'Skip items that already exist?',
          default: true
        },
        {
          type: 'confirm',
          name: 'dryRun',
          message: 'Perform dry run (preview only)?',
          default: false
        }
      ]);

      const seedingOptions: SeedingOptions = {
        includePrompts: answers.components.includes('prompts'),
        includeTestCases: answers.components.includes('testCases'),
        includeSampleData: answers.components.includes('sampleData'),
        includePerformanceTests: answers.components.includes('performanceTests'),
        includeVariations: answers.components.includes('variations'),
        includeVersionHistory: answers.components.includes('versionHistory'),
        skipExisting: answers.skipExisting,
        dryRun: answers.dryRun
      };

      logger.info('Starting seeding with selected options...');
      await seedDatabase(seedingOptions);
      logger.info('✅ Interactive seeding completed successfully');
      
    } catch (error) {
      logger.error('❌ Interactive seeding failed:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
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