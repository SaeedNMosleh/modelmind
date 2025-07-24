import { DiagramType, AgentType } from '../database/types';

/**
 * Extracted prompt data structure
 */
export interface ExtractedPrompt {
  name: string;
  description: string;
  template: string;
  variables: string[];
  agentType: AgentType;
  diagramType?: DiagramType;
  version: string;
  isActive: boolean;
  metadata: {
    originalFile: string;
    extractedAt: Date;
    sourceFunction?: string;
  };
}

/**
 * Extract prompts from the generator agent
 */
export function extractGeneratorPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  // Main generation prompt
  prompts.push({
    name: 'diagram-generator-main',
    description: 'Main prompt for generating PlantUML diagrams from user requirements',
    template: `${'{baseSystemPrompt}'}

You are a specialist in creating PlantUML diagrams based on user requirements.

User requirements: {userInput}

Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Available Templates:
{templates}

Based on the requirements, create a detailed PlantUML diagram.
Focus on clarity, proper syntax, and following best practices.

{formatInstructions}`,
    variables: ['baseSystemPrompt', 'userInput', 'diagramType', 'guidelines', 'templates', 'formatInstructions'],
    agentType: AgentType.GENERATOR,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/generator.ts',
      extractedAt: new Date(),
      sourceFunction: 'generate'
    }
  });

  // Diagram type detection prompt
  prompts.push({
    name: 'diagram-type-detector',
    description: 'Detects the most appropriate PlantUML diagram type from user input',
    template: `${'{baseSystemPrompt}'}

Determine the most appropriate PlantUML diagram type based on the user's request:

User request: {userInput}

Valid diagram types:
- SEQUENCE: for interactions between components over time
- CLASS: for system structure and relationships
- ACTIVITY: for workflows and processes
- STATE: for state transitions and behaviors
- COMPONENT: for system components and interfaces
- DEPLOYMENT: for physical deployment of components
- USE_CASE: for system/actor interactions
- ENTITY_RELATIONSHIP: for data modeling

Return ONLY one of these types that best matches the user's request.`,
    variables: ['baseSystemPrompt', 'userInput'],
    agentType: AgentType.GENERATOR,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/generator.ts',
      extractedAt: new Date(),
      sourceFunction: 'detectDiagramType'
    }
  });

  return prompts;
}

/**
 * Extract prompts from the modifier agent
 */
export function extractModifierPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  // Main modification prompt
  prompts.push({
    name: 'diagram-modifier-main',
    description: 'Main prompt for modifying existing PlantUML diagrams',
    template: `${'{baseSystemPrompt}'}

You are a specialist in modifying PlantUML diagrams based on user instructions.

Current diagram:
\`\`\`plantuml
{currentDiagram}
\`\`\`

User modification request: {userInput}

PlantUML Guidelines:
{guidelines}

Modify the diagram according to the user's instructions.
Preserve existing structure while implementing the requested changes.
Ensure the modified diagram uses correct PlantUML syntax.

{formatInstructions}`,
    variables: ['baseSystemPrompt', 'currentDiagram', 'userInput', 'guidelines', 'formatInstructions'],
    agentType: AgentType.MODIFIER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/modifier.ts',
      extractedAt: new Date(),
      sourceFunction: 'modify'
    }
  });

  // Retry modification prompt
  prompts.push({
    name: 'diagram-modifier-retry',
    description: 'Retry prompt for modifications that failed to make changes',
    template: `${'{baseSystemPrompt}'}

You are a specialist in modifying PlantUML diagrams based on user instructions.

Current diagram:
\`\`\`plantuml
{currentDiagram}
\`\`\`

User modification request: {userInput}

IMPORTANT: You MUST make the specific changes requested by the user.
The previous attempt did not implement any changes.

Carefully analyze the diagram and implement the requested modifications.
Focus on the specific elements the user wants to change.

Modified diagram (full code, starting with @startuml and ending with @enduml):`,
    variables: ['baseSystemPrompt', 'currentDiagram', 'userInput'],
    agentType: AgentType.MODIFIER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/modifier.ts',
      extractedAt: new Date(),
      sourceFunction: 'retryModification'
    }
  });

  // Changes list prompt
  prompts.push({
    name: 'diagram-modifier-changes',
    description: 'Generates a list of changes made to a diagram',
    template: `${'{baseSystemPrompt}'}

You have modified a PlantUML diagram based on this request:
"{userInput}"

List the specific changes you made, one per line.
Be concise but clear. Start each line with "- ".`,
    variables: ['baseSystemPrompt', 'userInput'],
    agentType: AgentType.MODIFIER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/modifier.ts',
      extractedAt: new Date(),
      sourceFunction: 'retryModification'
    }
  });

  // Diagram type detection for modifier
  prompts.push({
    name: 'diagram-type-detector-modifier',
    description: 'Detects diagram type from existing PlantUML code for modification',
    template: `${'{baseSystemPrompt}'}

Determine the type of the following PlantUML diagram:

\`\`\`plantuml
{diagram}
\`\`\`

Return ONLY one of these types that best matches the diagram:
SEQUENCE, CLASS, ACTIVITY, STATE, COMPONENT, DEPLOYMENT, USE_CASE, ENTITY_RELATIONSHIP`,
    variables: ['baseSystemPrompt', 'diagram'],
    agentType: AgentType.MODIFIER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/modifier.ts',
      extractedAt: new Date(),
      sourceFunction: 'detectDiagramType'
    }
  });

  return prompts;
}

/**
 * Extract prompts from the analyzer agent
 */
export function extractAnalyzerPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  // Main analysis prompt
  prompts.push({
    name: 'diagram-analyzer-main',
    description: 'Main prompt for analyzing PlantUML diagrams',
    template: `${'{baseSystemPrompt}'}

You are a specialist in analyzing PlantUML diagrams.

Diagram to analyze:
\`\`\`plantuml
{diagram}
\`\`\`

User analysis request: {userInput}

Analysis type: {analysisType}
Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Analyze the diagram based on the analysis type and user request.
Provide detailed and insightful analysis.

{formatInstructions}`,
    variables: ['baseSystemPrompt', 'diagram', 'userInput', 'analysisType', 'diagramType', 'guidelines', 'formatInstructions'],
    agentType: AgentType.ANALYZER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/analyzer.ts',
      extractedAt: new Date(),
      sourceFunction: 'analyze'
    }
  });

  // Analysis type detection prompt
  prompts.push({
    name: 'analysis-type-detector',
    description: 'Detects the most appropriate analysis type from user input',
    template: `${'{baseSystemPrompt}'}

Determine the most appropriate type of analysis based on the user's request:

User request: {userInput}

Select the MOST appropriate analysis type from these options:
- GENERAL: Overall assessment of the diagram
- QUALITY: Assessment of diagram quality and best practices
- COMPONENTS: Inventory and explanation of diagram components
- RELATIONSHIPS: Analysis of relationships between components
- COMPLEXITY: Assessment of diagram complexity
- IMPROVEMENTS: Suggestions for improving the diagram

Return ONLY one of these types (just the word).`,
    variables: ['baseSystemPrompt', 'userInput'],
    agentType: AgentType.ANALYZER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/analyzer.ts',
      extractedAt: new Date(),
      sourceFunction: 'detectAnalysisType'
    }
  });

  // Diagram type detection for analyzer
  prompts.push({
    name: 'diagram-type-detector-analyzer',
    description: 'Detects diagram type from existing PlantUML code for analysis',
    template: `${'{baseSystemPrompt}'}

Determine the type of the following PlantUML diagram:

\`\`\`plantuml
{diagram}
\`\`\`

Return ONLY one of these types that best matches the diagram:
SEQUENCE, CLASS, ACTIVITY, STATE, COMPONENT, DEPLOYMENT, USE_CASE, ENTITY_RELATIONSHIP`,
    variables: ['baseSystemPrompt', 'diagram'],
    agentType: AgentType.ANALYZER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/analyzer.ts',
      extractedAt: new Date(),
      sourceFunction: 'detectDiagramType'
    }
  });

  return prompts;
}

/**
 * Extract prompts from the input processor
 */
export function extractInputProcessorPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  // Intent classification prompt (simple)
  prompts.push({
    name: 'intent-classifier-simple',
    description: 'Simple intent classification for user requests',
    template: `${'{baseSystemPrompt}'}

Your task is to classify the user's intent regarding PlantUML diagrams.

Current diagram present: {currentDiagramStatus}

User request: {userInput}

{conversationHistory}

Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).

Return ONLY ONE WORD: GENERATE, MODIFY, ANALYZE, or UNKNOWN.

If you cannot clearly determine the user's intent, respond with UNKNOWN.`,
    variables: ['baseSystemPrompt', 'currentDiagramStatus', 'userInput', 'conversationHistory'],
    agentType: AgentType.CLASSIFIER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/inputProcessor.ts',
      extractedAt: new Date(),
      sourceFunction: 'classifyIntent'
    }
  });

  // Intent classification prompt (detailed)
  prompts.push({
    name: 'intent-classifier-detailed',
    description: 'Detailed intent classification with confidence and parameters',
    template: `${'{baseSystemPrompt}'}

Your task is to classify the user's intent regarding PlantUML diagrams.

Current diagram present: {currentDiagramStatus}

User request: {userInput}

{conversationHistory}

Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).

Analyze the confidence of your classification on a scale from 0 to 1.

{formatInstructions}`,
    variables: ['baseSystemPrompt', 'currentDiagramStatus', 'userInput', 'conversationHistory', 'formatInstructions'],
    agentType: AgentType.CLASSIFIER,
    version: '1.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/inputProcessor.ts',
      extractedAt: new Date(),
      sourceFunction: 'classifyIntent'
    }
  });

  return prompts;
}

/**
 * Extract all prompts from the AI pipeline
 */
export function extractAllPrompts(): ExtractedPrompt[] {
  return [
    ...extractGeneratorPrompts(),
    ...extractModifierPrompts(),
    ...extractAnalyzerPrompts(),
    ...extractInputProcessorPrompts()
  ];
}

/**
 * Get base system prompt from the baseChain
 */
export function getBaseSystemPrompt(): string {
  return "You are an AI assistant specialized in PlantUML diagrams.";
}