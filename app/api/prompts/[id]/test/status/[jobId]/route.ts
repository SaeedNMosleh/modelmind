import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createNotFoundResponse
} from '@/lib/api/responses';
import { promptFooRunner } from '@/lib/testing/promptfoo-runner';
import { testResultParser } from '@/lib/testing/result-parser';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'test-status-api' });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; jobId: string } }
) {
  try {
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const job = promptFooRunner.getJobStatus(params.jobId);
    
    if (!job) {
      return createNotFoundResponse('Test execution job');
    }

    if (job.promptId !== params.id) {
      return createErrorResponse(
        'Job does not belong to this prompt',
        'JOB_MISMATCH',
        400
      );
    }

    let result = null;
    let report = null;

    if (job.status === 'completed') {
      const promptFooResult = promptFooRunner.getJobResult(params.jobId);
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
        promptFooRunner.cleanupJob(params.jobId);
        logger.debug({ jobId: params.jobId }, 'Auto-cleaned up old job');
      }
    }

    logger.debug({
      jobId: params.jobId,
      promptId: params.id,
      status: job.status,
      progress: job.progress
    }, 'Retrieved test execution status');

    return createSuccessResponse(response);
    
  } catch (error: any) {
    logger.error({
      jobId: params.jobId,
      promptId: params.id,
      error: error.message
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
  { params }: { params: { id: string; jobId: string } }
) {
  try {
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const job = promptFooRunner.getJobStatus(params.jobId);
    
    if (!job) {
      return createNotFoundResponse('Test execution job');
    }

    if (job.promptId !== params.id) {
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

    promptFooRunner.cleanupJob(params.jobId);
    
    logger.info({
      jobId: params.jobId,
      promptId: params.id
    }, 'Cleaned up test execution job');

    return createSuccessResponse({
      jobId: params.jobId,
      promptId: params.id,
      cleaned: true
    });
    
  } catch (error: any) {
    logger.error({
      jobId: params.jobId,
      promptId: params.id,
      error: error.message
    }, 'Failed to cleanup test execution job');
    
    return createErrorResponse(
      'Failed to cleanup test execution job',
      'CLEANUP_ERROR',
      500
    );
  }
}