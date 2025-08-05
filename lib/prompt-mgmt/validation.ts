import { AgentType, DiagramType, PromptOperation, PromptEnvironment } from '../database/types';

/**
 * Validation rules for different agent types based on AI pipeline code structure
 */
export const AGENT_RULES = {
  [AgentType.CLASSIFIER]: {
    operations: [PromptOperation.INTENT_CLASSIFICATION] as PromptOperation[],
    allowDiagramTypes: false,
    allowMultipleDiagramTypes: false,
    requiredFields: ['name', 'agentType', 'operation'],
    description: 'Classifies user intent - does not work with specific diagram types'
  },
  [AgentType.GENERATOR]: {
    operations: [PromptOperation.GENERATION] as PromptOperation[],
    allowDiagramTypes: true,
    allowMultipleDiagramTypes: true,
    requiredFields: ['name', 'agentType', 'operation', 'diagramType'],
    description: 'Generates new diagrams - can handle multiple diagram types'
  },
  [AgentType.MODIFIER]: {
    operations: [PromptOperation.MODIFICATION] as PromptOperation[],
    allowDiagramTypes: true,
    allowMultipleDiagramTypes: false,
    requiredFields: ['name', 'agentType', 'operation', 'diagramType'],
    description: 'Modifies existing diagrams - works best with single diagram type'
  },
  [AgentType.ANALYZER]: {
    operations: [PromptOperation.ANALYSIS] as PromptOperation[],
    allowDiagramTypes: true,
    allowMultipleDiagramTypes: false,
    requiredFields: ['name', 'agentType', 'operation', 'diagramType'],
    description: 'Analyzes diagrams - works with single diagram type at a time'
  }
} as const;

/**
 * Default values for new prompts
 */
export const PROMPT_DEFAULTS = {
  agentType: AgentType.GENERATOR,
  diagramType: [DiagramType.SEQUENCE],
  environment: PromptEnvironment.DEVELOPMENT,
  operation: PromptOperation.GENERATION,
  tags: [],
  environments: [PromptEnvironment.DEVELOPMENT]
} as const;

/**
 * Environment rules - mutually exclusive
 */
export const ENVIRONMENT_RULES = {
  mutuallyExclusive: true,
  options: Object.values(PromptEnvironment),
  default: PromptEnvironment.DEVELOPMENT
} as const;

/**
 * Validates form data based on selected agent type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePromptFormData(formData: {
  name: string;
  agentType: AgentType;
  diagramType: DiagramType[];
  operation: PromptOperation;
  environments: PromptEnvironment[];
  template: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const rules = AGENT_RULES[formData.agentType];
  
  // Check required fields
  if (!formData.name?.trim()) {
    errors.push('Name is required');
  }
  
  if (!formData.template?.trim()) {
    errors.push('Template is required');
  }
  
  // Check operation compatibility
  if (!rules.operations.includes(formData.operation)) {
    errors.push(`Operation ${formData.operation} is not compatible with agent type ${formData.agentType}`);
  }
  
  // Check diagram type rules
  if (formData.agentType === AgentType.CLASSIFIER) {
    if (formData.diagramType.length > 0) {
      warnings.push('Classifier agents do not use diagram types - these will be ignored');
    }
  } else if (rules.allowDiagramTypes) {
    if (formData.diagramType.length === 0) {
      errors.push('At least one diagram type is required for this agent type');
    } else if (!rules.allowMultipleDiagramTypes && formData.diagramType.length > 1) {
      warnings.push('This agent type works best with a single diagram type');
    }
  }
  
  // Check environment rules
  if (formData.environments.length === 0) {
    errors.push('At least one environment must be selected');
  } else if (formData.environments.length > 1) {
    // Check for production + development
    if (formData.environments.includes(PromptEnvironment.PRODUCTION) && 
        formData.environments.includes(PromptEnvironment.DEVELOPMENT)) {
      errors.push('Production and Development environments are mutually exclusive');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get default operation for an agent type
 */
export function getDefaultOperation(agentType: AgentType): PromptOperation {
  return AGENT_RULES[agentType].operations[0];
}

/**
 * Check if diagram types should be enabled for an agent type
 */
export function shouldShowDiagramTypes(agentType: AgentType): boolean {
  return AGENT_RULES[agentType].allowDiagramTypes;
}

/**
 * Check if multiple diagram types are allowed for an agent type
 */
export function allowsMultipleDiagramTypes(agentType: AgentType): boolean {
  return AGENT_RULES[agentType].allowMultipleDiagramTypes;
}

/**
 * Get valid operations for an agent type
 */
export function getValidOperations(agentType: AgentType): PromptOperation[] {
  return [...AGENT_RULES[agentType].operations];
}

/**
 * Get description for an agent type
 */
export function getAgentDescription(agentType: AgentType): string {
  return AGENT_RULES[agentType].description;
}