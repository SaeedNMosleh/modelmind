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
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const { id, version } = await params;
    const idValidation = ObjectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const versionValidation = VersionSchema.safeParse(version);
    if (!versionValidation.success) {
      return createErrorResponse('Invalid version format', 'INVALID_VERSION', 400);
    }

    const prompt = await Prompt.findById(id);
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const targetVersion = prompt.versions.find(v => v.version === version);
    
    if (!targetVersion) {
      return createNotFoundResponse(`Version ${version}`);
    }

    if (targetVersion.isActive) {
      return createErrorResponse(
        `Version ${version} is already active`,
        'VERSION_ALREADY_ACTIVE',
        400
      );
    }

    const previousActiveVersion = prompt.getCurrentVersion();
    
    try {
      prompt.activateVersion(version);
      await prompt.save();
    } catch (activationError: Error | unknown) {
      return createErrorResponse(
        activationError instanceof Error ? activationError.message : 'Unknown activation error',
        'ACTIVATION_ERROR',
        400
      );
    }
    
    logger.info({ 
      promptId: id,
      previousVersion: previousActiveVersion?.version,
      newActiveVersion: version,
      isProduction: prompt.isProduction
    }, 'Activated prompt version');

    return createSuccessResponse({
      promptId: id,
      promptName: prompt.name,
      previousActiveVersion: previousActiveVersion?.version,
      newActiveVersion: version,
      activatedAt: new Date(),
      isProduction: prompt.isProduction,
      version: prompt.getCurrentVersion()
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}