import { AgentType, PromptOperation } from '../database/types';

/**
 * Configuration for agent-operation compatibility and diagram type support
 */
export interface AgentOperationConfig {
  agent: AgentType;
  validOperations: PromptOperation[];
  supportsDiagramSpecific: boolean; // Can this agent-operation work with diagram-specific prompts?
  description?: string;
}

/**
 * Matrix defining which agent-operation combinations are valid and support diagram-specific prompts
 */
export const AGENT_OPERATION_MATRIX: AgentOperationConfig[] = [
  {
    agent: AgentType.BASE,
    validOperations: [PromptOperation.BASE_SYSTEM],
    supportsDiagramSpecific: false,
    description: 'Base system prompt provides foundational instructions used across all agents'
  },
  {
    agent: AgentType.GENERATOR,
    validOperations: [PromptOperation.GENERATION],
    supportsDiagramSpecific: false,
    description: 'Generator uses generic prompts with diagram-specific variables injected dynamically'
  },
  {
    agent: AgentType.MODIFIER,
    validOperations: [PromptOperation.MODIFICATION],
    supportsDiagramSpecific: false,
    description: 'Modifier uses generic prompts with diagram-specific variables injected dynamically'
  },
  {
    agent: AgentType.ANALYZER,
    validOperations: [PromptOperation.ANALYSIS],
    supportsDiagramSpecific: false,
    description: 'Analyzer uses generic prompts with diagram-specific variables injected dynamically'
  },
  {
    agent: AgentType.MASTER_CLASSIFIER,
    validOperations: [PromptOperation.COMPREHENSIVE_CLASSIFICATION],
    supportsDiagramSpecific: false,
    description: 'Master classifier operations are always generic, work across all diagram types'
  }
];

/**
 * Check if a given agent-operation combination can have diagram-specific prompts
 */
export const canSelectDiagramTypes = (agent: AgentType, operation: PromptOperation): boolean => {
  const config = AGENT_OPERATION_MATRIX.find(c => c.agent === agent);
  return config?.validOperations.includes(operation) && config?.supportsDiagramSpecific || false;
};

/**
 * Get valid operations for a given agent type
 */
export const getValidOperations = (agent: AgentType): PromptOperation[] => {
  return AGENT_OPERATION_MATRIX.find(c => c.agent === agent)?.validOperations || [];
};

/**
 * Check if an agent-operation combination is valid
 */
export const isValidAgentOperation = (agent: AgentType, operation: PromptOperation): boolean => {
  const validOps = getValidOperations(agent);
  return validOps.includes(operation);
};

/**
 * Get all agents that support a given operation
 */
export const getAgentsForOperation = (operation: PromptOperation): AgentType[] => {
  return AGENT_OPERATION_MATRIX
    .filter(config => config.validOperations.includes(operation))
    .map(config => config.agent);
};

/**
 * Get configuration for a specific agent
 */
export const getAgentConfig = (agent: AgentType): AgentOperationConfig | undefined => {
  return AGENT_OPERATION_MATRIX.find(c => c.agent === agent);
};

/**
 * Check if any of the selected agents support diagram-specific prompts
 */
export const anyAgentSupportsDiagramSpecific = (agents: AgentType[]): boolean => {
  return agents.some(agent => {
    const config = getAgentConfig(agent);
    return config?.supportsDiagramSpecific || false;
  });
};

/**
 * Filter operations based on selected agents
 */
export const getAvailableOperations = (selectedAgents: AgentType[]): PromptOperation[] => {
  if (selectedAgents.length === 0) {
    return Object.values(PromptOperation);
  }
  
  const validOperations = new Set<PromptOperation>();
  selectedAgents.forEach(agent => {
    getValidOperations(agent).forEach(op => validOperations.add(op));
  });
  
  return Array.from(validOperations);
};

/**
 * Get all available agent types (only those defined in the matrix)
 */
export const getAvailableAgentTypes = (): AgentType[] => {
  return AGENT_OPERATION_MATRIX.map(config => config.agent);
};