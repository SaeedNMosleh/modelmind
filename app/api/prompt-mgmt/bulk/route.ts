import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { TestCase } from '@/lib/database/models/testCase';
import { TestResult } from '@/lib/database/models/testResult';
import { BulkOperation, BulkOperationResult, ApiResponse } from '@/lib/prompt-mgmt/types';
import { exportPromptData } from '@/lib/prompt-mgmt/utils';
import pino from 'pino';

const logger = pino();

// POST /api/prompt-mgmt/bulk - Execute bulk operations
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const bulkOperation: BulkOperation = await request.json();
    
    if (!bulkOperation.promptIds || bulkOperation.promptIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No prompt IDs provided' },
        { status: 400 }
      );
    }
    
    const result: BulkOperationResult = {
      operationType: bulkOperation.type,
      totalRequested: bulkOperation.promptIds.length,
      successful: 0,
      failed: 0,
      results: []
    };
    
    // Execute bulk operation based on type
    switch (bulkOperation.type) {
      case 'activate':
        await executeBulkActivate(bulkOperation.promptIds, result, true);
        break;
        
      case 'deactivate':
        await executeBulkActivate(bulkOperation.promptIds, result, false);
        break;
        
      case 'delete':
        await executeBulkDelete(bulkOperation.promptIds, result);
        break;
        
      case 'duplicate':
        await executeBulkDuplicate(bulkOperation.promptIds, result, bulkOperation.options);
        break;
        
      case 'export':
        return await executeBulkExport(bulkOperation.promptIds, bulkOperation.options);
        
      case 'test':
        return await executeBulkTest(bulkOperation.promptIds, result, bulkOperation.options);
        
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported operation: ${bulkOperation.type}` },
          { status: 400 }
        );
    }
    
    const response: ApiResponse<BulkOperationResult> = {
      success: true,
      data: result,
      message: `Bulk ${bulkOperation.type} operation completed`
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error executing bulk operation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute bulk operation' },
      { status: 500 }
    );
  }
}

// Bulk activate/deactivate prompts
async function executeBulkActivate(
  promptIds: string[],
  result: BulkOperationResult,
  activate: boolean
) {
  for (const promptId of promptIds) {
    try {
      const prompt = await Prompt.findById(promptId);
      
      if (!prompt) {
        result.results.push({
          promptId,
          success: false,
          error: 'Prompt not found'
        });
        result.failed++;
        continue;
      }
      
      // Check if already in desired state
      if (prompt.isProduction === activate) {
        result.results.push({
          promptId,
          success: true
        });
        result.successful++;
        continue;
      }
      
      prompt.isProduction = activate;
      await prompt.save();
      
      result.results.push({
        promptId,
        success: true
      });
      result.successful++;
      
      logger.info(`Prompt ${prompt.name} ${activate ? 'activated' : 'deactivated'}`);
      
    } catch (error) {
      logger.error(`Error ${activate ? 'activating' : 'deactivating'} prompt ${promptId}:`, error);
      result.results.push({
        promptId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.failed++;
    }
  }
}

// Bulk delete prompts
async function executeBulkDelete(promptIds: string[], result: BulkOperationResult) {
  for (const promptId of promptIds) {
    try {
      const prompt = await Prompt.findById(promptId);
      
      if (!prompt) {
        result.results.push({
          promptId,
          success: false,
          error: 'Prompt not found'
        });
        result.failed++;
        continue;
      }
      
      // Check if prompt is in production
      if (prompt.isProduction) {
        result.results.push({
          promptId,
          success: false,
          error: 'Cannot delete production prompts. Deactivate first.'
        });
        result.failed++;
        continue;
      }
      
      // Delete related data
      await TestCase.deleteMany({ promptId });
      await TestResult.deleteMany({ promptId });
      
      // Delete the prompt
      await Prompt.findByIdAndDelete(promptId);
      
      result.results.push({
        promptId,
        success: true
      });
      result.successful++;
      
      logger.info(`Prompt ${prompt.name} deleted`);
      
    } catch (error) {
      logger.error(`Error deleting prompt ${promptId}:`, error);
      result.results.push({
        promptId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.failed++;
    }
  }
}

// Bulk duplicate prompts
async function executeBulkDuplicate(
  promptIds: string[],
  result: BulkOperationResult,
  options?: Record<string, any>
) {
  const nameSuffix = options?.nameSuffix || ' (Copy)';
  
  for (const promptId of promptIds) {
    try {
      const originalPrompt = await Prompt.findById(promptId);
      
      if (!originalPrompt) {
        result.results.push({
          promptId,
          success: false,
          error: 'Prompt not found'
        });
        result.failed++;
        continue;
      }
      
      // Create duplicate
      const duplicateData = originalPrompt.toObject();
      delete duplicateData._id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      
      duplicateData.name = `${originalPrompt.name}${nameSuffix}`;
      duplicateData.isProduction = false; // Duplicates should not be production by default
      duplicateData.versions = duplicateData.versions.map(v => ({
        ...v,
        createdAt: new Date(),
        isActive: v.isActive
      }));
      
      const duplicatePrompt = new Prompt(duplicateData);
      await duplicatePrompt.save();
      
      // Duplicate test cases if option is enabled
      if (options?.includeTestCases) {
        const testCases = await TestCase.find({ promptId });
        
        for (const testCase of testCases) {
          const duplicateTestCase = testCase.toObject();
          delete duplicateTestCase._id;
          delete duplicateTestCase.createdAt;
          delete duplicateTestCase.updatedAt;
          
          duplicateTestCase.promptId = duplicatePrompt._id;
          duplicateTestCase.name = `${testCase.name} (Copy)`;
          
          const newTestCase = new TestCase(duplicateTestCase);
          await newTestCase.save();
        }
      }
      
      result.results.push({
        promptId,
        success: true
      });
      result.successful++;
      
      logger.info(`Prompt ${originalPrompt.name} duplicated as ${duplicateData.name}`);
      
    } catch (error) {
      logger.error(`Error duplicating prompt ${promptId}:`, error);
      result.results.push({
        promptId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.failed++;
    }
  }
}

// Bulk export prompts
async function executeBulkExport(promptIds: string[], options?: Record<string, any>) {
  try {
    // Fetch prompts with related data if requested
    let aggregationPipeline: any[] = [
      { $match: { _id: { $in: promptIds.map(id => ({ $oid: id })) } } }
    ];
    
    if (options?.includeTestCases) {
      aggregationPipeline.push({
        $lookup: {
          from: 'testcases',
          localField: '_id',
          foreignField: 'promptId',
          as: 'testCases'
        }
      });
    }
    
    if (options?.includeMetrics) {
      aggregationPipeline.push({
        $lookup: {
          from: 'testresults',
          localField: '_id',
          foreignField: 'promptId',
          as: 'testResults'
        }
      });
    }
    
    const prompts = await Prompt.aggregate(aggregationPipeline);
    
    if (prompts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No prompts found for export' },
        { status: 404 }
      );
    }
    
    // Filter versions if requested
    if (!options?.includeVersions) {
      prompts.forEach(prompt => {
        prompt.versions = prompt.versions.filter((v: any) => v.isActive);
      });
    }
    
    const format = options?.format || 'json';
    const exportData = exportPromptData(prompts, format);
    
    // Set appropriate headers
    const headers = new Headers();
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'json':
        headers.set('Content-Type', 'application/json');
        headers.set('Content-Disposition', `attachment; filename="prompts-export-${timestamp}.json"`);
        break;
        
      case 'csv':
        headers.set('Content-Type', 'text/csv');
        headers.set('Content-Disposition', `attachment; filename="prompts-export-${timestamp}.csv"`);
        break;
        
      case 'yaml':
        headers.set('Content-Type', 'application/x-yaml');
        headers.set('Content-Disposition', `attachment; filename="prompts-export-${timestamp}.yaml"`);
        break;
    }
    
    return new NextResponse(exportData, { headers });
    
  } catch (error) {
    logger.error('Error exporting prompts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export prompts' },
      { status: 500 }
    );
  }
}

// Bulk test execution (simplified - returns execution IDs)
async function executeBulkTest(
  promptIds: string[],
  result: BulkOperationResult,
  options?: Record<string, any>
) {
  const executionIds: string[] = [];
  
  for (const promptId of promptIds) {
    try {
      const prompt = await Prompt.findById(promptId);
      
      if (!prompt) {
        result.results.push({
          promptId,
          success: false,
          error: 'Prompt not found'
        });
        result.failed++;
        continue;
      }
      
      // For bulk testing, we would typically queue the tests
      // For now, we'll just return success with a mock execution ID
      const executionId = `bulk_test_${promptId}_${Date.now()}`;
      executionIds.push(executionId);
      
      result.results.push({
        promptId,
        success: true
      });
      result.successful++;
      
      logger.info(`Bulk test queued for prompt ${prompt.name}: ${executionId}`);
      
    } catch (error) {
      logger.error(`Error queuing test for prompt ${promptId}:`, error);
      result.results.push({
        promptId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.failed++;
    }
  }
  
  // Return execution IDs for tracking
  return NextResponse.json({
    success: true,
    data: {
      ...result,
      executionIds
    },
    message: 'Bulk test execution queued'
  });
}