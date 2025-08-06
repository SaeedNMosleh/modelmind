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

const logger = createEnhancedLogger('prompt-version-detail-api');

export async function GET(
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

    const prompt = await Prompt.findById(id)
      .select('name agentType operation versions primaryVersion')
      .lean() as unknown as {
        name: string;
        agentType: string;
        operation: string;
        versions: Array<{ version: string; [key: string]: unknown }>;
        primaryVersion: string;
      };
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const versionData = prompt.versions.find(v => v.version === version);
    
    if (!versionData) {
      return createNotFoundResponse('Version');
    }

    logger.info({ 
      promptId: id,
      version: version 
    }, 'Retrieved specific prompt version');
    
    return createSuccessResponse({
      promptId: id,
      promptName: prompt.name,
      agentType: prompt.agentType,
      operation: prompt.operation,
      currentVersion: prompt.primaryVersion,
      version: versionData
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}