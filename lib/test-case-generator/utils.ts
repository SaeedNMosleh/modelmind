import { TemplateVariable } from '@/lib/prompt-mgmt/types';
import { TestCase, VariablePreset, PresetApplicationState, ModelConfiguration, TestCaseFormData } from './types';

export interface TestCaseVariable {
  name: string;
  value: unknown;
  type: TemplateVariable['type'];
  isValid: boolean;
  error?: string;
  required: boolean;
}



/**
 * Convert template variables to test case variables with validation
 */
export function convertTemplateVariables(templateVars: TemplateVariable[], existingValues: Record<string, unknown> = {}): TestCaseVariable[] {
  return templateVars.map(templateVar => {
    const value = existingValues[templateVar.name] ?? templateVar.defaultValue ?? getDefaultValueForType(templateVar.type);
    const validation = validateVariable(templateVar, value);
    
    return {
      name: templateVar.name,
      value,
      type: templateVar.type,
      isValid: validation.isValid,
      error: validation.error,
      required: templateVar.required
    };
  });
}

/**
 * Get default value based on variable type
 */
export function getDefaultValueForType(type: TemplateVariable['type']): unknown {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    case 'enum':
      return '';
    default:
      return '';
  }
}

/**
 * Validate a variable value against its template definition
 */
export function validateVariable(templateVar: TemplateVariable, value: unknown): { isValid: boolean; error?: string } {
  // Check required fields
  if (templateVar.required && (value === undefined || value === null || value === '')) {
    return { isValid: false, error: `${templateVar.name} is required` };
  }

  // Skip validation if not required and empty
  if (!templateVar.required && (value === undefined || value === null || value === '')) {
    return { isValid: true };
  }

  // Type-specific validation
  switch (templateVar.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Must be a string' };
      }
      break;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value as number)) {
        return { isValid: false, error: 'Must be a valid number' };
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { isValid: false, error: 'Must be true or false' };
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        return { isValid: false, error: 'Must be an array' };
      }
      break;
      
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return { isValid: false, error: 'Must be an object' };
      }
      break;
      
    case 'enum':
      if (templateVar.validation?.enum && !templateVar.validation.enum.includes(value as string)) {
        return { isValid: false, error: `Must be one of: ${templateVar.validation.enum.join(', ')}` };
      }
      break;
  }

  return { isValid: true };
}

/**
 * Parse string value to appropriate type
 */
export function parseValueForType(value: string, type: TemplateVariable['type']): unknown {
  if (value === '') return '';
  
  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
      
    case 'boolean':
      return value.toLowerCase() === 'true';
      
    case 'array':
    case 'object':
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not valid JSON
      }
      
    default:
      return value;
  }
}

/**
 * Generate YAML configuration for test case
 */
export function generateTestCaseYAML(formData: TestCaseFormData): string {
  const varsObj = Object.entries(formData.variables).reduce((acc, [key, value]) => {
    if (key.trim() && value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, unknown>);

  // Use the first enabled model for the primary test
  const primaryModel = formData.testParameters.models.find(m => m.enabled) || formData.testParameters.models[0];
  
  return `# Test Case for ${formData.promptName}
description: Generated test case for ${formData.promptName} ${formData.version}
prompts:
  - ${formData.promptId}
providers:
  - id: ${primaryModel.provider}:${primaryModel.model}
    config:
      temperature: ${primaryModel.temperature}
      max_tokens: ${primaryModel.maxTokens}
tests:
  - vars: ${JSON.stringify(varsObj, null, 4)}
    assert:
      - type: contains
        value: "PlantUML"
      - type: latency
        threshold: 5000
`;
}

/**
 * Save form data to localStorage
 */
export function saveFormToStorage(formData: TestCaseFormData): void {
  try {
    localStorage.setItem('test-case-generator-draft', JSON.stringify(formData));
  } catch (error) {
    console.error('Failed to save form to localStorage:', error);
  }
}

/**
 * Load form data from localStorage
 */
export function loadFormFromStorage(): TestCaseFormData | null {
  try {
    const stored = localStorage.getItem('test-case-generator-draft');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load form from localStorage:', error);
    return null;
  }
}

/**
 * Clear stored form data
 */
export function clearStoredForm(): void {
  try {
    localStorage.removeItem('test-case-generator-draft');
  } catch (error) {
    console.error('Failed to clear stored form:', error);
  }
}

/**
 * Fetch variable presets from API
 */
export async function fetchVariablePresets(
  agentType?: string, 
  operation?: string
): Promise<VariablePreset[]> {
  try {
    const params = new URLSearchParams();
    if (agentType) params.append('agentType', agentType);
    if (operation) params.append('operation', operation);
    
    const response = await fetch(`/api/variable-presets?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch presets');
    }
    
    const data = await response.json();
    return data.presets || [];
  } catch (error) {
    console.error('Error fetching variable presets:', error);
    return [];
  }
}

/**
 * Apply preset with animation-friendly staggered updates
 */
export function applyPresetWithAnimation(
  preset: VariablePreset,
  currentVariables: Record<string, unknown>,
  onVariableUpdate: (name: string, value: unknown, delay?: number) => void
): PresetApplicationState {
  const presetVariables = Object.entries(preset.variables);
  const totalSteps = presetVariables.length;
  
  // Apply variables with staggered timing for smooth animation
  presetVariables.forEach(([name, value], index) => {
    const delay = index * 150; // 150ms between each variable
    setTimeout(() => {
      onVariableUpdate(name, value, delay);
    }, delay);
  });
  
  return {
    isApplying: true,
    appliedVariables: presetVariables.map(([name]) => name),
    currentStep: 0,
    totalSteps
  };
}

/**
 * Generate default model configuration
 */
export function getDefaultModelConfiguration(): ModelConfiguration {
  return {
    id: 'default-' + Date.now(),
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    enabled: true
  };
}

/**
 * Create new model configuration
 */
export function createModelConfiguration(
  provider: ModelConfiguration['provider'] = 'openai',
  model: string = 'gpt-4'
): ModelConfiguration {
  return {
    id: `${provider}-${model}-${Date.now()}`,
    provider,
    model,
    temperature: 0.7,
    maxTokens: 2000,
    enabled: true
  };
}

/**
 * Export test case data in different formats
 */
export function exportTestCase(testCase: TestCase, format: 'json' | 'yaml' | 'csv'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(testCase, null, 2);
      
    case 'yaml':
      return testCase.generatedYaml || '';
      
    case 'csv':
      const headers = ['Prompt Name', 'Version', 'Variables', 'Created Date'];
      const values = [
        testCase.promptName,
        testCase.version,
        JSON.stringify(testCase.variables),
        new Date(testCase.createdAt).toLocaleDateString()
      ];
      return [headers.join(','), values.map(v => `"${v}"`).join(',')].join('\n');
      
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Validate complete form data
 */
export function validateFormData(
  formData: TestCaseFormData,
  templateVariables: TemplateVariable[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!formData.promptId) errors.push('Prompt selection is required');
  if (!formData.version) errors.push('Version selection is required');
  
  // Validate variables
  templateVariables.forEach(templateVar => {
    const value = formData.variables[templateVar.name];
    const validation = validateVariable(templateVar, value);
    if (!validation.isValid) {
      errors.push(validation.error || `Invalid value for ${templateVar.name}`);
    }
  });
  
  // Validate test parameters
  if (!formData.testParameters.models || formData.testParameters.models.length === 0) {
    errors.push('At least one model configuration is required');
  } else {
    formData.testParameters.models.forEach((model, index) => {
      if (model.temperature < 0 || model.temperature > 1) {
        errors.push(`Model ${index + 1}: Temperature must be between 0 and 1`);
      }
      if (model.maxTokens < 1 || model.maxTokens > 8000) {
        errors.push(`Model ${index + 1}: Max tokens must be between 1 and 8000`);
      }
      if (!model.model) {
        errors.push(`Model ${index + 1}: Model name is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}