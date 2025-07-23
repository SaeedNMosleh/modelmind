import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse
} from '@/lib/api/responses';
import { ObjectIdSchema, VersionSchema } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'prompt-activate-version-api' });

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const versionValidation = VersionSchema.safeParse(params.version);
    if (!versionValidation.success) {
      return createErrorResponse('Invalid version format', 'INVALID_VERSION', 400);
    }

    const prompt = await Prompt.findById(params.id);
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const targetVersion = prompt.versions.find(v => v.version === params.version);
    
    if (!targetVersion) {
      return createNotFoundResponse(`Version ${params.version}`);
    }

    if (targetVersion.isActive) {
      return createErrorResponse(
        `Version ${params.version} is already active`,
        'VERSION_ALREADY_ACTIVE',
        400
      );
    }

    const previousActiveVersion = prompt.getCurrentVersion();
    
    try {
      prompt.activateVersion(params.version);
      await prompt.save();
    } catch (activationError: any) {
      return createErrorResponse(
        activationError.message,
        'ACTIVATION_ERROR',
        400
      );
    }
    
    logger.info({ 
      promptId: params.id,
      previousVersion: previousActiveVersion?.version,
      newActiveVersion: params.version,
      isProduction: prompt.isProduction
    }, 'Activated prompt version');

    return createSuccessResponse({
      promptId: params.id,
      promptName: prompt.name,
      previousActiveVersion: previousActiveVersion?.version,
      newActiveVersion: params.version,
      activatedAt: new Date(),
      isProduction: prompt.isProduction,
      version: prompt.getCurrentVersion()
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}