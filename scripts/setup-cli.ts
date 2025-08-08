#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { resolve } from 'path';
import { createEnhancedLogger } from '@/lib/utils/consola-logger';

const logger = createEnhancedLogger('setup-cli');

async function setupCLI() {
  try {
    const projectRoot = resolve(__dirname, '..');
    const promptfooDir = resolve(projectRoot, '.promptfoo');
    
    logger.info('Setting up PromptFoo CLI environment...');
    
    // Ensure directory structure exists
    const dirs = [
      resolve(promptfooDir, 'configs'),
      resolve(promptfooDir, 'results'),
      resolve(promptfooDir, 'temp')
    ];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
        logger.info(`Directory already exists: ${dir}`);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    }
    
    // Copy .env to .env.local if main .env exists
    const mainEnvPath = resolve(projectRoot, '.env');
    const localEnvPath = resolve(promptfooDir, '.env.local');
    
    try {
      await fs.access(mainEnvPath);
      await fs.copyFile(mainEnvPath, localEnvPath);
      logger.info('Copied .env to .promptfoo/.env.local');
    } catch {
      logger.warn('Main .env file not found, skipping copy');
      
      // Create a template .env.local
      const templateEnv = `# PromptFoo CLI Environment
# Copy your API keys from the main .env file
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
MONGODB_URI=your_mongodb_connection_string

# Optional: Set to production to enable actual PromptFoo execution
NODE_ENV=development
PROMPTFOO_ENABLED=false
`;
      await fs.writeFile(localEnvPath, templateEnv);
      logger.info('Created template .env.local - please update with your API keys');
    }
    
    // Create a simple README for the CLI setup
    const readmePath = resolve(promptfooDir, 'README.md');
    const readmeContent = `# PromptFoo CLI Setup

This directory contains the local CLI setup for PromptFoo testing.

## Directory Structure

- \`configs/\` - Generated YAML configuration files for PromptFoo
- \`results/\` - JSON result files from PromptFoo executions  
- \`temp/\` - Temporary files (ignored by git)
- \`.env.local\` - Local environment variables (ignored by git)

## Usage

1. **Setup**: \`npm run setup-cli\`
2. **Sync Down**: \`npm run sync-down\` (pull latest prompts from database)
3. **Run Tests**: \`cd .promptfoo && promptfoo eval --config configs/[config-name].yaml\`
4. **Sync Up**: \`npm run sync-up\` (upload results to database)

## Configuration Files

Config files are named with the pattern: \`{agentType}-{operation}-{version}.yaml\`

Example: \`generator-create-v1.0.yaml\`

## Environment Variables

Update \`.env.local\` with your API keys:
- \`OPENAI_API_KEY\` - Required for OpenAI models
- \`ANTHROPIC_API_KEY\` - Required for Anthropic models  
- \`MONGODB_URI\` - Database connection string
- \`PROMPTFOO_ENABLED=true\` - Enable actual PromptFoo execution
`;
    
    await fs.writeFile(readmePath, readmeContent);
    logger.info('Created README.md with usage instructions');
    
    logger.info('✅ PromptFoo CLI setup complete!');
    logger.info('Next steps:');
    logger.info('1. Update .promptfoo/.env.local with your API keys');
    logger.info('2. Run: npm run sync-down');
    logger.info('3. Run: cd .promptfoo && promptfoo eval');
    
  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupCLI();
}

export default setupCLI;