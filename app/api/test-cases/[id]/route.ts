import { NextRequest } from 'next/server';
import { connectToDatabase, TestCase, TestResult } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse
} from '@/lib/api/responses';
import { TestCaseValidationSchema } from '@/lib/database/models/testCase';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'test-case-detail-api' });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid test case ID format', 'INVALID_ID', 400);
    }

    const testCase = await TestCase.findById(params.id)
      .populate('promptId', 'name agentType diagramType operation')
      .lean();
    
    if (!testCase) {
      return createNotFoundResponse('Test case');
    }

    logger.info({ testCaseId: params.id }, 'Retrieved test case details');
    
    return createSuccessResponse(testCase);
    
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid test case ID format', 'INVALID_ID', 400);
    }

    const body = await request.json();
    const validation = TestCaseValidationSchema.partial().safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(validation.error.errors);
    }

    const testCase = await TestCase.findByIdAndUpdate(
      params.id,
      { ...validation.data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('promptId', 'name agentType diagramType operation');
    
    if (!testCase) {
      return createNotFoundResponse('Test case');
    }
    
    logger.info({ 
      testCaseId: params.id,
      name: testCase.name 
    }, 'Updated test case');

    return createSuccessResponse(testCase);
    
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid test case ID format', 'INVALID_ID', 400);
    }

    const testCase = await TestCase.findById(params.id);
    
    if (!testCase) {
      return createNotFoundResponse('Test case');
    }

    const testResultCount = await TestResult.countDocuments({ testCaseId: params.id });

    if (testResultCount > 0) {
      const searchParams = request.nextUrl.searchParams;
      const force = searchParams.get('force') === 'true';
      
      if (!force) {
        return createErrorResponse(
          `Cannot delete test case with ${testResultCount} test results. Use ?force=true to cascade delete.`,
          'TEST_CASE_HAS_RESULTS',
          400,
          { testResultCount }
        );
      }

      await TestResult.deleteMany({ testCaseId: params.id });
      
      logger.warn({ 
        testCaseId: params.id,
        deletedTestResults: testResultCount 
      }, 'Cascade deleted test case results');
    }

    await TestCase.findByIdAndDelete(params.id);
    
    logger.info({ testCaseId: params.id }, 'Deleted test case');

    return createSuccessResponse({ 
      id: params.id, 
      deleted: true,
      cascadeDeleted: {
        testResults: testResultCount
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}