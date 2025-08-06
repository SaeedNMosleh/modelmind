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
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('prompt-activate-version-api');

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

    if (targetVersion.version === prompt.primaryVersion) {
      return createErrorResponse(
        `Version ${version} is already the primary version`,
        'VERSION_ALREADY_PRIMARY',
        400
      );
    }

    // Store the previous primary version before changing it
    const previousPrimaryVersion = prompt.versions.find(v => v.version === prompt.primaryVersion);
    
    try {
      prompt.setPrimaryVersion(version);
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
      previousVersion: previousPrimaryVersion?.version,
      newPrimaryVersion: version,
      isProduction: prompt.isProduction
    }, 'Set prompt primary version');

    return createSuccessResponse({
      promptId: id,
      promptName: prompt.name,
      previousPrimaryVersion: previousPrimaryVersion?.version,
      newPrimaryVersion: version,
      activatedAt: new Date(),
      isProduction: prompt.isProduction,
      version: prompt.getPrimaryVersion()
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}