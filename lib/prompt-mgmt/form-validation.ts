import { AgentType, PromptOperation, DiagramType } from '../database/types';
import { PromptFormData, TemplateVariable } from './types';
import { 
  isValidAgentOperation, 
  canSelectDiagramTypes, 
  getValidOperations,
  getAgentConfig 
} from './agent-operation-config';

/**
 * Validation error with context
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Comprehensive validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: ValidationError[];
}

/**
 * Validate prompt form data with agent-operation logic
 */
export function validatePromptForm(formData: PromptFormData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const suggestions: ValidationError[] = [];

  // 1. Agent-Operation compatibility
  if (!isValidAgentOperation(formData.agentType, formData.operation)) {
    errors.push({
      field: 'operation',
      message: `Operation "${formData.operation}" is not compatible with agent "${formData.agentType}"`,
      code: 'INVALID_AGENT_OPERATION',
      severity: 'error'
    });

    // Suggest valid operations
    const validOps = getValidOperations(formData.agentType);
    if (validOps.length > 0) {
      suggestions.push({
        field: 'operation',
        message: `Valid operations for ${formData.agentType}: ${validOps.join(', ')}`,
        code: 'SUGGEST_VALID_OPERATIONS',
        severity: 'info'
      });
    }
  }

  // 2. Diagram types validation
  const supportsDiagramTypes = canSelectDiagramTypes(formData.agentType, formData.operation);
  
  if (!supportsDiagramTypes && formData.diagramType.length > 0) {
    warnings.push({
      field: 'diagramType',
      message: `Agent "${formData.agentType}" with operation "${formData.operation}" doesn't support diagram-specific prompts. Diagram types will be ignored.`,
      code: 'DIAGRAM_TYPES_NOT_SUPPORTED',
      severity: 'warning'
    });
  } else if (supportsDiagramTypes && formData.diagramType.length === 0) {
    suggestions.push({
      field: 'diagramType',
      message: `This agent-operation combination can support diagram-specific prompts. Consider selecting specific diagram types for better targeting.`,
      code: 'SUGGEST_DIAGRAM_TYPES',
      severity: 'info'
    });
  }

  // 3. Required fields validation
  if (!formData.name?.trim()) {
    errors.push({
      field: 'name',
      message: 'Prompt name is required',
      code: 'REQUIRED_FIELD',
      severity: 'error'
    });
  }

  if (!formData.template?.trim()) {
    errors.push({
      field: 'template',
      message: 'Prompt template is required',
      code: 'REQUIRED_FIELD',
      severity: 'error'
    });
  }

  if (!formData.changelog?.trim()) {
    warnings.push({
      field: 'changelog',
      message: 'Adding a changelog helps track changes',
      code: 'MISSING_CHANGELOG',
      severity: 'warning'
    });
  }

  // 4. Template syntax validation
  if (formData.template) {
    const templateValidation = validateTemplateVariables(formData.template);
    errors.push(...templateValidation.errors);
    warnings.push(...templateValidation.warnings);
  }

  // 5. Production status validation
  if (typeof formData.isProduction !== 'boolean') {
    errors.push({
      field: 'isProduction',
      message: 'Production status must be specified',
      code: 'REQUIRED_FIELD',
      severity: 'error'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate template variables syntax
 */
export function validateTemplateVariables(template: string): {
  errors: ValidationError[];
  warnings: ValidationError[];
  variables: string[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const variables: string[] = [];

  // Extract variables using regex
  const variableRegex = /\{([^}]+)\}/g;
  let match;

  while ((match = variableRegex.exec(template)) !== null) {
    const variable = match[1].trim();
    
    if (!variable) {
      errors.push({
        field: 'template',
        message: 'Empty variable placeholder found: {}',
        code: 'EMPTY_VARIABLE',
        severity: 'error'
      });
      continue;
    }

    // Check for valid variable names
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable)) {
      warnings.push({
        field: 'template',
        message: `Variable "${variable}" uses non-standard naming. Consider using camelCase.`,
        code: 'VARIABLE_NAMING',
        severity: 'warning'
      });
    }

    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }

  // Check for unmatched braces
  const openBraces = (template.match(/\{/g) || []).length;
  const closeBraces = (template.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push({
      field: 'template',
      message: 'Unmatched braces in template. Check your variable syntax.',
      code: 'UNMATCHED_BRACES',
      severity: 'error'
    });
  }

  return {
    errors,
    warnings,
    variables
  };
}

/**
 * Validate individual template variable configuration
 */
export function validateTemplateVariable(variable: TemplateVariable): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name validation
  if (!variable.name?.trim()) {
    errors.push({
      field: 'name',
      message: 'Variable name is required',
      code: 'REQUIRED_FIELD',
      severity: 'error'
    });
  } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable.name)) {
    errors.push({
      field: 'name',
      message: 'Variable name must start with a letter and contain only letters, numbers, and underscores',
      code: 'INVALID_VARIABLE_NAME',
      severity: 'error'
    });
  }

  // Type-specific validation
  if (variable.type === 'enum' && (!variable.validation?.enum || variable.validation.enum.length === 0)) {
    errors.push({
      field: 'validation',
      message: 'Enum type requires at least one option in validation.enum',
      code: 'ENUM_NO_OPTIONS',
      severity: 'error'
    });
  }

  // Validation rules consistency
  if (variable.validation) {
    const val = variable.validation;
    
    if (val.min !== undefined && val.max !== undefined && val.min > val.max) {
      errors.push({
        field: 'validation',
        message: 'Minimum value cannot be greater than maximum value',
        code: 'INVALID_RANGE',
        severity: 'error'
      });
    }
    
    if (val.minLength !== undefined && val.maxLength !== undefined && val.minLength > val.maxLength) {
      errors.push({
        field: 'validation',
        message: 'Minimum length cannot be greater than maximum length',
        code: 'INVALID_LENGTH_RANGE',
        severity: 'error'
      });
    }
  }

  return errors;
}

/**
 * Get suggestions for improving prompt configuration
 */
export function getPromptSuggestions(formData: PromptFormData): ValidationError[] {
  const suggestions: ValidationError[] = [];
  
  const agentConfig = getAgentConfig(formData.agentType);
  
  if (agentConfig?.description) {
    suggestions.push({
      field: 'info',
      message: agentConfig.description,
      code: 'AGENT_INFO',
      severity: 'info'
    });
  }

  // Suggest tags based on agent type
  if (formData.tags.length === 0) {
    const suggestedTags = [`agent:${formData.agentType}`, `op:${formData.operation}`];
    suggestions.push({
      field: 'tags',
      message: `Consider adding tags for better organization: ${suggestedTags.join(', ')}`,
      code: 'SUGGEST_TAGS',
      severity: 'info'
    });
  }

  return suggestions;
}

/**
 * Real-time validation for form fields
 */
export function validateFormField(
  field: keyof PromptFormData, 
  value: unknown, 
  formData: PromptFormData
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  switch (field) {
    case 'agentType':
      // When agent type changes, validate operation compatibility
      if (value && formData.operation && !isValidAgentOperation(value as AgentType, formData.operation)) {
        errors.push({
          field: 'operation',
          message: `Current operation "${formData.operation}" is not compatible with agent "${value}"`,
          code: 'INCOMPATIBLE_AFTER_AGENT_CHANGE',
          severity: 'error'
        });
      }
      break;
      
    case 'operation':
      // When operation changes, validate agent compatibility
      if (value && !isValidAgentOperation(formData.agentType, value as PromptOperation)) {
        errors.push({
          field: 'operation',
          message: `Operation "${value}" is not compatible with agent "${formData.agentType}"`,
          code: 'INVALID_AGENT_OPERATION',
          severity: 'error'
        });
      }
      break;
      
    case 'template':
      // Validate template syntax in real-time
      if (typeof value === 'string' && value.trim()) {
        const templateValidation = validateTemplateVariables(value);
        errors.push(...templateValidation.errors);
      }
      break;
      
    case 'isProduction':
      // Validate production status in real-time
      if (typeof value !== 'boolean') {
        errors.push({
          field: 'isProduction',
          message: 'Production status must be a boolean value',
          code: 'INVALID_TYPE',
          severity: 'error'
        });
      }
      break;
  }
  
  return errors;
}

/**
 * Check if form data has unsaved changes that would be lost
 */
export function hasUnsavedChanges(
  currentData: PromptFormData, 
  originalData: PromptFormData
): boolean {
  // Compare key fields
  const fieldsToCompare: (keyof PromptFormData)[] = [
    'name', 'agentType', 'operation', 'template', 'diagramType', 'isProduction', 'tags'
  ];
  
  return fieldsToCompare.some(field => {
    const current = currentData[field];
    const original = originalData[field];
    
    if (Array.isArray(current) && Array.isArray(original)) {
      return JSON.stringify(current.sort()) !== JSON.stringify(original.sort());
    }
    
    return current !== original;
  });
}

/**
 * Get display label for production status
 */
export function getProductionStatusLabel(isProduction: boolean): string {
  return isProduction ? 'Production' : 'Development';
}

/**
 * Get activation button state for a prompt
 */
export function getActivationButtonState(
  isProduction: boolean,
  isOnlyPromptForOperation: boolean
): {
  isVisible: boolean;
  isClickable: boolean;
  buttonText: string;
} {
  if (isProduction) {
    return {
      isVisible: true,
      isClickable: !isOnlyPromptForOperation,
      buttonText: 'Active'
    };
  }

  return {
    isVisible: true,
    isClickable: true,
    buttonText: 'Activate'
  };
}

/**
 * Diagram type display configuration interface
 */
export interface DiagramTypeDisplayConfig {
  readonly isReadOnly: true;
  readonly displayTypes: readonly DiagramType[];
  readonly displayLabel: string;
  readonly showAsGeneric: boolean;
}

/**
 * Determines how diagram types should be displayed in the UI
 * Based on the prompt's diagram type configuration from the database
 */
export function getDiagramTypeDisplayConfig(
  diagramTypes: readonly DiagramType[]
): DiagramTypeDisplayConfig {
  // If diagram types array is empty, this is a generic prompt
  if (diagramTypes.length === 0) {
    return {
      isReadOnly: true,
      displayTypes: [],
      displayLabel: 'All Diagram Types',
      showAsGeneric: true
    };
  }

  // Specific diagram types are defined
  return {
    isReadOnly: true,
    displayTypes: diagramTypes,
    displayLabel: formatDiagramTypesLabel(diagramTypes),
    showAsGeneric: false
  };
}

/**
 * Formats diagram types into a readable label
 */
function formatDiagramTypesLabel(diagramTypes: readonly DiagramType[]): string {
  if (diagramTypes.length === 0) {
    return 'All Diagram Types';
  }

  if (diagramTypes.length === 1) {
    return formatSingleDiagramType(diagramTypes[0]);
  }

  if (diagramTypes.length <= 3) {
    return diagramTypes.map(formatSingleDiagramType).join(', ');
  }

  return `${diagramTypes.length} specific types`;
}

/**
 * Formats a single diagram type for display
 */
function formatSingleDiagramType(diagramType: DiagramType): string {
  switch (diagramType) {
    case DiagramType.SEQUENCE:
      return 'Sequence';
    case DiagramType.CLASS:
      return 'Class';
    case DiagramType.ACTIVITY:
      return 'Activity';
    case DiagramType.STATE:
      return 'State';
    case DiagramType.COMPONENT:
      return 'Component';
    case DiagramType.DEPLOYMENT:
      return 'Deployment';
    case DiagramType.USE_CASE:
      return 'Use Case';
    case DiagramType.ENTITY_RELATIONSHIP:
      return 'Entity Relationship';
    case DiagramType.UNKNOWN:
      return 'Unknown';
    default:
      const typeStr = String(diagramType);
      return typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase().replace('_', ' ');
  }
}