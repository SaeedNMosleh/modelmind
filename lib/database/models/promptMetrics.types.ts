import { Model } from 'mongoose';
import { IPromptMetrics } from '../types';

// Extend the Model interface to include static methods
export interface PromptMetricsModel extends Model<IPromptMetrics> {
  createFromTestResults: (
    promptId: string,
    promptVersion: string,
    period: 'hour' | 'day' | 'week' | 'month',
    timestamp: Date,
    environment: 'production' | 'development'
  ) => Promise<IPromptMetrics>;
  
  aggregateMetrics: (
    promptId: string,
    period: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date,
    environment?: 'production' | 'development',
    promptVersion?: string
  ) => Promise<{
    summary: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      successRate: number;
      averageLatencyMs: number;
      averageScore: number;
      totalTokensUsed: number;
      totalCost: number;
      averageP95LatencyMs: number;
      averageP99LatencyMs: number;
    };
    timeSeries: Array<{
      timestamp: Date;
      totalRequests: number;
      successRate: number;
      averageLatencyMs: number;
      averageScore: number;
      totalTokensUsed: number;
      totalCost: number;
    }>;
  }>;
  
  getTopPerformingPrompts: (
    period: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date,
    environment?: 'production' | 'development',
    limit?: number
  ) => Promise<Array<{
    promptId: string;
    name?: string;
    successRate: number;
    averageScore: number;
    totalRequests: number;
    averageLatencyMs: number;
    totalCost: number;
  }>>;
}

// Fix to make PromptMetrics available with its static methods correctly typed
export declare const PromptMetrics: PromptMetricsModel;
