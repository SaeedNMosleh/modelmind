import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createNotFoundResponse
} from '@/lib/api/responses';
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
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import { PromptFooExecutionResult } from '@/lib/testing/types';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('test-status-api');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id, jobId } = await params;
    const idValidation = ObjectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const job = promptFooRunner.getJobStatus(jobId);
    
    if (!job) {
      return createNotFoundResponse('Test execution job');
    }

    if (job.promptId !== id) {
      return createErrorResponse(
        'Job does not belong to this prompt',
        'JOB_MISMATCH',
        400
      );
    }

    let result: PromptFooExecutionResult | null = null;
    let report: {
      summary: {
        totalTests: number;
        successfulTests: number;
        failedTests: number;
        successRate: number;
        averageScore: number;
        averageLatencyMs: number;
        totalTokensUsed: number;
        totalCost: number;
        tokenBreakdown: {
          prompt: number;
          completion: number;
        };
      };
      failures: Array<{
        testIndex: number;
        testVars: Record<string, unknown>;
        error: string;
        failedAssertions: Array<{
          type: string;
          reason: string;
          score: number;
        }>;
      }>;
      recommendations: string[];
    } | null = null;

    if (job.status === 'completed') {
      const promptFooResult = promptFooRunner.getJobResult(jobId);
      if (promptFooResult) {
        result = promptFooResult;
        report = testResultParser.generateTestReport(promptFooResult);
      }
    }

    const response = {
      jobId: job.id,
      promptId: job.promptId,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      metadata: job.metadata,
      ...(result && { 
        result: {
          summary: report?.summary,
          failures: report?.failures,
          recommendations: report?.recommendations,
          rawData: result
        }
      })
    };

    // Auto-cleanup completed jobs older than 1 hour
    if (job.status === 'completed' || job.status === 'failed') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (job.completedAt && job.completedAt < oneHourAgo) {
        promptFooRunner.cleanupJob(jobId);
        logger.debug({ jobId: jobId }, 'Auto-cleaned up old job');
      }
    }

    logger.debug({
      jobId: jobId,
      promptId: id,
      status: job.status,
      progress: job.progress
    }, 'Retrieved test execution status');

    return createSuccessResponse(response);
    
  } catch (error: Error | unknown) {
    const { id, jobId } = await params;
    logger.error({
      jobId: jobId,
      promptId: id,
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to get test execution status');
    
    return createErrorResponse(
      'Failed to retrieve test execution status',
      'STATUS_ERROR',
      500
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id, jobId } = await params;
    const idValidation = ObjectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const job = promptFooRunner.getJobStatus(jobId);
    
    if (!job) {
      return createNotFoundResponse('Test execution job');
    }

    if (job.promptId !== id) {
      return createErrorResponse(
        'Job does not belong to this prompt',
        'JOB_MISMATCH',
        400
      );
    }

    if (job.status === 'running') {
      return createErrorResponse(
        'Cannot cancel running job',
        'JOB_RUNNING',
        400
      );
    }

    promptFooRunner.cleanupJob(jobId);
    
    logger.info({
      jobId: jobId,
      promptId: id
    }, 'Cleaned up test execution job');

    return createSuccessResponse({
      jobId: jobId,
      promptId: id,
      cleaned: true
    });
    
  } catch (error: Error | unknown) {
    const { id, jobId } = await params;
    logger.error({
      jobId: jobId,
      promptId: id,
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to cleanup test execution job');
    
    return createErrorResponse(
      'Failed to cleanup test execution job',
      'CLEANUP_ERROR',
      500
    );
  }
}