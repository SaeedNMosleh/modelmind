import { IPrompt, IPromptVersion, AgentType, DiagramType, PromptOperation, PromptEnvironment } from '../database/types';

// UI-specific types for prompt management
export interface PromptMgmtPrompt extends Omit<IPrompt, 'versions'> {
  versions: PromptMgmtVersion[];
  _stats?: PromptStats;
  _testSummary?: TestSummary;
}

export interface PromptMgmtVersion extends IPromptVersion {
  _id?: string;
  _stats?: VersionStats;
}

export interface PromptStats {
  totalTests: number;
  passRate: number;
  avgExecutionTime: number;
  lastTestedAt?: Date;
  popularityScore: number;
}

export interface VersionStats {
  testCount: number;
  successRate: number;
  avgLatency: number;
  usageCount: number;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  running: number;
  lastRun?: Date;
  avgScore?: number;
}

// Filter and search types
export interface PromptFilters {
  agentType?: AgentType[];
  diagramType?: DiagramType[];
  operation?: PromptOperation[];
  environment?: PromptEnvironment[];
  isProduction?: boolean;
  tags?: string[];
  search?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface PromptSortOptions {
  field: 'name' | 'agentType' | 'updatedAt' | 'createdAt' | 'testScore' | 'usage';
  direction: 'asc' | 'desc';
}

// Test execution types
export interface TestExecutionRequest {
  promptId: string;
  version?: string;
  testCaseIds?: string[];
  variables?: Record<string, unknown>;
}

export interface TestExecutionResponse {
  executionId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  results?: TestResult[];
  error?: string;
}

export interface TestResult {
  testCaseId: string;
  testCaseName: string;
  status: 'passed' | 'failed' | 'error';
  score: number;
  executionTime: number;
  output?: unknown;
  error?: string;
  assertions: AssertionResult[];
  metadata?: Record<string, unknown>;
}

export interface AssertionResult {
  type: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  score: number;
  message?: string;
}

// Version comparison types
export interface VersionComparison {
  oldVersion: PromptMgmtVersion;
  newVersion: PromptMgmtVersion;
  diff: DiffResult;
  metrics?: ComparisonMetrics;
}

export interface DiffResult {
  template: DiffChunk[];
  metadata: DiffChunk[];
  summary: DiffSummary;
}

export interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  oldStart?: number;
  oldLines?: number;
  newStart?: number;
  newLines?: number;
  content: string;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  modifications: number;
  totalChanges: number;
}

export interface ComparisonMetrics {
  performanceDelta: number;
  accuracyDelta: number;
  testResultComparison: {
    oldPassRate: number;
    newPassRate: number;
    improvement: number;
  };
}

// Editor types
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  examples?: unknown[];
  validation?: VariableValidation;
}

export interface VariableValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: unknown[];
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  variables: TemplateVariable[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface ValidationWarning extends ValidationError {
  suggestion?: string;
}

// Bulk operations
export interface BulkOperation {
  type: 'activate' | 'deactivate' | 'delete' | 'test' | 'export' | 'duplicate';
  promptIds: string[];
  options?: Record<string, unknown>;
}

export interface BulkOperationResult {
  operationType: string;
  totalRequested: number;
  successful: number;
  failed: number;
  results: Array<{
    promptId: string;
    success: boolean;
    error?: string;
  }>;
}

// Analytics types
export interface PromptAnalytics {
  usage: UsageMetrics;
  performance: PerformanceMetrics;
  quality: QualityMetrics;
  trends: TrendData[];
}

export interface UsageMetrics {
  totalExecutions: number;
  uniqueUsers: number;
  avgExecutionsPerDay: number;
  peakUsageTime: string;
  popularVariables: Array<{
    name: string;
    frequency: number;
  }>;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
}

export interface QualityMetrics {
  avgScore: number;
  passRate: number;
  userSatisfaction?: number;
  commonFailures: Array<{
    reason: string;
    frequency: number;
  }>;
}

export interface TrendData {
  date: string;
  executions: number;
  avgScore: number;
  avgLatency: number;
  errorRate: number;
}

// Real-time updates
export interface RealtimeUpdate {
  type: 'prompt_updated' | 'test_completed' | 'version_created' | 'collaboration_event';
  promptId: string;
  data: unknown;
  timestamp: Date;
  userId?: string;
}

export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'cursor_moved' | 'selection_changed';
  userId: string;
  userName: string;
  data: unknown;
}

// Export/Import types
export interface ExportOptions {
  format: 'json' | 'yaml' | 'csv' | 'pdf';
  includeVersions: boolean;
  includeTestCases: boolean;
  includeMetrics: boolean;
  promptIds?: string[];
}

export interface ImportResult {
  successful: number;
  failed: number;
  errors: Array<{
    item: string;
    error: string;
  }>;
  warnings: string[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Form types
export interface PromptFormData {
  name: string;
  agentType: AgentType;
  diagramType: DiagramType[];
  operation: PromptOperation;
  environments: PromptEnvironment[];
  tags: string[];
  template: string;
  changelog: string;
  metadata?: Record<string, unknown>;
}

export interface TestCaseFormData {
  name: string;
  description: string;
  vars: Record<string, unknown>;
  assert: Array<{
    type: string;
    value?: unknown;
    threshold?: number;
    provider?: string;
    rubric?: string;
    metric?: string;
  }>;
  tags: string[];
  metadata?: Record<string, unknown>;
}

// UI State types
export interface PromptMgmtState {
  prompts: PromptMgmtPrompt[];
  selectedPrompts: string[];
  filters: PromptFilters;
  sort: PromptSortOptions;
  loading: boolean;
  error?: string;
  currentPrompt?: PromptMgmtPrompt;
  testExecution?: TestExecutionResponse;
}

export interface EditorState {
  content: string;
  isDirty: boolean;
  isValid: boolean;
  validationResult?: TemplateValidationResult;
  variables: TemplateVariable[];
  previewData?: Record<string, unknown>;
  collaborators: CollaborationEvent[];
}