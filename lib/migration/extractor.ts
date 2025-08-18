import { DiagramType, AgentType } from '../database/types';

/**
 * Extracted prompt data structure - UNIFIED ARCHITECTURE ONLY
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
    architectureVersion: 'unified';
  };
}

/**
 * Extract prompts from the MasterClassifier
 */
export function extractMasterClassifierPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  prompts.push({
    name: 'master-classifier-comprehensive',
    description: 'Comprehensive classification for all routing decisions in a single LLM call',
    template: `{baseSystemPrompt}

You are a master classifier for PlantUML diagram operations. Your task is to comprehensively analyze the user's request and provide a complete classification in a single response.

CONTEXT:
- User Input: {userInput}
- Current Diagram: {currentDiagram}
- Conversation History: {conversationHistory}

CLASSIFICATION TASK:
Analyze the user's request and determine:

1. PRIMARY INTENT:
   - GENERATE: User wants to create a new diagram or completely different one
   - MODIFY: User wants to change, update, or edit an existing diagram
   - ANALYZE: User wants to understand, explain, or get insights about a diagram
   - UNKNOWN: Intent cannot be clearly determined

2. DIAGRAM TYPE (if applicable):
   - SEQUENCE: Interactions between components over time
   - CLASS: System structure, objects, and relationships
   - ACTIVITY: Workflows, processes, and business logic
   - STATE: State transitions and behaviors
   - COMPONENT: System components and interfaces
   - DEPLOYMENT: Physical deployment of components
   - USE_CASE: System/actor interactions and use cases
   - ENTITY_RELATIONSHIP: Data modeling and database schemas
   - UNKNOWN: Cannot determine type

3. ANALYSIS TYPE (for ANALYZE intent):
   - GENERAL: Overall assessment and explanation
   - QUALITY: Best practices and quality assessment
   - COMPONENTS: Inventory and explanation of parts
   - RELATIONSHIPS: Analysis of connections and associations
   - COMPLEXITY: Complexity and maintainability assessment
   - IMPROVEMENTS: Suggestions for enhancement

4. CONFIDENCE ASSESSMENT:
   - Provide numerical confidence (0.0 to 1.0)
   - Explain your reasoning
   - Consider context and clarity of the request

CLASSIFICATION GUIDELINES:

For GENERATE intent:
- Look for words like: create, generate, build, make, new, design
- User wants something that doesn't exist yet
- May specify diagram type or describe what they want

For MODIFY intent:
- Look for words like: modify, change, update, edit, add, remove, delete
- User references existing diagram or wants changes
- Requires current diagram context

For ANALYZE intent:
- Look for words like: analyze, explain, describe, review, check, what, how, why
- User wants to understand or get insights
- May specify what aspect to analyze

DIAGRAM TYPE DETECTION:
- Look for explicit mentions of diagram types
- Infer from context (e.g., "login flow" suggests SEQUENCE)
- Consider domain (e.g., "database design" suggests ENTITY_RELATIONSHIP)
- Default to most likely type based on intent and context

{formatInstructions}

IMPORTANT:
- Be thorough in your analysis but concise in reasoning
- Always provide confidence score with justification
- Clean and normalize the user instruction
- Consider the full context when making decisions
- If unsure, be honest about low confidence rather than guessing`,
    variables: ['baseSystemPrompt', 'userInput', 'currentDiagram', 'conversationHistory', 'formatInstructions'],
    agentType: AgentType.MASTER_CLASSIFIER,
    version: '2.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/MasterClassifier.ts',
      extractedAt: new Date(),
      sourceFunction: 'classify',
      architectureVersion: 'unified'
    }
  });

  return prompts;
}

/**
 * Extract prompts from the generator agent
 */
export function extractGeneratorPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  prompts.push({
    name: 'diagram-generator-unified',
    description: 'Simplified diagram generation (type provided by MasterClassifier)',
    template: `{baseSystemPrompt}

You are a specialist in creating PlantUML diagrams based on user requirements.

Current diagram (for reference):
\`\`\`plantuml
{currentDiagram}
\`\`\`

User requirements: {userInput}

Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Available Templates:
{templates}

Based on the requirements, create a detailed PlantUML diagram.
Focus on clarity, proper syntax, and following best practices.

{formatInstructions}`,
    variables: ['baseSystemPrompt', 'currentDiagram', 'userInput', 'diagramType', 'guidelines', 'templates', 'formatInstructions'],
    agentType: AgentType.GENERATOR,
    version: '2.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/generator.ts',
      extractedAt: new Date(),
      sourceFunction: 'generate',
      architectureVersion: 'unified'
    }
  });

  return prompts;
}

/**
 * Extract prompts from the modifier agent
 */
export function extractModifierPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  prompts.push({
    name: 'diagram-modifier-unified',
    description: 'Simplified diagram modification (type provided by MasterClassifier)',
    template: `{baseSystemPrompt}

You are a specialist in modifying PlantUML diagrams based on user instructions.

Current diagram:
\`\`\`plantuml
{currentDiagram}
\`\`\`

User modification request: {userInput}

Diagram type: {diagramType}

PlantUML Guidelines:
{guidelines}

Modify the diagram according to the user's instructions.
Preserve existing structure while implementing the requested changes.
Ensure the modified diagram uses correct PlantUML syntax.

{formatInstructions}`,
    variables: ['baseSystemPrompt', 'currentDiagram', 'userInput', 'diagramType', 'guidelines', 'formatInstructions'],
    agentType: AgentType.MODIFIER,
    version: '2.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/modifier.ts',
      extractedAt: new Date(),
      sourceFunction: 'modify',
      architectureVersion: 'unified'
    }
  });

  return prompts;
}

/**
 * Extract prompts from the analyzer agent
 */
export function extractAnalyzerPrompts(): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];

  prompts.push({
    name: 'diagram-analyzer-unified',
    description: 'Simplified diagram analysis (types provided by MasterClassifier)',
    template: `{baseSystemPrompt}

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
    version: '2.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/ai-pipeline/agents/analyzer.ts',
      extractedAt: new Date(),
      sourceFunction: 'analyze',
      architectureVersion: 'unified'
    }
  });

  return prompts;
}

/**
 * Extract all prompts from the unified AI pipeline
 */
export function extractAllPrompts(): ExtractedPrompt[] {
  return [
    extractBaseSystemPrompt(),
    ...extractMasterClassifierPrompts(),
    ...extractGeneratorPrompts(),
    ...extractModifierPrompts(),
    ...extractAnalyzerPrompts()
  ];
}

/**
 * Extract base system prompt
 */
export function extractBaseSystemPrompt(): ExtractedPrompt {
  return {
    name: 'base-system-prompt',
    description: 'Base system prompt used across all agents',
    template: `You are an expert assistant specializing in PlantUML diagrams. 
You have deep knowledge of PlantUML syntax, best practices, and design patterns.
Always provide accurate, well-structured PlantUML code that follows conventions.`,
    variables: [],
    agentType: AgentType.BASE, // Base system prompt has its own dedicated category
    version: '2.0.0',
    isActive: true,
    metadata: {
      originalFile: 'lib/prompts/embedded.ts',
      extractedAt: new Date(),
      sourceFunction: 'BASE_SYSTEM_PROMPT',
      architectureVersion: 'unified'
    }
  };
}