import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { TestCase } from '@/lib/database/models/testCase';
import { TestResult } from '@/lib/database/models/testResult';
import { ApiResponse } from '@/lib/prompt-mgmt/types';
import { validateSemanticVersion } from '@/lib/prompt-mgmt/utils';
import pino from 'pino';

const logger = pino();

// GET /api/prompt-mgmt/[id] - Get a specific prompt with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const promptId = params.id;
    
    // Aggregate prompt with related data
    const promptData = await Prompt.aggregate([
      { $match: { _id: { $oid: promptId } } },
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
            running: 0,
            lastRun: { $max: '$testResults.createdAt' },
            avgScore: { $avg: '$testResults.score' }
          }
        }
      }
    ]);
    
    if (!promptData || promptData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    const response: ApiResponse = {
      success: true,
      data: promptData[0]
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

// PUT /api/prompt-mgmt/[id] - Update a prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const promptId = params.id;
    const updateData = await request.json();
    
    const existingPrompt = await Prompt.findById(promptId);
    if (!existingPrompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Handle template updates - create new version if template changed
    if (updateData.template && updateData.template !== existingPrompt.versions.find(v => v.isActive)?.template) {
      const newVersion = updateData.version || incrementVersion(existingPrompt.currentVersion);
      
      // Validate version
      const versionError = validateSemanticVersion(newVersion);
      if (versionError) {
        return NextResponse.json(
          { success: false, error: versionError },
          { status: 400 }
        );
      }
      
      // Deactivate current version
      existingPrompt.versions.forEach(v => v.isActive = false);
      
      // Add new version
      existingPrompt.versions.push({
        version: newVersion,
        template: updateData.template,
        changelog: updateData.changelog || 'Updated template',
        createdAt: new Date(),
        isActive: true,
        metadata: updateData.versionMetadata || {}
      });
      
      existingPrompt.currentVersion = newVersion;
    }
    
    // Update other fields
    const updatableFields = [
      'name', 'agentType', 'diagramType', 'operation', 
      'environments', 'tags', 'metadata', 'isProduction'
    ];
    
    updatableFields.forEach(field => {
      if (updateData[field] !== undefined) {
        (existingPrompt as Record<string, unknown>)[field] = updateData[field];
      }
    });
    
    const updatedPrompt = await existingPrompt.save();
    
    const response: ApiResponse = {
      success: true,
      data: updatedPrompt,
      message: 'Prompt updated successfully'
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error updating prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

// DELETE /api/prompt-mgmt/[id] - Delete a prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const promptId = params.id;
    
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Check if prompt is in production
    if (prompt.isProduction) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete production prompts. Deactivate first.' },
        { status: 403 }
      );
    }
    
    // Delete related data
    await TestCase.deleteMany({ promptId });
    await TestResult.deleteMany({ promptId });
    
    // Delete the prompt
    await Prompt.findByIdAndDelete(promptId);
    
    const response: ApiResponse = {
      success: true,
      message: 'Prompt deleted successfully'
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error deleting prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}

// Helper function to increment semantic version
function incrementVersion(currentVersion: string): string {
  const parts = currentVersion.split('.');
  const patch = parseInt(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}