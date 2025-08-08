# PromptFoo CLI Setup Documentation

## Overview

This document describes the minimal local CLI setup for PromptFoo with database synchronization. This setup allows you to:

1. Pull prompts and test cases from MongoDB to generate PromptFoo YAML configs
2. Run PromptFoo tests locally using the CLI
3. Upload test results back to the database

## Architecture

```
Project Root/
├── .promptfoo/                 # Local CLI directory (git-managed structure)
│   ├── configs/               # Generated YAML config files
│   ├── results/               # JSON result files from PromptFoo
│   ├── temp/                  # Temporary files (gitignored)
│   ├── .env.local            # Local environment variables (gitignored)
│   └── README.md             # Local usage instructions
├── scripts/
│   ├── setup-cli.mjs         # Initial CLI environment setup
│   ├── sync-down.ts          # Pull prompts from DB → generate configs
│   └── sync-up.ts            # Parse results → upload to DB
└── package.json              # New scripts added
```

## Components

### 1. Directory Structure (`.promptfoo/`)

The `.promptfoo` directory contains:
- **configs/**: Generated YAML configuration files for PromptFoo
- **results/**: JSON result files from PromptFoo executions
- **temp/**: Temporary files (ignored by git)
- **.env.local**: Local environment variables (ignored by git)
- **.gitignore**: Ignores temporary files but tracks structure

### 2. Scripts

#### `scripts/setup-cli.mjs`
- Creates directory structure
- Copies main `.env` to `.promptfoo/.env.local`
- Creates usage documentation

#### `scripts/sync-down.ts`
- Connects to MongoDB
- Fetches all active prompts with test cases
- Uses existing `configGenerator.generateConfig()` and `generateYaml()`
- Writes YAML configs with naming: `{agentType}-{operation}-v{version}.yaml`
- Logs summary of synced prompts

#### `scripts/sync-up.ts`
- Scans `.promptfoo/results/` for JSON files
- Uses existing `testResultParser.parseAndStore()`
- Matches results to prompts by config filename pattern
- Saves to MongoDB TestResult collection
- Moves processed files to `processed/` subfolder

### 3. Package.json Scripts

```json
{
  "scripts": {
    "setup-cli": "node scripts/setup-cli.mjs",
    "sync-down": "tsx scripts/sync-down.ts", 
    "sync-up": "tsx scripts/sync-up.ts",
    "cli-test": "cd .promptfoo && promptfoo eval"
  }
}
```

## Usage Workflow

### Initial Setup
```bash
# 1. Set up CLI environment
npm run setup-cli

# 2. Update API keys in .promptfoo/.env.local
# Edit OPENAI_API_KEY, MONGODB_URI, etc.
```

### Regular Workflow
```bash
# 1. Pull latest prompts from database
npm run sync-down

# 2. Run specific test config
cd .promptfoo
promptfoo eval --config configs/generator-create-v1.0.yaml

# 3. Upload results back to database
cd ..
npm run sync-up
```

### Advanced Usage
```bash
# Run with specific output file
cd .promptfoo
promptfoo eval --config configs/analyzer-review-v1.0.yaml --output results/analyzer-results.json

# Run with custom variables
promptfoo eval --config configs/generator-create-v1.0.yaml --var diagramType=sequence

# Run all configs
for config in configs/*.yaml; do
  promptfoo eval --config "$config" --output "results/$(basename "$config" .yaml).json"
done
```

## Configuration File Naming

Generated config files follow the pattern:
`{agentType}-{operation}-v{version}.yaml`

Examples:
- `generator-create-v1.0.yaml`
- `analyzer-review-v2.1.yaml`  
- `modifier-update-v1.5.yaml`

## Integration with Existing Codebase

### Reused Components

1. **Config Generation**: Uses existing `lib/testing/config-generator.ts`
   - `configGenerator.generateConfig()` - Creates config objects
   - `configGenerator.generateYaml()` - Converts to YAML format

2. **Result Parsing**: Uses existing `lib/testing/result-parser.ts`
   - `testResultParser.parseAndStore()` - Parses and stores results
   - `testResultParser.validatePromptFooResult()` - Validates result structure

3. **Database Models**: Uses existing MongoDB models
   - `Prompt` - Fetches active prompts with versions
   - `TestCase` - Fetches associated test cases
   - `TestResult` - Stores parsed test results

### Error Handling

- **Database Connection**: Handles MongoDB connection failures
- **Missing Directories**: Creates directories if they don't exist  
- **File Conflicts**: Overwrites existing config files (no versioning)
- **Invalid JSON**: Handles malformed result files gracefully
- **Missing Prompts**: Logs warnings for prompts without primary versions

### Logging

All scripts use `createEnhancedLogger` for consistent logging:
- **sync-down**: Logs prompt processing, config creation, errors
- **sync-up**: Logs file processing, database uploads, matches
- **setup-cli**: Logs directory creation, file operations

## Limitations & Design Decisions

### Simplicity Focus
- No file watching or real-time sync
- No version conflict resolution (overwrites configs)
- Basic filename-to-prompt matching
- Manual workflow (no automation)

### File Management
- Overwrites existing config files
- Moves processed result files to `processed/` subfolder
- Handles failed results by prefixing with `error_`

### Environment Requirements
- Requires MongoDB connection for sync operations
- Requires PromptFoo CLI installed globally or in PATH
- API keys must be configured in `.env.local`

## Troubleshooting

### Common Issues

1. **tsx/esbuild Platform Issues**
   - Solution: Uses `.mjs` for setup script to avoid platform conflicts
   - Alternative: Install correct esbuild platform package

2. **No Configs Generated**
   - Check database connection in sync-down logs
   - Verify active prompts exist with test cases
   - Check `.env.local` MongoDB URI

3. **Sync-up Failures**
   - Ensure result files are valid JSON
   - Check filename matches expected pattern
   - Verify database connection

4. **Permission Errors**
   ```bash
   chmod +x scripts/*.ts
   ```

### Debug Mode

Enable verbose logging by setting:
```bash
export DEBUG=promptfoo*
```

## Future Enhancements

Potential improvements (not implemented):
- File watching for automatic sync
- Version conflict resolution
- Better filename-to-prompt matching
- Bulk test execution commands
- Result visualization integration
- Configuration validation
- Rollback capabilities

## Security Considerations

- `.env.local` is gitignored (contains API keys)
- `results/` directory is gitignored (may contain sensitive test data)
- `temp/` directory is gitignored (temporary files)
- Config files are tracked (contain prompt templates but no secrets)