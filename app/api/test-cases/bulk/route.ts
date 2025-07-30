import { NextRequest } from 'next/server';
import { connectToDatabase, TestCase } from '@/lib/database';
import { 
  createSuccessResponse, 
  handleApiError,
  withTimeout,
  createValidationErrorResponse,
  zodErrorsToValidationDetails,
  ValidationErrorDetails
  // createErrorResponse - removed unused import
} from '@/lib/api/responses';
import { TestCaseValidationSchema } from '@/lib/database/models/testCase';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'test-cases-bulk-api' });

const BulkTestCaseSchema = z.object({
  promptId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid prompt ID'),
  testCases: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().default(''),
    vars: z.record(z.unknown()),
    assert: z.array(z.object({
      type: z.string(),
      value: z.unknown().optional(),
      threshold: z.number().optional(),
      provider: z.string().optional(),
      rubric: z.string().optional(),
      metric: z.string().optional()
    })).min(1),
    tags: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).optional()
  })).min(1).max(50),
  replaceExisting: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    await withTimeout(connectToDatabase());
    
    const body = await request.json();
    const validation = BulkTestCaseSchema.safeParse(body);
    
    if (!validation.success) {
      // Convert Zod errors to the expected ValidationErrorDetails format
      return createValidationErrorResponse(zodErrorsToValidationDetails(validation.error.errors));
    }

    const { promptId, testCases, replaceExisting } = validation.data;

    if (replaceExisting) {
      const deletedCount = await TestCase.deleteMany({ 
        promptId,
        isActive: true 
      });
      
      logger.info({ 
        promptId,
        deletedCount: deletedCount.deletedCount 
      }, 'Replaced existing test cases');
    }

    const testCaseDocuments = testCases.map(tc => ({
      ...tc,
      promptId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Validate each test case individually
    const validationResults = testCaseDocuments.map((tc, index) => {
      const result = TestCaseValidationSchema.safeParse(tc);
      return {
        index,
        valid: result.success,
        error: result.success ? null : result.error.errors,
        data: result.success ? result.data : null
      };
    });

    const invalidCases = validationResults.filter(r => !r.valid);
    if (invalidCases.length > 0) {
      // Convert the array of validation errors to the expected ValidationErrorDetails format
      const errorDetails: ValidationErrorDetails = {
        message: {
          message: 'Some test cases failed validation'
        }
      };
      
      invalidCases.forEach((ic) => {
        if (ic.error) {
          ic.error.forEach((err, errIdx) => {
            const key = `testCase_${ic.index}_error_${errIdx}`;
            const path = err.path.join('.');
            errorDetails[key] = {
              message: err.message,
              path: `testCases[${ic.index}].${path}`,
              value: err.code
            };
          });
        }
      });
      
      return createValidationErrorResponse(errorDetails);
    }

    const validTestCases = validationResults.map(r => r.data);
    const createdTestCases = await TestCase.insertMany(validTestCases);
    
    await TestCase.populate(createdTestCases, {
      path: 'promptId',
      select: 'name agentType diagramType'
    });
    
    logger.info({ 
      promptId,
      createdCount: createdTestCases.length,
      replaceExisting
    }, 'Created test cases in bulk');

    return createSuccessResponse({
      promptId,
      createdCount: createdTestCases.length,
      replaceExisting,
      testCases: createdTestCases
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}