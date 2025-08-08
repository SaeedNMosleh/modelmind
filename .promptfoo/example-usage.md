# PromptFoo CLI Usage Examples

## Quick Start

1. **Initial Setup**
```bash
npm run setup-cli
```

2. **Update .env.local with your API keys**
```bash
# Edit .promptfoo/.env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
MONGODB_URI=mongodb://...
PROMPTFOO_ENABLED=true
```

3. **Sync prompts from database**
```bash
npm run sync-down
```

4. **Run tests**
```bash
cd .promptfoo
promptfoo eval --config configs/generator-create-v1.0.yaml
```

5. **Upload results**
```bash
cd .. 
npm run sync-up
```

## Available Commands

- `npm run setup-cli` - Initial CLI environment setup
- `npm run sync-down` - Pull latest prompts from database to generate configs
- `npm run sync-up` - Upload test results back to database
- `npm run cli-test` - Run promptfoo eval (requires config selection)

## Configuration Files

Generated configs follow the naming pattern:
`{agentType}-{operation}-v{version}.yaml`

Examples:
- `generator-create-v1.0.yaml`
- `analyzer-review-v2.1.yaml`
- `modifier-update-v1.5.yaml`

## Running Specific Tests

```bash
cd .promptfoo

# Run a specific config
promptfoo eval --config configs/generator-create-v1.0.yaml

# Run with specific output file
promptfoo eval --config configs/analyzer-review-v1.0.yaml --output results/analyzer-results.json

# Run with different model
promptfoo eval --config configs/generator-create-v1.0.yaml --var provider=anthropic --var model=claude-3
```

## Advanced Usage

### Custom Variables
```bash
# Override test variables
promptfoo eval --config configs/generator-create-v1.0.yaml --var diagramType=sequence --var complexity=high
```

### Multiple Configs
```bash
# Run all configs
for config in configs/*.yaml; do
  echo "Running $config..."
  promptfoo eval --config "$config" --output "results/$(basename "$config" .yaml).json"
done
```

### Output Formats
```bash
# JSON output (default)
promptfoo eval --config configs/generator-create-v1.0.yaml --output results/output.json

# Table output
promptfoo eval --config configs/generator-create-v1.0.yaml --table

# CSV output  
promptfoo eval --config configs/generator-create-v1.0.yaml --output results/output.csv
```

## Troubleshooting

### No configs generated
- Check database connection in sync-down logs
- Verify active prompts exist with test cases
- Check .env.local for correct MONGODB_URI

### Test failures
- Verify API keys in .env.local
- Check PROMPTFOO_ENABLED=true
- Review generated YAML config syntax

### Sync-up failures
- Ensure result files are valid JSON
- Check filename matches expected pattern
- Verify database connection

### File permissions
```bash
# If you get permission errors
chmod +x scripts/*.ts
```

## Directory Structure
```
.promptfoo/
├── configs/           # Generated YAML configurations
├── results/           # JSON result files from promptfoo
├── temp/             # Temporary files (ignored)
├── .env.local        # Local environment variables
└── README.md         # This file
```