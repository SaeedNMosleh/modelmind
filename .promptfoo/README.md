# PromptFoo CLI Setup

This directory contains the local CLI setup for PromptFoo testing.

## Directory Structure

- `configs/` - Generated YAML configuration files for PromptFoo
- `results/` - JSON result files from PromptFoo executions  
- `temp/` - Temporary files (ignored by git)
- `.env.local` - Local environment variables (ignored by git)

## Usage

1. **Setup**: `npm run setup-cli`
2. **Sync Down**: `npm run sync-down` (pull latest prompts from database)
3. **Run Tests**: `cd .promptfoo && promptfoo eval --config configs/[config-name].yaml`
4. **Sync Up**: `npm run sync-up` (upload results to database)

## Configuration Files

Config files are named with the pattern: `{agentType}-{operation}-{version}.yaml`

Example: `generator-create-v1.0.yaml`

## Environment Variables

Update `.env.local` with your API keys:
- `OPENAI_API_KEY` - Required for OpenAI models
- `ANTHROPIC_API_KEY` - Required for Anthropic models  
- `MONGODB_URI` - Database connection string
- `PROMPTFOO_ENABLED=true` - Enable actual PromptFoo execution
