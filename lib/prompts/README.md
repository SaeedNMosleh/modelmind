# ModelMind Prompt Engineering System

This directory contains the prompt engineering system for the ModelMind application. The system provides a structured, version-controlled approach to managing AI prompts used throughout the application.

## Directory Structure

```
lib/prompts/
├── templates/             # Prompt templates organized by agent type
│   ├── generator/         # Templates for diagram generation
│   ├── modifier/          # Templates for diagram modification
│   ├── analyzer/          # Templates for diagram analysis
│   └── classifier/        # Templates for intent classification
├── backups/               # Version history of prompts
├── testing/               # PromptFoo integration and evaluators
├── types.ts               # Type definitions
├── registry.ts            # Prompt registry for loading/saving prompts
├── versionManager.ts      # Version control for prompts
├── integration.ts         # Integration with AI pipeline
└── index.ts               # Main entry point
```

## Usage

### Loading Prompts

```typescript
import { promptRegistry, AgentType, PromptOperation } from '@/lib/prompts';

// Load a specific prompt by ID
const prompt = await promptRegistry.loadPrompt('sequence-generation');

// Get the best matching prompt for specific criteria
const generatorPrompt = await promptRegistry.getPrompt(
  AgentType.GENERATOR,
  PromptOperation.GENERATION,
  'sequence'
);

// Access the template
console.log(prompt.template);
```

### Creating/Versioning Prompts

```typescript
import { versionManager, VersionChangeType } from '@/lib/prompts';

// Create a new version of an existing prompt
const newPrompt = await versionManager.createNewVersion(
  'sequence-generation',
  updatedTemplateString,
  VersionChangeType.MINOR
);

// Roll back to a previous version
const rolledBackPrompt = await versionManager.rollbackToVersion(
  'sequence-generation',
  '1.0.0'
);

// Compare versions
const comparison = await versionManager.compareVersions(
  'sequence-generation',
  '1.0.0',
  '1.1.0'
);
```

### Testing with PromptFoo

```typescript
import { promptFooAdapter } from '@/lib/prompts';

// Generate test config for a prompt
const config = await promptFooAdapter.generateConfig(
  'sequence-generation',
  './promptfoo/testCases/sequence-diagram-test-cases.json'
);

// Save the config for use with promptfoo CLI
await promptFooAdapter.saveConfig(config);

// Create test cases from prompt examples
const testCases = await promptFooAdapter.createTestCasesFromExamples(
  'sequence-generation'
);
```

### Pipeline Integration

```typescript
import { initializePromptRegistry, getPipelinePromptTemplate } from '@/lib/prompts';
import { DiagramIntent } from '@/lib/ai-pipeline/inputProcessor';

// Initialize the registry at application startup
await initializePromptRegistry();

// Get a prompt template for use in the AI pipeline
const template = await getPipelinePromptTemplate(
  DiagramIntent.GENERATE,
  'diagramGenerator',
  'sequence'
);
```

## Prompt Metadata Schema

Each prompt template includes metadata with the following fields:

- `id`: Unique identifier
- `name`: Human-readable name
- `agentType`: Type of agent (generator, modifier, analyzer, classifier)
- `diagramType`: Type of diagram (if applicable)
- `operation`: Operation (generation, modification, analysis, intent-classification)
- `version`: Semantic version (major.minor.patch)
- `author`: Creator of the prompt
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `description`: Brief explanation of purpose
- `isProduction`: Whether active in production
- `trafficAllocation`: Percentage of traffic (0-100)
- `environments`: Where the prompt is active
- `tags`: For categorization
- `relatedPrompts`: References to other prompts
- `properties`: Additional settings

## Testing

The system integrates with [PromptFoo](https://promptfoo.dev/) for systematic prompt testing and evaluation. Custom evaluators specific to PlantUML diagrams are provided to assess the quality and correctness of generated diagrams.

To run tests:

1. Install PromptFoo CLI: `npm install -g promptfoo`
2. Run a test: `promptfoo eval -c promptfoo/configs/sequence-diagram-test.json`

## Version Control

Prompts are version-controlled with semantic versioning:

- **Major**: Breaking changes to prompt structure or behavior
- **Minor**: Non-breaking improvements or additions
- **Patch**: Bug fixes and minor adjustments

Version history is stored in the `backups` directory, with automatic backups created when creating new versions.