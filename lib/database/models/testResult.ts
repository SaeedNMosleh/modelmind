import mongoose, { Schema, model } from 'mongoose';
import { z } from 'zod';
import { ITestResult, PromptEnvironment } from '../types';
import { TestResultModel } from './testResult.types';

export const TestResultValidationSchema = z.object({
  testCaseId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid test case ID'),
  promptId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid prompt ID'),
  promptVersion: z.string().min(1, 'Prompt version is required'),
  success: z.boolean(),
  score: z.number().min(0).max(1),
  latencyMs: z.number().min(0),
  tokensUsed: z.number().min(0).int(),
  cost: z.number().min(0),
  response: z.string(),
  error: z.string().optional(),
  assertions: z.array(z.object({
    type: z.string(),
    passed: z.boolean(),
    score: z.number().min(0).max(1),
    reason: z.string().optional()
  })),
  metadata: z.object({
    provider: z.string(),
    model: z.string(),
    temperature: z.number().optional(),
    timestamp: z.date(),
    environment: z.nativeEnum(PromptEnvironment)
  }).and(z.record(z.any()))
});

const TestResultSchema = new Schema<ITestResult>({
  testCaseId: {
    type: Schema.Types.ObjectId,
    ref: 'TestCase',
    required: true,
    index: true
  },
  promptId: {
    type: Schema.Types.ObjectId,
    ref: 'Prompt',
    required: true,
    index: true
  },
  promptVersion: {
    type: String,
    required: true,
    index: true
  },
  success: {
    type: Boolean,
    required: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: [0, 'Score must be non-negative'],
    max: [1, 'Score must not exceed 1'],
    index: true
  },
  latencyMs: {
    type: Number,
    required: true,
    min: [0, 'Latency must be non-negative']
  },
  tokensUsed: {
    type: Number,
    required: true,
    min: [0, 'Tokens used must be non-negative']
  },
  cost: {
    type: Number,
    required: true,
    min: [0, 'Cost must be non-negative']
  },
  response: {
    type: String,
    required: true
  },
  error: {
    type: String
  },
  assertions: [{
    type: {
      type: String,
      required: true
    },
    passed: {
      type: Boolean,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Assertion score must be non-negative'],
      max: [1, 'Assertion score must not exceed 1']
    },
    reason: {
      type: String
    }
  }],
  metadata: {
    provider: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    temperature: {
      type: Number,
      min: [0, 'Temperature must be non-negative'],
      max: [2, 'Temperature must not exceed 2']
    },
    timestamp: {
      type: Date,
      required: true
    },
    environment: {
      type: String,
      enum: Object.values(PromptEnvironment),
      required: true,
      index: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

TestResultSchema.index({ promptId: 1, promptVersion: 1 });
TestResultSchema.index({ testCaseId: 1, createdAt: -1 });
TestResultSchema.index({ success: 1, score: -1 });
TestResultSchema.index({ 'metadata.environment': 1, createdAt: -1 });
TestResultSchema.index({ latencyMs: 1 });
TestResultSchema.index({ cost: 1 });

TestResultSchema.methods.toPromptFooFormat = function() {
  return {
    prompt: {
      id: this.promptId.toString(),
      version: this.promptVersion
    },
    response: {
      output: this.response,
      tokenUsage: {
        total: this.tokensUsed,
        prompt: Math.floor(this.tokensUsed * 0.7),
        completion: Math.floor(this.tokensUsed * 0.3)
      },
      cost: this.cost,
      latencyMs: this.latencyMs
    },
    success: this.success,
    score: this.score,
    namedScores: this.assertions.reduce((acc: Record<string, number>, assertion) => {
      acc[assertion.type] = assertion.score;
      return acc;
    }, {}),
    gradingResult: this.assertions.map(assertion => ({
      pass: assertion.passed,
      score: assertion.score,
      reason: assertion.reason || '',
      assertion: {
        type: assertion.type
      }
    })),
    metadata: this.metadata
  };
};

TestResultSchema.statics.createFromPromptFoo = function(
  testCaseId: string,
  promptId: string,
  promptVersion: string,
  promptFooResult: {
    success?: boolean;
    score?: number;
    response?: {
      latencyMs?: number;
      tokenUsage?: {
        total?: number;
      };
      cost?: number;
      output?: string;
    };
    error?: string;
    gradingResult?: Array<{
      assertion?: {
        type?: string;
      };
      pass?: boolean;
      score?: number;
      reason?: string;
    }> | {
      assertion?: {
        type?: string;
      };
      pass?: boolean;
      score?: number;
      reason?: string;
    };
    metadata?: {
      provider?: string;
      model?: string;
      temperature?: number;
      [key: string]: unknown;
    };
  },
  environment: PromptEnvironment = PromptEnvironment.DEVELOPMENT
) {
  const assertions = promptFooResult.gradingResult ? 
    (Array.isArray(promptFooResult.gradingResult) ? promptFooResult.gradingResult : [promptFooResult.gradingResult])
    : [];

  const testResultData = {
    testCaseId,
    promptId,
    promptVersion,
    success: promptFooResult.success || false,
    score: promptFooResult.score || 0,
    latencyMs: promptFooResult.response?.latencyMs || 0,
    tokensUsed: promptFooResult.response?.tokenUsage?.total || 0,
    cost: promptFooResult.response?.cost || 0,
    response: promptFooResult.response?.output || '',
    error: promptFooResult.error,
    assertions: assertions.map((assertion) => ({
      type: assertion.assertion?.type || 'unknown',
      passed: assertion.pass || false,
      score: assertion.score || 0,
      reason: assertion.reason
    })),
    metadata: {
      provider: promptFooResult.metadata?.provider || 'unknown',
      model: promptFooResult.metadata?.model || 'unknown',
      temperature: promptFooResult.metadata?.temperature,
      timestamp: new Date(),
      environment,
      ...promptFooResult.metadata
    }
  };

  const validation = TestResultValidationSchema.safeParse(testResultData);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  return new this(validation.data);
};

TestResultSchema.methods.getSuccessRate = function() {
  return this.success ? 1 : 0;
};

TestResultSchema.methods.getAssertionResults = function() {
  return this.assertions.map(assertion => ({
    type: assertion.type,
    passed: assertion.passed,
    score: assertion.score,
    reason: assertion.reason
  }));
};

TestResultSchema.statics.getAggregatedMetrics = async function(
  promptId: string,
  promptVersion?: string,
  environment?: PromptEnvironment,
  startDate?: Date,
  endDate?: Date
) {
  interface MatchConditions {
    promptId: mongoose.Types.ObjectId;
    promptVersion?: string;
    'metadata.environment'?: PromptEnvironment;
    createdAt?: {
      $gte?: Date;
      $lte?: Date;
    };
  }

  const matchConditions: MatchConditions = { 
    promptId: new mongoose.Types.ObjectId(promptId) 
  };
  
  if (promptVersion) matchConditions.promptVersion = promptVersion;
  if (environment) matchConditions['metadata.environment'] = environment;
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) matchConditions.createdAt.$gte = startDate;
    if (endDate) matchConditions.createdAt.$lte = endDate;
  }

  const results = await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: { $sum: { $cond: ['$success', 1, 0] } },
        failedRequests: { $sum: { $cond: ['$success', 0, 1] } },
        averageScore: { $avg: '$score' },
        averageLatencyMs: { $avg: '$latencyMs' },
        totalTokensUsed: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$cost' },
        latencies: { $push: '$latencyMs' }
      }
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 1,
        averageScore: { $round: ['$averageScore', 4] },
        averageLatencyMs: { $round: ['$averageLatencyMs', 2] },
        totalTokensUsed: 1,
        totalCost: { $round: ['$totalCost', 6] },
        successRate: { 
          $round: [
            { $divide: ['$successfulRequests', '$totalRequests'] }, 
            4
          ] 
        },
        latencies: 1
      }
    }
  ]);

  if (results.length === 0) {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageScore: 0,
      averageLatencyMs: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      successRate: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0
    };
  }

  const result = results[0];
  const latencies = result.latencies.sort((a: number, b: number) => a - b);
  const p95Index = Math.ceil(latencies.length * 0.95) - 1;
  const p99Index = Math.ceil(latencies.length * 0.99) - 1;

  return {
    ...result,
    p95LatencyMs: latencies[p95Index] || 0,
    p99LatencyMs: latencies[p99Index] || 0,
    latencies: undefined
  };
};

export const TestResult = (mongoose.models.TestResult || model<ITestResult, TestResultModel>('TestResult', TestResultSchema)) as TestResultModel;

export default TestResult;