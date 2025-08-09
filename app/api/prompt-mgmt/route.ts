import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { AgentType, DiagramType, PromptOperation } from '@/lib/database/types';
import { PromptFilters, PromptSortOptions, ApiResponse, PaginatedResponse, PromptMgmtPrompt } from '@/lib/prompt-mgmt/types';
import { filterPrompts, sortPrompts } from '@/lib/prompt-mgmt/utils';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('prompt-mgmt-api');

// GET /api/prompt-mgmt - List all prompts with filtering, sorting, and pagination
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Parse filters
    const filters: PromptFilters = {
      agentType: searchParams.get('agentType')?.split(',') as AgentType[],
      diagramType: searchParams.get('diagramType')?.split(',') as DiagramType[],
      operation: searchParams.get('operation')?.split(',') as PromptOperation[],
      isProduction: searchParams.get('isProduction') ? searchParams.get('isProduction') === 'true' : undefined,
      tags: searchParams.get('tags')?.split(','),
      search: searchParams.get('search') || undefined
    };
    
    // Parse sort options
    const sort: PromptSortOptions = {
      field: (searchParams.get('sortField') as PromptSortOptions['field']) || 'updatedAt',
      direction: (searchParams.get('sortDirection') as PromptSortOptions['direction']) || 'desc'
    };
    
    // Build aggregation pipeline for enhanced prompt data
    const aggregationPipeline = [
      // Add test statistics
      {
        $lookup: {
          from: 'testcases',
          localField: '_id',
          foreignField: 'promptId',
          as: 'testCases'
        }
      },
      {
        $lookup: {
          from: 'testresults',
          localField: '_id',
          foreignField: 'promptId',
          as: 'testResults'
        }
      },
      {
        $lookup: {
          from: 'promptmetrics',
          localField: '_id',
          foreignField: 'promptId',
          as: 'metrics'
        }
      },
      // Add computed fields
      {
        $addFields: {
          '_stats': {
            totalTests: { $size: '$testResults' },
            passRate: {
              $cond: {
                if: { $gt: [{ $size: '$testResults' }, 0] },
                then: {
                  $divide: [
                    { $size: { $filter: { input: '$testResults', cond: { $eq: ['$$this.success', true] } } } },
                    { $size: '$testResults' }
                  ]
                },
                else: 0
              }
            },
            avgExecutionTime: { $avg: '$testResults.latencyMs' },
            lastTestedAt: { $max: '$testResults.createdAt' },
            popularityScore: { $size: '$testResults' }
          },
          '_testSummary': {
            total: { $size: '$testResults' },
            passed: { $size: { $filter: { input: '$testResults', cond: { $eq: ['$$this.success', true] } } } },
            failed: { $size: { $filter: { input: '$testResults', cond: { $eq: ['$$this.success', false] } } } },
            running: 0, // This would be tracked in a separate running tests collection
            lastRun: { $max: '$testResults.createdAt' },
            avgScore: { $avg: '$testResults.score' }
          }
        }
      }
    ];
    
    // Execute aggregation
    const allPrompts = await Prompt.aggregate(aggregationPipeline);
    
    // Apply client-side filtering (for complex filters not easily done in MongoDB)
    let filteredPrompts = allPrompts;
    if (Object.keys(filters).some(key => filters[key as keyof PromptFilters] !== undefined)) {
      filteredPrompts = filterPrompts(allPrompts, filters);
    }
    
    // Apply sorting
    const sortedPrompts = sortPrompts(filteredPrompts, sort);
    
    // Apply pagination
    const total = sortedPrompts.length;
    const paginatedPrompts = sortedPrompts.slice(skip, skip + limit);
    
    const response: PaginatedResponse<PromptMgmtPrompt> = {
      success: true,
      data: paginatedPrompts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching prompts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// POST /api/prompt-mgmt - Create a new prompt
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const promptData = await request.json();
    
    // Validate required fields
    if (!promptData.name || !promptData.agentType || !promptData.operation) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, agentType, operation' },
        { status: 400 }
      );
    }
    
    // Check if prompt with same name already exists
    const existingPrompt = await Prompt.findOne({ name: promptData.name });
    if (existingPrompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt with this name already exists' },
        { status: 409 }
      );
    }
    
    // Create new prompt with initial version (automatically set as primary)
    const initialVersion = promptData.version || '1.0.0';
    const newPrompt = new Prompt({
      name: promptData.name,
      agentType: promptData.agentType,
      diagramType: promptData.diagramType || [],
      operation: promptData.operation,
      primaryVersion: initialVersion, // First version is automatically primary
      versions: [{
        version: initialVersion,
        template: promptData.template || '',
        changelog: promptData.changelog || 'Initial version',
        createdAt: new Date(),
        metadata: promptData.versionMetadata || {}
      }],
      isProduction: promptData.isProduction || false,
      tags: promptData.tags || [],
      metadata: promptData.metadata || {}
    });
    
    const savedPrompt = await newPrompt.save();
    
    const response: ApiResponse = {
      success: true,
      data: savedPrompt,
      message: 'Prompt created successfully'
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    logger.error('Error creating prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}