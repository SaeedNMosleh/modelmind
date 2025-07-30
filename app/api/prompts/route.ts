import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  // parsePaginationParams - unused
  createPaginationMeta,
  createValidationErrorResponse,
  zodErrorsToValidationDetails
} from '@/lib/api/responses';
import { CreatePromptSchema, PromptQuerySchema } from '@/lib/api/validation/prompts';
import pino from 'pino';

const logger = pino({ name: 'prompts-api' });

export async function GET(request: NextRequest) {
  try {
    await withTimeout(connectToDatabase());
    
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = PromptQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryValidation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(queryValidation.error.errors));
    }
    
    const {
      page,
      limit,
      sort,
      order,
      agentType,
      diagramType,
      operation,
      environment,
      isProduction,
      search,
      tags
    } = queryValidation.data;

    const filter: Record<string, unknown> = {};
    
    if (agentType) filter.agentType = agentType;
    if (diagramType) filter.diagramType = { $in: [diagramType] };
    if (operation) filter.operation = operation;
    if (environment) filter.environments = { $in: [environment] };
    if (typeof isProduction === 'boolean') filter.isProduction = isProduction;
    if (tags && tags.length > 0) filter.tags = { $in: tags };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    // Type for mongoose sort must be an object with keys as field names and values as 1 or -1
    // Using Record<string, -1 | 1> for mongoose sort compatibility
    const sortObj = { [sort]: sortOrder };

    const [prompts, total] = await Promise.all([
      Prompt.find(filter)
        .sort(sortObj as Record<string, -1 | 1>) // Cast to specific sort order type
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-versions.template')
        .lean(),
      Prompt.countDocuments(filter)
    ]);

    const meta = createPaginationMeta(total, page, limit);
    
    logger.info({ 
      filter, 
      total, 
      page, 
      limit 
    }, 'Retrieved prompts list');

    return createSuccessResponse(prompts, meta);
    
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await withTimeout(connectToDatabase());
    
    const body = await request.json();
    const validation = CreatePromptSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(zodErrorsToValidationDetails(validation.error.errors));
    }

    const { initialVersion, ...promptData } = validation.data;
    
    const existingPrompt = await Prompt.findOne({ 
      name: promptData.name,
      agentType: promptData.agentType 
    });
    
    if (existingPrompt) {
      return createErrorResponse(
        'A prompt with this name and agent type already exists',
        'PROMPT_EXISTS',
        409
      );
    }

    const prompt = new Prompt({
      ...promptData,
      currentVersion: initialVersion.version,
      versions: [{
        ...initialVersion,
        isActive: true,
        createdAt: new Date()
      }]
    });

    await prompt.save();
    
    logger.info({ 
      promptId: prompt._id, 
      name: prompt.name,
      version: initialVersion.version 
    }, 'Created new prompt');

    return createSuccessResponse(prompt, undefined);
    
  } catch (error) {
    return handleApiError(error);
  }
}