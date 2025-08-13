import { Document, Types } from 'mongoose';

export enum AgentType {
  BASE = 'base',
  GENERATOR = 'generator',
  MODIFIER = 'modifier',
  ANALYZER = 'analyzer',
  CLASSIFIER = 'classifier',
  MASTER_CLASSIFIER = 'master-classifier'
}

export enum PromptOperation {
  BASE_SYSTEM = 'base-system',
  GENERATION = 'generation',
  MODIFICATION = 'modification',
  ANALYSIS = 'analysis',
  INTENT_CLASSIFICATION = 'intent-classification',
  COMPREHENSIVE_CLASSIFICATION = 'comprehensive-classification'
}

// PromptEnvironment enum removed - replaced by isProduction boolean

export enum DiagramType {
  SEQUENCE = 'sequence',
  CLASS = 'class',
  ACTIVITY = 'activity',
  STATE = 'state',
  COMPONENT = 'component',
  USE_CASE = 'use-case',
  DEPLOYMENT = 'deployment',
  ENTITY_RELATIONSHIP = 'entity-relationship',
  UNKNOWN = 'unknown'
}

export interface IPromptVersion {
  version: string;
  template: string;
  changelog: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IPrompt extends Document {
  _id: Types.ObjectId;
  name: string;
  agentType: AgentType;
  diagramType: DiagramType[];
  operation: PromptOperation;
  primaryVersion: string;
  versions: IPromptVersion[];
  isProduction: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IPromptFooAssertion {
  type: string;
  value?: unknown;
  threshold?: number;
  provider?: string;
  rubric?: string;
  metric?: string;
}

export interface ITestCase extends Document {
  _id: Types.ObjectId;
  promptId: Types.ObjectId;
  name: string;
  description: string;
  vars: Record<string, unknown>;
  assert: IPromptFooAssertion[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ITestResult extends Document {
  _id: Types.ObjectId;
  testCaseId: Types.ObjectId;
  promptId: Types.ObjectId;
  promptVersion: string;
  success: boolean;
  score: number;
  latencyMs: number;
  tokensUsed: number;
  cost: number;
  response: string;
  error?: string;
  assertions: {
    type: string;
    passed: boolean;
    score: number;
    reason?: string;
  }[];
  metadata: {
    provider: string;
    model: string;
    temperature?: number;
    timestamp: Date;
    environment: 'production' | 'development';
    [key: string]: unknown;
  };
  createdAt: Date;
}

export interface IPromptMetrics extends Document {
  _id: Types.ObjectId;
  promptId: Types.ObjectId;
  promptVersion: string;
  period: 'hour' | 'day' | 'week' | 'month';
  timestamp: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatencyMs: number;
    averageScore: number;
    totalTokensUsed: number;
    totalCost: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
  };
  environment: 'production' | 'development';
  createdAt: Date;
}

export interface IPromptFooConfig {
  prompts: Array<{
    id: string;
    template: string;
  }>;
  providers: Array<{
    id: string;
    config: Record<string, unknown>;
  }>;
  tests: Array<{
    vars: Record<string, unknown>;
    assert: IPromptFooAssertion[];
    description?: string;
  }>;
  defaultTest?: {
    vars?: Record<string, unknown>;
    assert?: IPromptFooAssertion[];
  };
  outputPath?: string;
  evaluateOptions?: {
    maxConcurrency?: number;
    repeat?: number;
    delay?: number;
  };
}

export interface IPromptFooResult {
  version: number;
  results: Array<{
    prompt: {
      id: string;
      template: string;
    };
    vars: Record<string, unknown>;
    response: {
      output: string;
      tokenUsage?: {
        total: number;
        prompt: number;
        completion: number;
      };
      cost?: number;
      latencyMs: number;
      cached?: boolean;
    };
    success: boolean;
    score: number;
    namedScores: Record<string, number>;
    gradingResult?: {
      pass: boolean;
      score: number;
      reason: string;
      namedScores: Record<string, number>;
      tokensUsed: {
        total: number;
        prompt: number;
        completion: number;
      };
      assertion: IPromptFooAssertion | null;
    };
  }>;
  table: {
    head: string[];
    body: string[][];
  };
  summary: {
    version: number;
    timestamp: string;
    numTests: number;
    stats: {
      successes: number;
      failures: number;
      tokenUsage: {
        total: number;
        prompt: number;
        completion: number;
      };
      cost: number;
    };
  };
}

export type CreatePromptInput = Omit<IPrompt, '_id' | 'createdAt' | 'updatedAt' | 'primaryVersion' | 'versions'> & {
  initialVersion: {
    version: string;
    template: string;
    changelog: string;
  };
};

export type UpdatePromptInput = Partial<Pick<IPrompt, 'name' | 'agentType' | 'diagramType' | 'operation' | 'isProduction' | 'tags' | 'metadata'>>;

export type CreatePromptVersionInput = Omit<IPromptVersion, 'createdAt'> & {
  isPrimary?: boolean;
};

export type CreateTestCaseInput = Omit<ITestCase, '_id' | 'createdAt' | 'updatedAt'>;

export type CreateTestResultInput = Omit<ITestResult, '_id' | 'createdAt'>;

export type CreatePromptMetricsInput = Omit<IPromptMetrics, '_id' | 'createdAt'>;