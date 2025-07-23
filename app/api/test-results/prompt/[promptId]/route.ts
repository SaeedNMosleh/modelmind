import { NextRequest } from 'next/server';
import { connectToDatabase, TestResult, Prompt } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  parsePaginationParams,
  createPaginationMeta
} from '@/lib/api/responses';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import { PromptEnvironment } from '@/lib/database/types';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'prompt-test-results-api' });

const PromptTestResultQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => val ? Math.max(1, parseInt(val)) : 1),
  limit: z
    .string()
    .optional()
    .transform(val => val ? Math.min(100, Math.max(1, parseInt(val))) : 20),
  sort: z
    .enum(['createdAt', 'score', 'latencyMs', 'cost', 'success'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  version: z.string().optional(),
  environment: z.nativeEnum(PromptEnvironment).optional(),
  success: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  startDate: z
    .string()
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  endDate: z
    .string()
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  includeTestCase: z
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
    const queryValidation = PromptTestResultQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryValidation.success) {
      return createErrorResponse(
        'Invalid query parameters',
        'VALIDATION_ERROR',
        400,
        queryValidation.error.errors
      );
    }

    const {
      page,
      limit,
      sort,
      order,
      version,
      environment,
      success,
      startDate,
      endDate,
      includeTestCase
    } = queryValidation.data;

    // Verify prompt exists
    const prompt = await Prompt.findById(params.promptId).select('name currentVersion');
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const filter: any = { promptId: params.promptId };
    
    if (version) filter.promptVersion = version;
    if (environment) filter['metadata.environment'] = environment;
    if (typeof success === 'boolean') filter.success = success;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: any = { [sort]: sortOrder };

    const populateOptions = includeTestCase 
      ? [
          { path: 'testCaseId', select: 'name description vars assert' }
        ]
      : [
          { path: 'testCaseId', select: 'name' }
        ];

    const [testResults, total, aggregateStats] = await Promise.all([
      TestResult.find(filter)
        .populate(populateOptions)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TestResult.countDocuments(filter),
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
            totalTokens: { $sum: '$tokensUsed' },
            minScore: { $min: '$score' },
            maxScore: { $max: '$score' }
          }
        }
      ])
    ]);

    const stats = aggregateStats[0] || {
      totalTests: 0,
      successfulTests: 0,
      averageScore: 0,
      averageLatencyMs: 0,
      totalCost: 0,
      totalTokens: 0,
      minScore: 0,
      maxScore: 0
    };

    const successRate = stats.totalTests > 0 ? stats.successfulTests / stats.totalTests : 0;

    const meta = createPaginationMeta(total, page, limit);
    
    logger.info({ 
      promptId: params.promptId,
      filter, 
      total, 
      page, 
      limit,
      successRate
    }, 'Retrieved prompt test results');

    return createSuccessResponse({
      promptId: params.promptId,
      promptName: prompt.name,
      currentVersion: prompt.currentVersion,
      statistics: {
        ...stats,
        successRate,
        failureRate: 1 - successRate
      },
      testResults
    }, meta);
    
  } catch (error) {
    return handleApiError(error);
  }
}