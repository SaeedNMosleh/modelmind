import { NextRequest } from 'next/server';
import { connectToDatabase, TestResult } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse
} from '@/lib/api/responses';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'test-result-detail-api' });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid test result ID format', 'INVALID_ID', 400);
    }

    const testResult = await TestResult.findById(params.id)
      .populate('promptId', 'name agentType operation diagramType')
      .populate('testCaseId', 'name description vars assert')
      .lean();
    
    if (!testResult) {
      return createNotFoundResponse('Test result');
    }

    logger.info({ testResultId: params.id }, 'Retrieved test result details');
    
    return createSuccessResponse(testResult);
    
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
      return createErrorResponse('Invalid test result ID format', 'INVALID_ID', 400);
    }

    const testResult = await TestResult.findByIdAndDelete(params.id);
    
    if (!testResult) {
      return createNotFoundResponse('Test result');
    }
    
    logger.info({ testResultId: params.id }, 'Deleted test result');

    return createSuccessResponse({ 
      id: params.id, 
      deleted: true 
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}