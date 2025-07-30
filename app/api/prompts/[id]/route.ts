import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt, TestCase, TestResult } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse,
  zodErrorsToValidationDetails,
  toValidationDetails
} from '@/lib/api/responses';
import { UpdatePromptSchema, ObjectIdSchema } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'prompt-detail-api' });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const prompt = await Prompt.findById(params.id).lean();
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    logger.info({ promptId: params.id }, 'Retrieved prompt details');
    
    return createSuccessResponse(prompt);
    
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
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const body = await request.json();
    const validation = UpdatePromptSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(validation.error.errors));
    }

    const prompt = await Prompt.findById(params.id);
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const { newVersion, ...updateData } = validation.data;
    
    if (updateData.name && updateData.name !== prompt.name) {
      const existingPrompt = await Prompt.findOne({ 
        name: updateData.name,
        agentType: updateData.agentType || prompt.agentType,
        _id: { $ne: params.id }
      });
      
      if (existingPrompt) {
        return createErrorResponse(
          'A prompt with this name and agent type already exists',
          'PROMPT_EXISTS',
          409
        );
      }
    }

    Object.assign(prompt, updateData);

    if (newVersion) {
      try {
        prompt.addVersion(newVersion);
      } catch (versionError: Error | unknown) {
        return createErrorResponse(
          versionError instanceof Error ? versionError.message : 'Unknown version error',
          'VERSION_ERROR',
          400
        );
      }
    }

    await prompt.save();
    
    logger.info({ 
      promptId: params.id,
      hasNewVersion: !!newVersion,
      version: newVersion?.version 
    }, 'Updated prompt');

    return createSuccessResponse(prompt);
    
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
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const prompt = await Prompt.findById(params.id);
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    if (prompt.isProduction) {
      return createErrorResponse(
        'Cannot delete a production prompt. Please deactivate it first.',
        'PRODUCTION_PROMPT_DELETE',
        400
      );
    }

    const [testCaseCount, testResultCount] = await Promise.all([
      TestCase.countDocuments({ promptId: params.id }),
      TestResult.countDocuments({ promptId: params.id })
    ]);

    if (testCaseCount > 0 || testResultCount > 0) {
      const searchParams = request.nextUrl.searchParams;
      const force = searchParams.get('force') === 'true';
      
      if (!force) {
        return createErrorResponse(
          `Cannot delete prompt with ${testCaseCount} test cases and ${testResultCount} test results. Use ?force=true to cascade delete.`,
          'PROMPT_HAS_DEPENDENCIES',
          400,
          toValidationDetails({ testCaseCount, testResultCount })
        );
      }

      await Promise.all([
        TestCase.deleteMany({ promptId: params.id }),
        TestResult.deleteMany({ promptId: params.id })
      ]);
      
      logger.warn({ 
        promptId: params.id,
        deletedTestCases: testCaseCount,
        deletedTestResults: testResultCount 
      }, 'Cascade deleted prompt dependencies');
    }

    await Prompt.findByIdAndDelete(params.id);
    
    logger.info({ promptId: params.id }, 'Deleted prompt');

    return createSuccessResponse({ 
      id: params.id, 
      deleted: true,
      cascadeDeleted: {
        testCases: testCaseCount,
        testResults: testResultCount
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}