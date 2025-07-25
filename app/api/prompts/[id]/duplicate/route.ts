import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt, TestCase } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse
} from '@/lib/api/responses';
import { DuplicatePromptSchema, ObjectIdSchema } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'prompt-duplicate-api' });

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const idValidation = ObjectIdSchema.safeParse(params.id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const body = await request.json();
    const validation = DuplicatePromptSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(validation.error.errors);
    }

    const originalPrompt = await Prompt.findById(params.id).lean();
    
    if (!originalPrompt) {
      return createNotFoundResponse('Prompt');
    }

    const { name, copyVersions, includeTestCases, metadata } = validation.data;
    
    const existingPrompt = await Prompt.findOne({ 
      name,
      agentType: originalPrompt.agentType 
    });
    
    if (existingPrompt) {
      return createErrorResponse(
        'A prompt with this name and agent type already exists',
        'PROMPT_EXISTS',
        409
      );
    }

    let versionsToInclude = originalPrompt.versions;
    
    if (!copyVersions) {
      const activeVersion = originalPrompt.versions.find(v => v.isActive);
      if (activeVersion) {
        versionsToInclude = [activeVersion];
      }
    }

    const duplicatedPrompt = new Prompt({
      name,
      agentType: originalPrompt.agentType,
      diagramType: originalPrompt.diagramType,
      operation: originalPrompt.operation,
      isProduction: false,
      environments: originalPrompt.environments,
      tags: [...(originalPrompt.tags || []), 'duplicated'],
      currentVersion: originalPrompt.currentVersion,
      versions: versionsToInclude.map(version => ({
        version: version.version,
        template: version.template,
        changelog: version.changelog + '\n\n[DUPLICATED] Copied from original prompt.',
        isActive: version.isActive,
        createdAt: new Date(),
        metadata: version.metadata
      })),
      metadata: {
        ...originalPrompt.metadata,
        ...metadata,
        duplicatedFrom: originalPrompt._id,
        duplicatedAt: new Date()
      }
    });

    await duplicatedPrompt.save();

    let duplicatedTestCases = 0;
    
    if (includeTestCases) {
      const testCases = await TestCase.find({ 
        promptId: params.id,
        isActive: true 
      }).lean();
      
      if (testCases.length > 0) {
        const duplicatedTestCaseData = testCases.map(testCase => ({
          promptId: duplicatedPrompt._id,
          name: `[COPY] ${testCase.name}`,
          description: testCase.description + '\n\n[DUPLICATED] Copied from original prompt.',
          vars: testCase.vars,
          assert: testCase.assert,
          tags: [...(testCase.tags || []), 'duplicated'],
          isActive: true,
          metadata: {
            ...testCase.metadata,
            duplicatedFrom: testCase._id,
            duplicatedAt: new Date()
          }
        }));

        await TestCase.insertMany(duplicatedTestCaseData);
        duplicatedTestCases = duplicatedTestCaseData.length;
      }
    }
    
    logger.info({ 
      originalPromptId: params.id,
      duplicatedPromptId: duplicatedPrompt._id,
      newName: name,
      versionsIncluded: versionsToInclude.length,
      testCasesDuplicated: duplicatedTestCases
    }, 'Duplicated prompt successfully');

    return createSuccessResponse({
      originalPrompt: {
        id: originalPrompt._id,
        name: originalPrompt.name
      },
      duplicatedPrompt: {
        id: duplicatedPrompt._id,
        name: duplicatedPrompt.name,
        versionsIncluded: versionsToInclude.length,
        testCasesDuplicated: duplicatedTestCases
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}