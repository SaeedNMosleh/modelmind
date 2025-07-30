import { NextRequest } from 'next/server';
import { connectToDatabase, TestResult, Prompt } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse
} from '@/lib/api/responses';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import { zodErrorsToValidationDetails } from '@/lib/api/validation/prompts';
import { PromptEnvironment } from '@/lib/database/types';
import { TestAnalytics } from '@/lib/testing/types';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'test-analytics-api' });

const AnalyticsQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .transform(val => val ? new Date(val) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  endDate: z
    .string()
    .optional()
    .transform(val => val ? new Date(val) : new Date()),
  environment: z.nativeEnum(PromptEnvironment).optional(),
  version: z.string().optional(),
  granularity: z.enum(['hour', 'day', 'week']).default('day'),
  includeVersionComparison: z
    .string()
    .optional()
    .transform(val => val === 'true')
});

export async function GET(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.promptId);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const queryValidation = AnalyticsQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryValidation.success) {
      return createErrorResponse(
        'Invalid query parameters',
        'VALIDATION_ERROR',
        400,
        zodErrorsToValidationDetails(queryValidation.error.errors)
      );
    }

    const {
      startDate,
      endDate,
      environment,
      version,
      granularity,
      includeVersionComparison
    } = queryValidation.data;

    // Verify prompt exists
    const prompt = await Prompt.findById(params.promptId).select('name versions');
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const filter: Record<string, unknown> = { 
      promptId: params.promptId,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (environment) filter['metadata.environment'] = environment;
    if (version) filter.promptVersion = version;

    // Generate time series data based on granularity
    const timeFormat = getTimeFormat(granularity);

    const [overallMetrics, trends, topFailingTests, versionComparison] = await Promise.all([
      // Overall metrics
      TestResult.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalTests: { $sum: 1 },
            successfulTests: { $sum: { $cond: ['$success', 1, 0] } },
            averageScore: { $avg: '$score' },
            averageLatencyMs: { $avg: '$latencyMs' },
            totalCost: { $sum: '$cost' },
            totalTokensUsed: { $sum: '$tokensUsed' }
          }
        }
      ]),

      // Time series trends
      TestResult.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: timeFormat,
                date: '$createdAt'
              }
            },
            score: { $avg: '$score' },
            latencyMs: { $avg: '$latencyMs' },
            cost: { $sum: '$cost' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Top failing tests
      TestResult.aggregate([
        { 
          $match: { 
            ...filter,
            success: false 
          } 
        },
        {
          $lookup: {
            from: 'testcases',
            localField: 'testCaseId',
            foreignField: '_id',
            as: 'testCase'
          }
        },
        { $unwind: '$testCase' },
        {
          $group: {
            _id: {
              testCaseId: '$testCaseId',
              testCaseName: '$testCase.name'
            },
            failures: { $sum: 1 },
            totalRuns: { $sum: 1 },
            commonErrors: { $push: '$error' },
            averageScore: { $avg: '$score' }
          }
        },
        {
          $project: {
            testCaseId: '$_id.testCaseId',
            testCaseName: '$_id.testCaseName',
            failures: 1,
            failureRate: { $divide: ['$failures', '$totalRuns'] },
            commonErrors: { $slice: ['$commonErrors', 5] },
            averageScore: 1,
            _id: 0
          }
        },
        { $sort: { failureRate: -1 } },
        { $limit: 10 }
      ]),

      // Version comparison (if requested)
      includeVersionComparison ? TestResult.aggregate([
        { $match: { promptId: params.promptId } },
        {
          $group: {
            _id: '$promptVersion',
            totalTests: { $sum: 1 },
            successfulTests: { $sum: { $cond: ['$success', 1, 0] } },
            averageScore: { $avg: '$score' },
            averageLatencyMs: { $avg: '$latencyMs' }
          }
        },
        {
          $project: {
            version: '$_id',
            successRate: { $divide: ['$successfulTests', '$totalTests'] },
            averageScore: 1,
            averageLatencyMs: 1,
            totalTests: 1,
            _id: 0
          }
        },
        { $sort: { version: -1 } }
      ]) : Promise.resolve([])
    ]);

    const metrics = overallMetrics[0] || {
      totalTests: 0,
      successfulTests: 0,
      averageScore: 0,
      averageLatencyMs: 0,
      totalCost: 0,
      totalTokensUsed: 0
    };

    const successRate = metrics.totalTests > 0 
      ? metrics.successfulTests / metrics.totalTests 
      : 0;

    const analytics: TestAnalytics = {
      promptId: params.promptId,
      timeRange: {
        start: startDate,
        end: endDate
      },
      metrics: {
        totalTests: metrics.totalTests,
        successRate,
        averageScore: metrics.averageScore,
        averageLatencyMs: metrics.averageLatencyMs,
        totalCost: metrics.totalCost,
        totalTokensUsed: metrics.totalTokensUsed
      },
      trends: {
        scoreOverTime: trends.map(t => ({
          timestamp: new Date(t._id),
          score: t.score
        })),
        latencyOverTime: trends.map(t => ({
          timestamp: new Date(t._id),
          latencyMs: t.latencyMs
        })),
        costOverTime: trends.map(t => ({
          timestamp: new Date(t._id),
          cost: t.cost
        }))
      },
      topFailingTests: topFailingTests.map(t => ({
        testCaseId: t.testCaseId.toString(),
        testCaseName: t.testCaseName,
        failureRate: t.failureRate,
        commonErrors: t.commonErrors.filter(Boolean).slice(0, 3)
      })),
      ...(includeVersionComparison && versionComparison.length > 0 && {
        versionComparison: versionComparison.map(v => ({
          version: v.version,
          metrics: {
            successRate: v.successRate,
            averageScore: v.averageScore,
            averageLatencyMs: v.averageLatencyMs
          }
        }))
      })
    };

    logger.info({
      promptId: params.promptId,
      startDate,
      endDate,
      totalTests: metrics.totalTests,
      successRate,
      trendsCount: trends.length
    }, 'Generated test analytics');

    return createSuccessResponse({
      promptName: prompt.name,
      analytics,
      metadata: {
        generatedAt: new Date(),
        granularity,
        environment,
        version,
        includeVersionComparison
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}

function getTimeFormat(granularity: 'hour' | 'day' | 'week'): string {
  switch (granularity) {
    case 'hour': return '%Y-%m-%d-%H';
    case 'day': return '%Y-%m-%d';
    case 'week': return '%Y-W%U';
    default: return '%Y-%m-%d';
  }
}