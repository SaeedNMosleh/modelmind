import { AgentType, PromptOperation, DiagramType, IPrompt } from '../database/types';
import { canSelectDiagramTypes, isValidAgentOperation } from '../prompt-mgmt/agent-operation-config';

/**
 * Validation result for prompt loading
 */
export interface PromptValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  shouldCleanDiagramTypes: boolean;
  cleanedDiagramTypes?: DiagramType[];
}

/**
 * Validate a prompt configuration according to agent-operation rules
 */
export function validatePromptConfig(
  agentType: AgentType | string,
  operation: PromptOperation | string,
  diagramTypes: DiagramType[] = []
): PromptValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let shouldCleanDiagramTypes = false;
  let cleanedDiagramTypes: DiagramType[] = diagramTypes;

  // Ensure we have valid enum values
  const agentEnum = Object.values(AgentType).includes(agentType as AgentType) 
    ? agentType as AgentType 
    : null;
  const operationEnum = Object.values(PromptOperation).includes(operation as PromptOperation) 
    ? operation as PromptOperation 
    : null;

  if (!agentEnum) {
    errors.push(`Invalid agent type: ${agentType}`);
  }

  if (!operationEnum) {
    errors.push(`Invalid operation: ${operation}`);
  }

  if (agentEnum && operationEnum) {
    // Check agent-operation compatibility
    if (!isValidAgentOperation(agentEnum, operationEnum)) {
      errors.push(`Invalid agent-operation combination: ${agentEnum}/${operationEnum}`);
    }

    // Check diagram type support
    const supportsDiagramTypes = canSelectDiagramTypes(agentEnum, operationEnum);
    
    if (!supportsDiagramTypes && diagramTypes.length > 0) {
      warnings.push(`Agent ${agentEnum} with operation ${operationEnum} doesn't support diagram-specific prompts. Diagram types will be cleared.`);
      shouldCleanDiagramTypes = true;
      cleanedDiagramTypes = [];
    } else if (supportsDiagramTypes && diagramTypes.length === 0) {
      warnings.push(`Agent ${agentEnum} with operation ${operationEnum} can support diagram-specific prompts but is currently generic.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    shouldCleanDiagramTypes,
    cleanedDiagramTypes
  };
}

/**
 * Clean and validate a prompt object
 */
export function cleanPromptData(prompt: Partial<IPrompt>): {
  cleaned: Partial<IPrompt>;
  validation: PromptValidationResult;
} {
  const validation = validatePromptConfig(
    prompt.agentType!,
    prompt.operation!,
    prompt.diagramType || []
  );

  const cleaned: Partial<IPrompt> = {
    ...prompt
  };

  // Apply diagram type cleaning if needed
  if (validation.shouldCleanDiagramTypes && validation.cleanedDiagramTypes !== undefined) {
    cleaned.diagramType = validation.cleanedDiagramTypes;
  }

  return {
    cleaned,
    validation
  };
}

/**
 * Utility to check if a prompt loading query needs diagram type filtering
 */
export function shouldFilterByDiagramType(
  agentType: AgentType | string,
  operation: PromptOperation | string,
  diagramType?: string
): boolean {
  // Only filter by diagram type if:
  // 1. A diagram type is specified
  // 2. The agent-operation combination supports diagram-specific prompts
  if (!diagramType) return false;
  
  const agentEnum = Object.values(AgentType).includes(agentType as AgentType) 
    ? agentType as AgentType 
    : null;
  const operationEnum = Object.values(PromptOperation).includes(operation as PromptOperation) 
    ? operation as PromptOperation 
    : null;

  if (!agentEnum || !operationEnum) return false;

  return canSelectDiagramTypes(agentEnum, operationEnum);
}