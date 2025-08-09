#!/usr/bin/env node

import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message) {
  console.log(`[setup-cli] ${message}`);
}

function success(message) {
  console.log(`[setup-cli] ✅ ${message}`);
}

function error(message) {
  console.error(`[setup-cli] ❌ ${message}`);
}

function askConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`[setup-cli] ${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function setupCLI() {
  try {
    console.log('🚀 ModelMind PromptFoo CLI Setup');
    console.log('=================================');
    
    const projectRoot = resolve(__dirname, '..');
    const promptfooDir = resolve(projectRoot, '.promptfoo');
    
    // Check if .promptfoo structure exists
    const promptfooDirExists = await checkFileExists(promptfooDir);
    
    if (promptfooDirExists) {
      console.log('⚠️  .promptfoo directory already exists!');
      const shouldReset = await askConfirmation('Do you want to recreate everything fresh?');
      
      if (shouldReset) {
        log('Removing existing .promptfoo directory...');
        await fs.rm(promptfooDir, { recursive: true, force: true });
        success('Removed existing .promptfoo directory');
        await createPromptfooStructure(projectRoot, promptfooDir);
      } else {
        log('Setup cancelled - keeping existing structure');
        return;
      }
    } else {
      log('.promptfoo directory does not exist - creating it...');
      await createPromptfooStructure(projectRoot, promptfooDir);
    }
    
    success('PromptFoo CLI setup completed successfully!');
    
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    process.exit(1);
  }
}

async function createPromptfooStructure(projectRoot, promptfooDir) {
  log('Creating .promptfoo directory structure...');
  
  // Create directory structure
  const dirs = [
    resolve(promptfooDir, 'configs'),
    resolve(promptfooDir, 'results'),
    resolve(promptfooDir, 'temp'),
    resolve(promptfooDir, 'logs')
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
    success(`Created directory: ${dir.replace(projectRoot, '.')}`);
  }
  
  // Handle environment files
  await createEnvironmentFile(projectRoot, promptfooDir);
  
  // Create documentation
  await createDocumentation(promptfooDir);
  
  // Create gitignore for promptfoo directory
  await createPromptfooGitignore(promptfooDir);
}

async function createEnvironmentFile(projectRoot, promptfooDir) {
  const mainEnvPath = resolve(projectRoot, '.env');
  const localEnvPath = resolve(promptfooDir, '.env.local');
  const envExists = await checkFileExists(mainEnvPath);
  
  if (envExists) {
    await fs.copyFile(mainEnvPath, localEnvPath);
    success('Copied .env to .promptfoo/.env.local');
  } else {
    const templateEnv = `# ModelMind PromptFoo CLI Environment
# Copy your API keys from the main .env file or set them here

# Required: OpenAI API key for LLM operations
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Anthropic API key (if using Claude models)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required: MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/modelmind

# Environment settings
NODE_ENV=development

# PromptFoo settings
PROMPTFOO_ENABLED=false
PROMPTFOO_LOG_LEVEL=info

# ModelMind specific settings
AGENT_OPERATION_VALIDATION=true
`;
    await fs.writeFile(localEnvPath, templateEnv);
    success('Created template .env.local');
    log('📝 Please update .promptfoo/.env.local with your actual API keys!');
  }
}

async function createDocumentation(promptfooDir) {
  const readmePath = resolve(promptfooDir, 'README.md');
  const readmeContent = `# ModelMind PromptFoo CLI Setup

This directory contains the local CLI setup for PromptFoo testing with ModelMind's AI pipeline.

## 📁 Directory Structure

- \`configs/\` - Generated YAML configuration files for PromptFoo
- \`results/\` - JSON result files from PromptFoo executions  
- \`temp/\` - Temporary files (ignored by git)
- \`logs/\` - Execution logs (ignored by git)
- \`.env.local\` - Local environment variables (ignored by git)

## 🚀 Quick Start

### CLI Operations
\`\`\`bash
npm run sync-down               # Pull latest prompts from database
cd .promptfoo && promptfoo eval # Run all tests
npm run sync-up                 # Upload results back to database
npm run db:validate             # Validate database state
\`\`\`

## 🔑 Environment Variables

Update \`.env.local\` with your configuration:

### Required
- \`OPENAI_API_KEY\` - OpenAI API access
- \`MONGODB_URI\` - Database connection string

### Optional  
- \`ANTHROPIC_API_KEY\` - For Claude models
- \`PROMPTFOO_ENABLED=true\` - Enable actual PromptFoo execution
- \`PROMPTFOO_LOG_LEVEL=debug\` - Detailed logging
`;
  
  await fs.writeFile(readmePath, readmeContent);
  success('Created README.md');
}

async function createPromptfooGitignore(promptfooDir) {
  const gitignorePath = resolve(promptfooDir, '.gitignore');
  const gitignoreContent = `# Logs
logs/
*.log

# Environment
.env.local
.env

# Temporary files
temp/

# Results (can be large)
results/*.json

# PromptFoo cache
.cache/

# OS files
.DS_Store
Thumbs.db
`;

  await fs.writeFile(gitignorePath, gitignoreContent);
  success('Created .gitignore for PromptFoo directory');
}


setupCLI();