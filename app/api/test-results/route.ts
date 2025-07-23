import { NextRequest } from 'next/server';
import { connectToDatabase, TestResult } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  parsePaginationParams,
  createPaginationMeta,
  createValidationErrorResponse
} from '@/lib/api/responses';
import { PromptEnvironment } from '@/lib/database/types';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'test-results-api' });

const TestResultQuerySchema = z.object({
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
  promptId: z.string().optional(),
  testCaseId: z.string().optional(),
  promptVersion: z.string().optional(),
  environment: z.nativeEnum(PromptEnvironment).optional(),
  success: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  minScore: z
    .string()
    .optional()
    .transform(val => val ? parseFloat(val) : undefined),
  maxScore: z
    .string()
    .optional()
    .transform(val => val ? parseFloat(val) : undefined),
  startDate: z
    .string()
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  endDate: z
    .string()
    .optional()
    .transform(val => val ? new Date(val) : undefined)
});

export async function GET(request: NextRequest) {
  try {
    await withTimeout(connectToDatabase());
    
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = TestResultQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryValidation.success) {
      return createValidationErrorResponse(queryValidation.error.errors);
    }
    
    const {
      page,
      limit,
      sort,
      order,
      promptId,
      testCaseId,
      promptVersion,
      environment,
      success,
      minScore,
      maxScore,
      startDate,
      endDate
    } = queryValidation.data;

    const filter: any = {};
    
    if (promptId) filter.promptId = promptId;
    if (testCaseId) filter.testCaseId = testCaseId;
    if (promptVersion) filter.promptVersion = promptVersion;
    if (environment) filter['metadata.environment'] = environment;
    if (typeof success === 'boolean') filter.success = success;
    
    if (minScore !== undefined || maxScore !== undefined) {
      filter.score = {};
      if (minScore !== undefined) filter.score.$gte = minScore;
      if (maxScore !== undefined) filter.score.$lte = maxScore;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: any = { [sort]: sortOrder };

    const [testResults, total] = await Promise.all([
      TestResult.find(filter)
        .populate('promptId', 'name agentType operation')
        .populate('testCaseId', 'name description')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TestResult.countDocuments(filter)
    ]);

    const meta = createPaginationMeta(total, page, limit);
    
    logger.info({ 
      filter, 
      total, 
      page, 
      limit 
    }, 'Retrieved test results list');

    return createSuccessResponse(testResults, meta);
    
  } catch (error) {
    return handleApiError(error);
  }
}