import { IPromptFooAssertion, PromptEnvironment } from '@/lib/database/types';

export interface TestExecutionJob {
  id: string;
  promptId: string;
  testCaseIds?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  resultIds: string[];
  metadata: {
    totalTests: number;
    completedTests: number;
    failedTests: number;
    environment: PromptEnvironment;
  };
}

export interface ProviderConfig {
  model?: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  organization?: string;
  options?: Record<string, unknown>;
}

export interface PromptFooConfig {
  prompts: Array<string | {
    id?: string;
    template?: string;
    content?: string;
    path?: string;
  }>;
  providers: Array<string>;
  tests: Array<{
    vars?: Record<string, any>;
    assert?: IPromptFooAssertion[];
    description?: string;
  }>;
  defaultTest?: {
    vars?: Record<string, any>;
    assert?: IPromptFooAssertion[];
  };
  outputPath?: string | string[];
  writeLatestResults?: boolean;
  env?: Record<string, string>;
}

export interface PromptFooExecutionResult {
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

export interface PlantUMLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  diagramType?: string;
  elementCount?: number;
  complexity?: 'low' | 'medium' | 'high';
  qualityScore?: number;
  suggestions?: string[];
}

export interface TestComparisonResult {
  prompt1: {
    id: string;
    name: string;
    version: string;
  };
  prompt2: {
    id: string;
    name: string;
    version: string;
  };
  comparison: {
    testCasesCompared: number;
    overallScoreDifference: number;
    performanceDifference: {
      averageLatencyMs: number;
      totalCostDifference: number;
      tokenUsageDifference: number;
    };
    qualityDifference: {
      successRateDifference: number;
      averageScoreDifference: number;
    };
    detailedResults: Array<{
      testCaseId: string;
      testCaseName: string;
      prompt1Result: {
        success: boolean;
        score: number;
        latencyMs: number;
        cost: number;
      };
      prompt2Result: {
        success: boolean;
        score: number;
        latencyMs: number;
        cost: number;
      };
      improvement: 'better' | 'worse' | 'same';
    }>;
  };
}

export interface TestExecutionOptions {
  environment?: PromptEnvironment;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxConcurrency?: number;
  timeout?: number;
  async?: boolean;
  saveResults?: boolean;
  customEvaluators?: string[];
}

export interface EvaluatorContext {
  promptTemplate: string;
  testCaseName?: string;
  testCaseDescription?: string;
  variables: Record<string, unknown>;
  expectedResult?: unknown;
  model?: string;
  provider?: string;
}

export interface EvaluatorResult {
  pass: boolean;
  score: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomEvaluatorConfig {
  name: string;
  description: string;
  handler: (output: string, context: EvaluatorContext) => Promise<EvaluatorResult>;
}

export interface TestAnalytics {
  promptId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalTests: number;
    successRate: number;
    averageScore: number;
    averageLatencyMs: number;
    totalCost: number;
    totalTokensUsed: number;
  };
  trends: {
    scoreOverTime: Array<{ timestamp: Date; score: number }>;
    latencyOverTime: Array<{ timestamp: Date; latencyMs: number }>;
    costOverTime: Array<{ timestamp: Date; cost: number }>;
  };
  topFailingTests: Array<{
    testCaseId: string;
    testCaseName: string;
    failureRate: number;
    commonErrors: string[];
  }>;
  versionComparison?: Array<{
    version: string;
    metrics: {
      successRate: number;
      averageScore: number;
      averageLatencyMs: number;
    };
  }>;
}