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

const logger = pino({ name: 'prompt-version-compare-api' });

function computeTextDiff(text1: string, text2: string) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  
  const changes: Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber?: number;
  }> = [];
  
  const maxLines = Math.max(lines1.length, lines2.length);
  
  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i];
    const line2 = lines2[i];
    
    if (line1 === undefined) {
      changes.push({
        type: 'added',
        content: line2,
        lineNumber: i + 1
      });
    } else if (line2 === undefined) {
      changes.push({
        type: 'removed',
        content: line1,
        lineNumber: i + 1
      });
    } else if (line1 !== line2) {
      changes.push({
        type: 'removed',
        content: line1,
        lineNumber: i + 1
      });
      changes.push({
        type: 'added',
        content: line2,
        lineNumber: i + 1
      });
    } else {
      changes.push({
        type: 'unchanged',
        content: line1,
        lineNumber: i + 1
      });
    }
  }
  
  return changes;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; v1: string; v2: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const v1Validation = VersionSchema.safeParse(params.v1);
    const v2Validation = VersionSchema.safeParse(params.v2);
    
    if (!v1Validation.success || !v2Validation.success) {
      return createErrorResponse('Invalid version format', 'INVALID_VERSION', 400);
    }

    const prompt = await Prompt.findById(params.id)
      .select('name versions')
      .lean();
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }

    const version1 = prompt.versions.find(v => v.version === params.v1);
    const version2 = prompt.versions.find(v => v.version === params.v2);
    
    if (!version1) {
      return createNotFoundResponse(`Version ${params.v1}`);
    }
    
    if (!version2) {
      return createNotFoundResponse(`Version ${params.v2}`);
    }

    const templateDiff = computeTextDiff(version1.template, version2.template);
    const changelogDiff = computeTextDiff(version1.changelog || '', version2.changelog || '');
    
    const stats = {
      templateChanges: {
        added: templateDiff.filter(c => c.type === 'added').length,
        removed: templateDiff.filter(c => c.type === 'removed').length,
        unchanged: templateDiff.filter(c => c.type === 'unchanged').length
      },
      changelogChanges: {
        added: changelogDiff.filter(c => c.type === 'added').length,
        removed: changelogDiff.filter(c => c.type === 'removed').length,
        unchanged: changelogDiff.filter(c => c.type === 'unchanged').length
      },
      timeDifference: Math.abs(
        new Date(version2.createdAt).getTime() - new Date(version1.createdAt).getTime()
      ),
      sizeChange: {
        template: version2.template.length - version1.template.length,
        changelog: (version2.changelog?.length || 0) - (version1.changelog?.length || 0)
      }
    };

    logger.info({ 
      promptId: params.id,
      v1: params.v1,
      v2: params.v2,
      templateChanges: stats.templateChanges.added + stats.templateChanges.removed
    }, 'Compared prompt versions');
    
    return createSuccessResponse({
      promptId: params.id,
      promptName: prompt.name,
      comparison: {
        version1: {
          version: version1.version,
          createdAt: version1.createdAt,
          changelog: version1.changelog
        },
        version2: {
          version: version2.version,
          createdAt: version2.createdAt,
          changelog: version2.changelog
        },
        diff: {
          template: templateDiff,
          changelog: changelogDiff
        },
        stats
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}