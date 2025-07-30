import { Model } from 'mongoose';
import { ITestResult, PromptEnvironment } from '../types';

// Extend the Model interface to include static methods
export interface TestResultModel extends Model<ITestResult> {
  createFromPromptFoo: (
    testCaseId: string,
    promptId: string,
    promptVersion: string,
    promptFooResult: {
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
      gradingResult?: {
        pass: boolean;
        score: number;
        reason: string;
        assertion: {
          type: string;
          value?: unknown;
          threshold?: number;
          provider?: string;
        } | null;
      };
    },
    environment: PromptEnvironment
  ) => ITestResult;
  
  getAggregatedMetrics: (
    promptId: string,
    promptVersion?: string,
    environment?: PromptEnvironment,
    startDate?: Date,
    endDate?: Date
  ) => Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageScore: number;
    averageLatencyMs: number;
    totalTokensUsed: number;
    totalCost: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
  }>;
}

// Fix to make TestResult available with its static methods correctly typed
export declare const TestResult: TestResultModel;
