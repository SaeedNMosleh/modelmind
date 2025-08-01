import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse
} from '@/lib/api/responses';
import { CreateVersionSchema, ObjectIdSchema } from '@/lib/api/validation/prompts';
import { zodErrorsToValidationDetails } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'prompt-versions-api' });

export async function GET(
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

    const prompt = await Prompt.findById(id)
      .select('versions primaryVersion name')
      .lean() as unknown as { 
        versions: Array<{ createdAt: Date }>;
        primaryVersion: string;
        name: string;
      };
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const sortedVersions = prompt.versions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    logger.info({ 
      promptId: id,
      versionCount: sortedVersions.length 
    }, 'Retrieved prompt versions');
    
    return createSuccessResponse({
      promptId: id,
      promptName: prompt.name,
      currentVersion: prompt.primaryVersion,
      versions: sortedVersions
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}

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

    const body = await request.json();
    const validation = CreateVersionSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(validation.error.errors));
    }

    const prompt = await Prompt.findById(id);
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    try {
      prompt.addVersion(validation.data);
      await prompt.save();
    } catch (versionError: Error | unknown) {
      return createErrorResponse(
        versionError instanceof Error ? versionError.message : String(versionError),
        'VERSION_ERROR',
        400
      );
    }
    
    const newVersion = prompt.getPrimaryVersion();
    
    logger.info({ 
      promptId: id,
      version: validation.data.version,
      isPrimary: true
    }, 'Created new prompt version');

    return createSuccessResponse({
      promptId: id,
      version: newVersion,
      currentVersion: prompt.primaryVersion
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}