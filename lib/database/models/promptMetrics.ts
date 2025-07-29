import mongoose, { Schema, model } from 'mongoose';
import { z } from 'zod';
import { IPromptMetrics, PromptEnvironment, CreatePromptMetricsInput } from '../types';

export const PromptMetricsValidationSchema = z.object({
  promptId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid prompt ID'),
  promptVersion: z.string().min(1, 'Prompt version is required'),
  period: z.enum(['hour', 'day', 'week', 'month']),
  timestamp: z.date(),
  metrics: z.object({
    totalRequests: z.number().int().min(0),
    successfulRequests: z.number().int().min(0),
    failedRequests: z.number().int().min(0),
    averageLatencyMs: z.number().min(0),
    averageScore: z.number().min(0).max(1),
    totalTokensUsed: z.number().int().min(0),
    totalCost: z.number().min(0),
    p95LatencyMs: z.number().min(0),
    p99LatencyMs: z.number().min(0)
  }),
  environment: z.nativeEnum(PromptEnvironment)
});

const PromptMetricsSchema = new Schema<IPromptMetrics>({
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
  period: {
    type: String,
    enum: ['hour', 'day', 'week', 'month'],
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    totalRequests: {
      type: Number,
      required: true,
      min: [0, 'Total requests must be non-negative']
    },
    successfulRequests: {
      type: Number,
      required: true,
      min: [0, 'Successful requests must be non-negative']
    },
    failedRequests: {
      type: Number,
      required: true,
      min: [0, 'Failed requests must be non-negative']
    },
    averageLatencyMs: {
      type: Number,
      required: true,
      min: [0, 'Average latency must be non-negative']
    },
    averageScore: {
      type: Number,
      required: true,
      min: [0, 'Average score must be non-negative'],
      max: [1, 'Average score must not exceed 1']
    },
    totalTokensUsed: {
      type: Number,
      required: true,
      min: [0, 'Total tokens used must be non-negative']
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost must be non-negative']
    },
    p95LatencyMs: {
      type: Number,
      required: true,
      min: [0, 'P95 latency must be non-negative']
    },
    p99LatencyMs: {
      type: Number,
      required: true,
      min: [0, 'P99 latency must be non-negative']
    }
  },
  environment: {
    type: String,
    enum: Object.values(PromptEnvironment),
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

PromptMetricsSchema.index({ promptId: 1, promptVersion: 1, period: 1, timestamp: -1 });
PromptMetricsSchema.index({ environment: 1, period: 1, timestamp: -1 });
PromptMetricsSchema.index({ timestamp: -1 });

PromptMetricsSchema.pre('save', function(next) {
  if (this.metrics.totalRequests !== this.metrics.successfulRequests + this.metrics.failedRequests) {
    return next(new Error('Total requests must equal the sum of successful and failed requests'));
  }
  next();
});

PromptMetricsSchema.methods.getSuccessRate = function() {
  return this.metrics.totalRequests > 0 ? 
    this.metrics.successfulRequests / this.metrics.totalRequests : 0;
};

PromptMetricsSchema.methods.getFailureRate = function() {
  return this.metrics.totalRequests > 0 ? 
    this.metrics.failedRequests / this.metrics.totalRequests : 0;
};

PromptMetricsSchema.methods.getAverageCostPerRequest = function() {
  return this.metrics.totalRequests > 0 ? 
    this.metrics.totalCost / this.metrics.totalRequests : 0;
};

PromptMetricsSchema.methods.getAverageTokensPerRequest = function() {
  return this.metrics.totalRequests > 0 ? 
    this.metrics.totalTokensUsed / this.metrics.totalRequests : 0;
};

PromptMetricsSchema.statics.aggregateMetrics = async function(
  promptId: string,
  period: 'hour' | 'day' | 'week' | 'month',
  startDate: Date,
  endDate: Date,
  environment?: PromptEnvironment,
  promptVersion?: string
) {
  const matchConditions: any = {
    promptId: new mongoose.Types.ObjectId(promptId),
    period,
    timestamp: { $gte: startDate, $lte: endDate }
  };

  if (environment) matchConditions.environment = environment;
  if (promptVersion) matchConditions.promptVersion = promptVersion;

  const results = await this.aggregate([
    { $match: matchConditions },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: '$metrics.totalRequests' },
        successfulRequests: { $sum: '$metrics.successfulRequests' },
        failedRequests: { $sum: '$metrics.failedRequests' },
        averageLatencyMs: { $avg: '$metrics.averageLatencyMs' },
        averageScore: { $avg: '$metrics.averageScore' },
        totalTokensUsed: { $sum: '$metrics.totalTokensUsed' },
        totalCost: { $sum: '$metrics.totalCost' },
        averageP95LatencyMs: { $avg: '$metrics.p95LatencyMs' },
        averageP99LatencyMs: { $avg: '$metrics.p99LatencyMs' },
        dataPoints: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        summary: {
          totalRequests: '$totalRequests',
          successfulRequests: '$successfulRequests',
          failedRequests: '$failedRequests',
          successRate: { 
            $cond: [
              { $gt: ['$totalRequests', 0] },
              { $divide: ['$successfulRequests', '$totalRequests'] },
              0
            ]
          },
          averageLatencyMs: { $round: ['$averageLatencyMs', 2] },
          averageScore: { $round: ['$averageScore', 4] },
          totalTokensUsed: '$totalTokensUsed',
          totalCost: { $round: ['$totalCost', 6] },
          averageP95LatencyMs: { $round: ['$averageP95LatencyMs', 2] },
          averageP99LatencyMs: { $round: ['$averageP99LatencyMs', 2] }
        },
        timeSeries: '$dataPoints'
      }
    }
  ]);

  return results[0] || {
    summary: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      averageLatencyMs: 0,
      averageScore: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageP95LatencyMs: 0,
      averageP99LatencyMs: 0
    },
    timeSeries: []
  };
};

PromptMetricsSchema.statics.getTopPerformingPrompts = async function(
  period: 'hour' | 'day' | 'week' | 'month',
  startDate: Date,
  endDate: Date,
  environment?: PromptEnvironment,
  limit: number = 10
) {
  const matchConditions: any = {
    period,
    timestamp: { $gte: startDate, $lte: endDate }
  };

  if (environment) matchConditions.environment = environment;

  return await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: { promptId: '$promptId', promptVersion: '$promptVersion' },
        totalRequests: { $sum: '$metrics.totalRequests' },
        successfulRequests: { $sum: '$metrics.successfulRequests' },
        averageScore: { $avg: '$metrics.averageScore' },
        averageLatencyMs: { $avg: '$metrics.averageLatencyMs' },
        totalCost: { $sum: '$metrics.totalCost' }
      }
    },
    {
      $project: {
        promptId: '$_id.promptId',
        promptVersion: '$_id.promptVersion',
        totalRequests: 1,
        successRate: { 
          $cond: [
            { $gt: ['$totalRequests', 0] },
            { $divide: ['$successfulRequests', '$totalRequests'] },
            0
          ]
        },
        averageScore: { $round: ['$averageScore', 4] },
        averageLatencyMs: { $round: ['$averageLatencyMs', 2] },
        totalCost: { $round: ['$totalCost', 6] },
        _id: 0
      }
    },
    { $sort: { averageScore: -1, successRate: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'prompts',
        localField: 'promptId',
        foreignField: '_id',
        as: 'prompt'
      }
    },
    { $unwind: '$prompt' },
    {
      $project: {
        promptId: 1,
        promptVersion: 1,
        promptName: '$prompt.name',
        agentType: '$prompt.agentType',
        totalRequests: 1,
        successRate: 1,
        averageScore: 1,
        averageLatencyMs: 1,
        totalCost: 1
      }
    }
  ]);
};

PromptMetricsSchema.statics.createFromTestResults = async function(
  promptId: string,
  promptVersion: string,
  period: 'hour' | 'day' | 'week' | 'month',
  timestamp: Date,
  environment: PromptEnvironment
) {
  const TestResult = mongoose.models.TestResult;
  if (!TestResult) {
    throw new Error('TestResult model not found');
  }

  const periodStart = getPeriodStart(timestamp, period);
  const periodEnd = getPeriodEnd(periodStart, period);

  const aggregatedData = await TestResult.getAggregatedMetrics(
    promptId,
    promptVersion,
    environment,
    periodStart,
    periodEnd
  );

  const metricsData = {
    promptId,
    promptVersion,
    period,
    timestamp: periodStart,
    metrics: {
      totalRequests: aggregatedData.totalRequests,
      successfulRequests: aggregatedData.successfulRequests,
      failedRequests: aggregatedData.failedRequests,
      averageLatencyMs: aggregatedData.averageLatencyMs,
      averageScore: aggregatedData.averageScore,
      totalTokensUsed: aggregatedData.totalTokensUsed,
      totalCost: aggregatedData.totalCost,
      p95LatencyMs: aggregatedData.p95LatencyMs,
      p99LatencyMs: aggregatedData.p99LatencyMs
    },
    environment
  };

  const validation = PromptMetricsValidationSchema.safeParse(metricsData);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  const existingMetrics = await this.findOne({
    promptId: new mongoose.Types.ObjectId(promptId),
    promptVersion,
    period,
    timestamp: periodStart,
    environment
  });

  if (existingMetrics) {
    Object.assign(existingMetrics.metrics, validation.data.metrics);
    return await existingMetrics.save();
  }

  return await this.create(validation.data);
};

function getPeriodStart(timestamp: Date, period: 'hour' | 'day' | 'week' | 'month'): Date {
  const date = new Date(timestamp);
  
  switch (period) {
    case 'hour':
      date.setMinutes(0, 0, 0);
      break;
    case 'day':
      date.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const dayOfWeek = date.getDay();
      date.setDate(date.getDate() - dayOfWeek);
      date.setHours(0, 0, 0, 0);
      break;
    case 'month':
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      break;
  }
  
  return date;
}

function getPeriodEnd(periodStart: Date, period: 'hour' | 'day' | 'week' | 'month'): Date {
  const date = new Date(periodStart);
  
  switch (period) {
    case 'hour':
      date.setHours(date.getHours() + 1);
      break;
    case 'day':
      date.setDate(date.getDate() + 1);
      break;
    case 'week':
      date.setDate(date.getDate() + 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date;
}

export const PromptMetrics = mongoose.models.PromptMetrics || model<IPromptMetrics>('PromptMetrics', PromptMetricsSchema);

export default PromptMetrics;