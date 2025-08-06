import { NextRequest } from 'next/server';
import { connectToDatabase, TestCase } from '@/lib/database';
import { 
  createSuccessResponse, 
  handleApiError,
  withTimeout,
  createPaginationMeta,
  createValidationErrorResponse
} from '@/lib/api/responses';
import { TestCaseValidationSchema } from '@/lib/database/models/testCase';
import { z } from 'zod';
import { zodErrorsToValidationDetails } from '@/lib/api/validation/prompts';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('test-cases-api');

const TestCaseQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => val ? Math.max(1, parseInt(val)) : 1),
  limit: z
    .string()
    .optional()
    .transform(val => val ? Math.min(100, Math.max(1, parseInt(val))) : 20),
  sort: z
    .enum(['name', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  promptId: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  search: z.string().max(100).optional(),
  tags: z
    .string()
    .optional()
    .transform(val => val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : undefined)
});

export async function GET(request: NextRequest) {
  try {
    await withTimeout(connectToDatabase());
    
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = TestCaseQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryValidation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(queryValidation.error.errors));
    }
    
    const {
      page,
      limit,
      sort,
      order,
      promptId,
      isActive,
      search,
      tags
    } = queryValidation.data;

    const filter: Record<string, unknown> = {};
    
    if (promptId) filter.promptId = promptId;
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (tags && tags.length > 0) filter.tags = { $in: tags };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: Record<string, -1 | 1> = { [sort]: sortOrder };

    const [testCases, total] = await Promise.all([
      TestCase.find(filter)
        .populate('promptId', 'name agentType diagramType')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TestCase.countDocuments(filter)
    ]);

    const meta = createPaginationMeta(total, page, limit);
    
    logger.info({ 
      filter, 
      total, 
      page, 
      limit 
    }, 'Retrieved test cases list');

    return createSuccessResponse(testCases, meta);
    
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await withTimeout(connectToDatabase());
    
    const body = await request.json();
    const validation = TestCaseValidationSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(validation.error.errors));
    }

    const testCase = new TestCase(validation.data);
    await testCase.save();
    
    await testCase.populate('promptId', 'name agentType diagramType');
    
    logger.info({ 
      testCaseId: testCase._id, 
      name: testCase.name,
      promptId: testCase.promptId 
    }, 'Created new test case');

    return createSuccessResponse(testCase);
    
  } catch (error) {
    return handleApiError(error);
  }
}