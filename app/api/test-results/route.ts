import { NextRequest } from 'next/server';
import { connectToDatabase, TestResult } from '@/lib/database';
import { 
  createSuccessResponse, 
  handleApiError,
  withTimeout,
  createPaginationMeta,
  createValidationErrorResponse,
  zodErrorsToValidationDetails
} from '@/lib/api/responses';
import { z } from 'zod';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('test-results-api');

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
  environment: z.enum(['production', 'development']).optional(),
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
      return createValidationErrorResponse(zodErrorsToValidationDetails(queryValidation.error.errors));
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

    const filter: Record<string, unknown> = {};
    
    if (promptId) filter.promptId = promptId;
    if (testCaseId) filter.testCaseId = testCaseId;
    if (promptVersion) filter.promptVersion = promptVersion;
    if (environment) filter['metadata.environment'] = environment;
    if (typeof success === 'boolean') filter.success = success;
    
    if (minScore !== undefined || maxScore !== undefined) {
      const scoreFilter: Record<string, number> = {};
      if (minScore !== undefined) scoreFilter.$gte = minScore;
      if (maxScore !== undefined) scoreFilter.$lte = maxScore;
      filter.score = scoreFilter;
    }
    
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      filter.createdAt = dateFilter;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { [sort]: sortOrder };

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