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

const logger = pino({ name: 'prompt-version-detail-api' });

export async function GET(
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

    const prompt = await Prompt.findById(params.id)
      .select('name agentType operation versions currentVersion')
      .lean() as unknown as {
        name: string;
        agentType: string;
        operation: string;
        versions: Array<{ version: string; [key: string]: unknown }>;
        currentVersion: string;
      };
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const version = prompt.versions.find(v => v.version === params.version);
    
    if (!version) {
      return createNotFoundResponse('Version');
    }

    logger.info({ 
      promptId: params.id,
      version: params.version 
    }, 'Retrieved specific prompt version');
    
    return createSuccessResponse({
      promptId: params.id,
      promptName: prompt.name,
      agentType: prompt.agentType,
      operation: prompt.operation,
      currentVersion: prompt.currentVersion,
      version: version
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}