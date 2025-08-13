import { TemplateVariable } from '@/lib/prompt-mgmt/types';

export interface TestCase {
  _id: string;
  promptId: string;
  promptName: string;
  version: string;
  variables: Record<string, unknown>;
  testParameters: TestParameters;
  generatedYaml: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ModelConfiguration {
  id: string;
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

export interface TestParameters {
  models: ModelConfiguration[];
}

// Simple admin-only preset system
export interface VariablePreset {
  id: string;
  name: string;
  description: string;
  agentType?: string;
  operation?: string;
  variables: Record<string, unknown>;
  createdAt: Date;
}

// Enhanced assertion types for UI/UX
export interface AssertionConfiguration {
  id: string;
  type: 'contains' | 'not-contains' | 'latency' | 'javascript' | 'llm-rubric' | 'plantuml-valid' | 'custom';
  value?: unknown;
  threshold?: number;
  provider?: string;
  rubric?: string;
  description?: string;
  enabled: boolean;
}

export interface TestCaseConfiguration {
  promptId: string;
  promptVersion: string;
  variables: Record<string, unknown>;
  testParameters: TestParameters;
  assertions: AssertionConfiguration[];
  metadata: {
    diagramType?: string;
    agentType: string;
    operation: string;
  };
}

export interface PromptVersionWithTemplate {
  version: string;
  createdAt: Date;
  changelog: string;
  isPrimary: boolean;
  template: string;
  variables: TemplateVariable[];
}

export interface ActivePromptWithTemplate {
  id: string;
  name: string;
  agentType: string;
  operation: string;
  displayName: string;
  versions: PromptVersionWithTemplate[];
  primaryVersion: string;
  primaryTemplate: string;
  primaryVariables: TemplateVariable[];
}

export interface TestCaseGeneratorState {
  // Prompt selection
  selectedPromptId: string;
  selectedVersion: string;
  selectedPrompt: ActivePromptWithTemplate | null;
  
  // Variables and validation
  variables: Record<string, unknown>;
  variableErrors: Record<string, string>;
  variableCompletion: Record<string, boolean>;
  
  // Test parameters with multi-model support
  testParameters: TestParameters;
  
  // Assertions
  assertions: AssertionConfiguration[];
  
  // UI state with enhanced UX
  loading: boolean;
  message: string;
  messageType: 'success' | 'error' | 'info' | 'warning';
  activeTab: 'configure' | 'testParameters' | 'assertions' | 'preview';
  isPreviewExpanded: boolean;
  showRawTemplate: boolean;
  
  // Save operation state
  saving: boolean;
  
  // Data
  prompts: ActivePromptWithTemplate[];
  testCases: TestCase[];
  presets: VariablePreset[];
}

export interface VariableInputProps {
  variable: TemplateVariable;
  value: unknown;
  error?: string;
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
}

export interface TestCaseFormProps {
  onSubmit: (formData: TestCaseFormData) => Promise<void>;
  initialData?: Partial<TestCaseFormData>;
  disabled?: boolean;
}

export interface TestCaseFormData {
  promptId: string;
  promptName: string;
  version: string;
  variables: Record<string, unknown>;
  testParameters: TestParameters;
}

export interface PromptPreviewProps {
  prompt: ActivePromptWithTemplate;
  version: string;
  variables: Record<string, unknown>;
  className?: string;
}

export interface TestCaseTableProps {
  testCases: TestCase[];
  onDelete: (id: string) => Promise<void>;
  onExport?: (testCase: TestCase, format: 'json' | 'yaml' | 'csv') => void;
  loading?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  warnings: string[];
  missingCombinations: Array<{
    agentType: string;
    operation: string;
  }>;
}

export interface PromptsResponse {
  prompts: ActivePromptWithTemplate[];
  count: number;
  health: HealthStatus;
}

export interface TestCasesResponse {
  testCases: TestCase[];
  total: number;
  page: number;
  limit: number;
}

// Tab component props types
export interface ConfigureTabProps {
  variables: Record<string, unknown>;
  variableCompletion: Record<string, boolean>;
  templateVariables: TemplateVariable[];
  presets: VariablePreset[];
  selectedPrompt: { agentType: string; operation: string } | null;
  onVariableUpdate: (name: string, value: unknown) => void;
  onPresetApply: (preset: VariablePreset) => void;
}

export interface TestParametersTabProps {
  testParameters: TestParameters;
  onModelAdd: () => void;
  onModelUpdate: (modelId: string, updates: Partial<ModelConfiguration>) => void;
  onModelRemove: (modelId: string) => void;
}

export interface AssertionsTabProps {
  assertions: AssertionConfiguration[];
  onAssertionUpdate: (assertions: AssertionConfiguration[]) => void;
}

export interface PreviewTabProps {
  formData: TestCaseFormData;
  template: string;
  variables: Record<string, unknown>;
  validationResult: { isValid: boolean; errors: string[] };
  isExpanded: boolean;
  showRaw: boolean;
  saving: boolean;
  onToggleExpanded: () => void;
  onToggleRaw: () => void;
  onSave: () => void;
}

// Enhanced UI Component types for modern UX
export interface TabConfig {
  id: 'configure' | 'testParameters' | 'assertions' | 'preview';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // Tab-specific color theme
  component: React.ComponentType;
  description?: string;
}

// Animation and interaction states
export interface VariableCardState {
  isExpanded: boolean;
  isValidating: boolean;
  hasError: boolean;
  isComplete: boolean;
  animationState: 'idle' | 'validating' | 'success' | 'error';
}

// Model management UI states
export interface ModelCardState {
  id: string;
  isEditing: boolean;
  isRemoving: boolean;
  dragIndex?: number;
}

// Preset application animation
export interface PresetApplicationState {
  isApplying: boolean;
  appliedVariables: string[];
  currentStep: number;
  totalSteps: number;
}

export interface AccordionSection {
  id: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface FormErrors {
  promptId?: string;
  version?: string;
  variables?: Record<string, string>;
  testParameters?: {
    model?: string;
    temperature?: string;
    maxTokens?: string;
  };
}

// Export types
export type ExportFormat = 'json' | 'yaml' | 'csv';
export type ModelType = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-sonnet' | 'claude-3-haiku';

// Storage types for localStorage
export interface StoredFormData extends TestCaseFormData {
  timestamp: number;
  promptName: string;
}

export interface UserPreferences {
  defaultModel: ModelType;
  defaultTemperature: number;
  defaultMaxTokens: number;
  autoSave: boolean;
  showTooltips: boolean;
}

// Event types
export interface VariableChangeEvent {
  name: string;
  value: unknown;
  isValid: boolean;
  error?: string;
}

export interface FormChangeEvent {
  field: keyof TestCaseFormData;
  value: unknown;
  isValid: boolean;
  errors: string[];
}

// Hook types
export interface UseTestCaseGenerator {
  state: TestCaseGeneratorState;
  actions: {
    selectPrompt: (promptId: string) => void;
    selectVersion: (version: string) => void;
    updateVariable: (name: string, value: unknown) => void;
    updateTestParameter: (key: keyof TestParameters, value: unknown) => void;
    generateTestCase: () => Promise<void>;
    deleteTestCase: (id: string) => Promise<void>;
    resetForm: () => void;
    loadFromStorage: () => void;
    saveToStorage: () => void;
    clearStorage: () => void;
  };
  computed: {
    selectedPrompt: ActivePromptWithTemplate | null;
    currentVariables: TemplateVariable[];
    isFormValid: boolean;
    formErrors: FormErrors;
    generatedYaml: string;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateTestCaseRequest extends TestCaseFormData {
  generatedYaml: string;
}

export interface CreateTestCaseResponse {
  testCase: TestCase;
  message: string;
}