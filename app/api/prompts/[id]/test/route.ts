import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt, TestCase } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse
} from '@/lib/api/responses';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import { zodErrorsToValidationDetails } from '@/lib/api/validation/prompts';
import { testResultParser } from '@/lib/testing/result-parser';
import { TestExecutionOptions } from '@/lib/testing/types';
import { PromptEnvironment } from '@/lib/database/types';
import { z } from 'zod';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('prompt-test-execution-api');

// Dynamically import PromptFooRunner to avoid bundling issues
let promptFooRunner: any = null;

async function loadPromptFooRunner() {
  if (!promptFooRunner && typeof window === 'undefined') {
    try {
      const { promptFooRunner: runner } = await import('@/lib/testing/promptfoo-runner');
      promptFooRunner = runner;
    } catch (error) {
      logger.error({ error }, 'Failed to load PromptFooRunner');
      return null;
    }
  }
  return promptFooRunner;
}

// Extended TestExecutionOptions with test-specific fields
interface PromptTestExecutionOptions extends TestExecutionOptions {
  testCaseIds?: string[];
}

const TestExecutionSchema = z.object({
  testCaseIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  environment: z.nativeEnum(PromptEnvironment).default(PromptEnvironment.DEVELOPMENT),
  provider: z.string().default('openai'),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8000).optional(),
  maxConcurrency: z.number().min(1).max(10).default(3),
  timeout: z.number().min(10000).max(300000).default(120000),
  async: z.boolean().default(false),
  saveResults: z.boolean().default(true),
  customEvaluators: z.array(z.string()).default([])
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const { id } = await params;
    const idValidation = ObjectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const body = await request.json().catch(() => ({}));
    const validation = TestExecutionSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(validation.error.errors));
    }

    const options: PromptTestExecutionOptions = validation.data;

    const prompt = await Prompt.findById(id);
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const activeVersion = prompt.getPrimaryVersion();
    if (!activeVersion) {
      return createErrorResponse(
        'Prompt has no primary version',
        'NO_PRIMARY_VERSION',
        400
      );
    }

    // Get test cases
    let testCases;
    if (options.testCaseIds && options.testCaseIds.length > 0) {
      testCases = await TestCase.find({
        _id: { $in: options.testCaseIds },
        promptId: id,
        isActive: true
      });

      if (testCases.length !== options.testCaseIds.length) {
        return createErrorResponse(
          'Some test cases not found or inactive',
          'TEST_CASES_NOT_FOUND',
          400
        );
      }
    } else {
      testCases = await TestCase.find({
        promptId: id,
        isActive: true
      }).limit(20); // Limit to prevent excessive testing
    }

    if (testCases.length === 0) {
      return createErrorResponse(
        'No active test cases found for this prompt',
        'NO_TEST_CASES',
        400
      );
    }

    // Load PromptFooRunner dynamically
    const runner = await loadPromptFooRunner();
    if (!runner) {
      return createErrorResponse(
        'Test execution service is not available',
        'SERVICE_UNAVAILABLE',
        503
      );
    }

    logger.info({
      promptId: id,
      promptName: prompt.name,
      version: activeVersion.version,
      testCaseCount: testCases.length,
      async: options.async,
      environment: options.environment
    }, 'Starting prompt test execution');

    const executionResult = await runner.executeTests(
      prompt,
      testCases,
      options
    );

    if (options.async) {
      return createSuccessResponse({
        jobId: executionResult.jobId,
        async: true,
        promptId: id,
        promptName: prompt.name,
        version: activeVersion.version,
        testCaseCount: testCases.length,
        status: 'running',
        statusUrl: `/api/prompts/${id}/test/status/${executionResult.jobId}`
      });
    } else {
      // Synchronous execution - parse and store results
      const resultIds = await testResultParser.parseAndStore(
        id,
        activeVersion.version,
        testCases.map(tc => tc._id.toString()),
        executionResult.result!,
        options
      );

      const report = testResultParser.generateTestReport(executionResult.result!);

      logger.info({
        promptId: id,
        jobId: executionResult.jobId,
        testCaseCount: testCases.length,
        successRate: report.summary.successRate,
        resultIds: resultIds.length
      }, 'Completed synchronous test execution');

      return createSuccessResponse({
        jobId: executionResult.jobId,
        async: false,
        promptId: id,
        promptName: prompt.name,
        version: activeVersion.version,
        execution: {
          testCaseCount: testCases.length,
          resultIds,
          summary: report.summary,
          failures: report.failures,
          recommendations: report.recommendations
        },
        rawResult: executionResult.result
      });
    }
    
  } catch (error: Error | unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error occurred');
    // Use the destructured id from params, or fallback to undefined if not available
    let promptId: string | undefined;
    try {
      promptId = typeof params === 'object' && 'id' in params ? (await params).id : undefined;
    } catch {
      promptId = undefined;
    }
    logger.error({
      promptId,
      error: err.message,
      stack: err.stack
    }, 'Test execution failed');
    
    return handleApiError(error);
  }
}