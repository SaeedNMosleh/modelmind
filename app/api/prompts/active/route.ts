import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt, PromptEnvironment, AgentType, DiagramType } from '@/lib/database';
import { createSuccessResponse, createErrorResponse, handleApiError, withTimeout } from '@/lib/api/responses';
import { zodErrorsToValidationDetails } from '@/lib/api/validation/prompts';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'active-prompts-api' });

const ActivePromptsQuerySchema = z.object({
  environment: z.nativeEnum(PromptEnvironment).default(PromptEnvironment.PRODUCTION),
  agentType: z.nativeEnum(AgentType).optional(),
  diagramType: z.nativeEnum(DiagramType).optional(),
  includeTemplate: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  format: z.enum(['standard', 'promptfoo']).default('standard')
});

export async function GET(request: NextRequest) {
  try {
    await withTimeout(connectToDatabase());
    
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = ActivePromptsQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryValidation.success) {
      return createErrorResponse(
        'Invalid query parameters',
        'VALIDATION_ERROR',
        400,
        zodErrorsToValidationDetails(queryValidation.error.errors)
      );
    }
    
    const { environment, agentType, diagramType, includeTemplate, format } = queryValidation.data;

    const filter: Record<string, unknown> = {
      environments: { $in: [environment] }
    };
    
    if (environment === PromptEnvironment.PRODUCTION) {
      filter.isProduction = true;
    }
    
    if (agentType) filter.agentType = agentType;
    if (diagramType) filter.diagramType = { $in: [diagramType] };

    const selectFields = includeTemplate 
      ? 'name agentType diagramType operation primaryVersion versions environments isProduction tags metadata'
      : 'name agentType diagramType operation primaryVersion versions.version versions.createdAt versions.changelog environments isProduction tags metadata';

    const prompts = await Prompt.find(filter)
      .select(selectFields)
      .lean();

    const activePrompts = prompts.map(prompt => {
      const primaryVersion = prompt.versions.find(v => v.version === prompt.primaryVersion);
      
      if (!primaryVersion) {
        logger.warn({ promptId: prompt._id }, 'Prompt has no primary version');
        return null;
      }

      const basePrompt = {
        id: prompt._id,
        name: prompt.name,
        agentType: prompt.agentType,
        diagramType: prompt.diagramType,
        operation: prompt.operation,
        primaryVersion: prompt.primaryVersion,
        activeVersion: {
          version: primaryVersion.version,
          createdAt: primaryVersion.createdAt,
          changelog: primaryVersion.changelog,
          ...(includeTemplate && { template: primaryVersion.template })
        },
        environments: prompt.environments,
        isProduction: prompt.isProduction,
        tags: prompt.tags,
        metadata: prompt.metadata
      };

      if (format === 'promptfoo') {
        return {
          id: `${prompt.name}-${primaryVersion.version}`,
          template: primaryVersion.template,
          metadata: {
            name: prompt.name,
            agentType: prompt.agentType,
            diagramType: prompt.diagramType,
            operation: prompt.operation,
            version: primaryVersion.version,
            environment,
            isProduction: prompt.isProduction
          }
        };
      }

      return basePrompt;
    }).filter(Boolean);
    
    logger.info({ 
      environment,
      agentType,
      diagramType,
      count: activePrompts.length,
      format
    }, 'Retrieved active prompts');

    const response: {
      environment: PromptEnvironment;
      count: number;
      prompts: unknown[];
      promptfooConfig?: unknown;
    } = {
      environment,
      count: activePrompts.length,
      prompts: activePrompts
    };

    if (format === 'promptfoo') {
      response.promptfooConfig = {
        prompts: activePrompts,
        providers: [{
          id: 'openai',
          config: {
            apiKey: '${OPENAI_API_KEY}',
            model: 'gpt-4',
            temperature: 0.7
          }
        }],
        defaultTest: {
          vars: {},
          assert: []
        }
      };
    }

    return createSuccessResponse(response);
    
  } catch (error) {
    return handleApiError(error);
  }
}