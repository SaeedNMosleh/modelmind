#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, Prompt, TestCase, disconnectFromDatabase } from '../lib/database/index.js';
import { configGenerator } from '../lib/testing/config-generator.js';
import { createEnhancedLogger } from '../lib/utils/consola-logger.js';
import { IPrompt, ITestCase } from '../lib/database/types.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createEnhancedLogger('sync-down');

interface SyncSummary {
  totalPrompts: number;
  configsCreated: number;
  skipped: number;
  errors: string[];
}

async function syncDown() {
  const summary: SyncSummary = {
    totalPrompts: 0,
    configsCreated: 0,
    skipped: 0,
    errors: []
  };

  try {
    const projectRoot = resolve(__dirname, '..');
    const configsDir = resolve(projectRoot, '.promptfoo', 'configs');
    
    // Ensure configs directory exists
    await fs.mkdir(configsDir, { recursive: true });
    
    logger.info('Connecting to database...');
    await connectToDatabase();
    
    logger.info('Fetching active prompts...');
    
    // Fetch all prompts (the schema doesn't have isActive or isDeleted fields)
    const prompts = await Prompt.find({}).lean() as unknown as IPrompt[];
    
    summary.totalPrompts = prompts.length;
    logger.info(`Found ${prompts.length} active prompts`);
    
    for (const prompt of prompts) {
      try {
        logger.info(`Processing prompt: ${prompt.name}`);
        
        // Get test cases for this prompt
        const testCases = await TestCase.find({
          promptId: prompt._id,
          isActive: true
        }).lean() as unknown as ITestCase[];
        
        logger.info(`Found ${testCases.length} test cases for prompt ${prompt.name}`);
        
        // Generate config for the primary version
        const activeVersion = prompt.versions.find(v => v.version === prompt.primaryVersion);
        if (!activeVersion) {
          logger.warn(`No primary version found for prompt ${prompt.name}, skipping`);
          summary.skipped++;
          continue;
        }
        
        // Generate configuration
        const { config } = await configGenerator.generateConfig(prompt, testCases, {
          provider: 'openai',
          model: 'gpt-4'
        });
        
        // Generate YAML content using the existing generateYaml method
        const yamlContent = configGenerator.generateYaml(config);
        
        // Create filename: {agentType}-{operation}-{version}.yaml
        const agentType = prompt.agentType || 'unknown';
        const operation = prompt.metadata?.operation || 'general';
        const version = activeVersion.version.replace(/\./g, '-');
        const filename = `${agentType}-${operation}-v${version}.yaml`;
        const filepath = resolve(configsDir, filename);
        
        // Write config file
        await fs.writeFile(filepath, yamlContent, 'utf8');
        
        logger.info(`Created config: ${filename}`);
        summary.configsCreated++;
        
      } catch (error) {
        const errorMsg = `Failed to process prompt ${prompt.name}: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        summary.errors.push(errorMsg);
      }
    }
    
    // Log summary
    logger.info('=== Sync Down Summary ===');
    logger.info(`Total prompts processed: ${summary.totalPrompts}`);
    logger.info(`Configs created: ${summary.configsCreated}`);
    logger.info(`Skipped: ${summary.skipped}`);
    logger.info(`Errors: ${summary.errors.length}`);
    
    if (summary.errors.length > 0) {
      logger.warn('Errors encountered:');
      summary.errors.forEach(error => logger.warn(`  - ${error}`));
    }
    
    if (summary.configsCreated > 0) {
      logger.info('✅ Sync down completed successfully!');
      logger.info('Next steps:');
      logger.info('1. cd .promptfoo');
      logger.info('2. promptfoo eval --config configs/[config-name].yaml');
      logger.info('3. npm run sync-up');
    } else {
      logger.warn('No configurations were created. Check for errors above.');
    }
    
  } catch (error) {
    logger.error('Sync down failed:', error);
  } finally {
    // Always disconnect from database to allow process to exit
    try {
      await disconnectFromDatabase();
      logger.info('Database connection closed');
    } catch (error) {
      logger.warn('Error closing database connection:', error);
    }
  }
}

// Run the script if it's being executed directly
syncDown();

export default syncDown;