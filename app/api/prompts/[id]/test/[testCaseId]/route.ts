import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt, TestCase } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse,
  zodErrorsToValidationDetails
} from '@/lib/api/responses';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
// Dynamically import PromptFooRunner to avoid bundling issues
let promptFooRunner: any = null;

async function loadPromptFooRunner() {
  if (!promptFooRunner && typeof window === 'undefined') {
    try {
      const { promptFooRunner: runner } = await import('@/lib/testing/promptfoo-runner');
      promptFooRunner = runner;
    } catch (error) {
      console.error('Failed to load PromptFooRunner:', error);
      return null;
    }
  }
  return promptFooRunner;
}
import { testResultParser } from '@/lib/testing/result-parser';
import { TestExecutionOptions } from '@/lib/testing/types';
import { PromptEnvironment } from '@/lib/database/types';
import { z } from 'zod';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('single-test-execution-api');

const SingleTestExecutionSchema = z.object({
  environment: z.nativeEnum(PromptEnvironment).default(PromptEnvironment.DEVELOPMENT),
  provider: z.string().default('openai'),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8000).optional(),
  timeout: z.number().min(10000).max(300000).default(60000),
  saveResult: z.boolean().default(true),
  customVars: z.record(z.any()).optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const { id, testCaseId } = await params;
    const idValidation = ObjectIdSchema.safeParse(id);
    const testCaseIdValidation = ObjectIdSchema.safeParse(testCaseId);
    
    if (!idValidation.success || !testCaseIdValidation.success) {
      return createErrorResponse('Invalid ID format', 'INVALID_ID', 400);
    }

    const body = await request.json().catch(() => ({}));
    const validation = SingleTestExecutionSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(validation.error.errors));
    }

    const options: TestExecutionOptions = {
      ...validation.data,
      async: false,
      maxConcurrency: 1,
      saveResults: validation.data.saveResult
    };

    const [prompt, testCase] = await Promise.all([
      Prompt.findById(id),
      TestCase.findById(testCaseId)
    ]);
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    if (!testCase) {
      return createNotFoundResponse('Test case');
    }

    if (testCase.promptId.toString() !== id) {
      return createErrorResponse(
        'Test case does not belong to this prompt',
        'TEST_CASE_MISMATCH',
        400
      );
    }

    if (!testCase.isActive) {
      return createErrorResponse(
        'Test case is inactive',
        'TEST_CASE_INACTIVE',
        400
      );
    }

    const activeVersion = prompt.getPrimaryVersion();
    if (!activeVersion) {
      return createErrorResponse(
        'Prompt has no primary version',
        'NO_PRIMARY_VERSION',
        400
      );
    }

    // Override test case variables if provided
    if (validation.data.customVars) {
      testCase.vars = { ...testCase.vars, ...validation.data.customVars };
    }

    logger.info({
      promptId: id,
      testCaseId: testCaseId,
      promptName: prompt.name,
      testCaseName: testCase.name,
      version: activeVersion.version,
      hasCustomVars: !!validation.data.customVars
    }, 'Starting single test case execution');

    const executionResult = await promptFooRunner.executeTests(
      prompt,
      [testCase],
      options
    );

    if (!executionResult.result) {
      return createErrorResponse(
        'Test execution failed to produce results',
        'EXECUTION_FAILED',
        500
      );
    }

    const testResult = executionResult.result.results[0];
    if (!testResult) {
      return createErrorResponse(
        'No test result generated',
        'NO_RESULT',
        500
      );
    }

    let resultId: string | null = null;
    if (options.saveResults) {
      const resultIds = await testResultParser.parseAndStore(
        id,
        activeVersion.version,
        [testCase._id.toString()],
        executionResult.result,
        options
      );
      resultId = resultIds[0] || null;
    }

    const executionSummary = {
      success: testResult.success,
      score: testResult.score,
      latencyMs: testResult.response.latencyMs,
      tokensUsed: testResult.response.tokenUsage?.total || 0,
      cost: testResult.response.cost || 0,
      output: testResult.response.output,
      assertionResults: testResult.gradingResult ? [{
        type: testResult.gradingResult.assertion?.type || 'unknown',
        passed: testResult.gradingResult.pass,
        score: testResult.gradingResult.score,
        reason: testResult.gradingResult.reason
      }] : []
    };

    logger.info({
      promptId: id,
      testCaseId: testCaseId,
      jobId: executionResult.jobId,
      success: testResult.success,
      score: testResult.score,
      latencyMs: testResult.response.latencyMs,
      resultId
    }, 'Completed single test case execution');

    return createSuccessResponse({
      jobId: executionResult.jobId,
      promptId: id,
      testCaseId: testCaseId,
      promptName: prompt.name,
      testCaseName: testCase.name,
      version: activeVersion.version,
      execution: executionSummary,
      resultId,
      metadata: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        environment: options.environment,
        executedAt: new Date()
      }
    });
    
  } catch (error: Error | unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error occurred');
    logger.error({
      promptId: typeof params === 'object' && 'id' in params ? (await params).id : undefined,
      testCaseId: typeof params === 'object' && 'testCaseId' in params ? (await params).testCaseId : undefined,
      error: err.message,
      stack: err.stack
    }, 'Single test execution failed');
    
    return handleApiError(error);
  }
}