import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { TestCase } from '@/lib/database/models/testCase';
import { TestResult } from '@/lib/database/models/testResult';
import { ApiResponse } from '@/lib/prompt-mgmt/types';
import { validateSemanticVersion } from '@/lib/prompt-mgmt/utils';
import mongoose from 'mongoose';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('prompt-mgmt-detail-api');

// GET /api/prompt-mgmt/[id] - Get a specific prompt with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    
    // Aggregate prompt with related data
    const promptData = await Prompt.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(promptId) } },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    const updateData = await request.json();
    
    const existingPrompt = await Prompt.findById(promptId);
    if (!existingPrompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Handle template updates based on save mode
    const baseVersion = updateData.baseVersion || existingPrompt.primaryVersion;
    const saveMode = updateData.saveMode || 'new'; // 'new', 'overwrite', or 'draft'
    
    if (updateData.template !== undefined) {
      let newVersion: string;
      
      if (updateData.version === 'auto') {
        newVersion = incrementVersion(baseVersion);
      } else {
        newVersion = updateData.version || incrementVersion(baseVersion);
      }
      
      logger.info('Version info:', {
        existingPrimaryVersion: existingPrompt.primaryVersion,
        baseVersion: baseVersion,
        updateDataVersion: updateData.version,
        newVersion: newVersion,
        saveMode: saveMode
      });
      
      // For draft versions, skip semantic validation
      if (!newVersion.endsWith('-draft')) {
        const versionError = validateSemanticVersion(newVersion);
        if (versionError) {
          logger.error('Version validation failed:', {
            newVersion,
            error: versionError
          });
          return NextResponse.json(
            { success: false, error: versionError },
            { status: 400 }
          );
        }
      }
      
      // Handle different save modes
      const existingVersionIndex = existingPrompt.versions.findIndex(v => v.version === newVersion);
      
      if (saveMode === 'overwrite' || (saveMode === 'draft' && existingVersionIndex >= 0)) {
        // Update existing version
        if (existingVersionIndex >= 0) {
          existingPrompt.versions[existingVersionIndex] = {
            ...existingPrompt.versions[existingVersionIndex],
            version: newVersion, // Ensure version field is always present
            template: updateData.template,
            changelog: updateData.changelog || 'Updated template',
            metadata: updateData.versionMetadata || {}
          };
        } else {
          // Version doesn't exist, create new
          existingPrompt.versions.push({
            version: newVersion,
            template: updateData.template,
            changelog: updateData.changelog || 'Updated template',
            createdAt: new Date(),
            metadata: updateData.versionMetadata || {}
          });
        }
      } else if (saveMode === 'new') {
        // Check if version already exists for new versions
        if (existingVersionIndex >= 0) {
          return NextResponse.json(
            { success: false, error: `Version ${newVersion} already exists` },
            { status: 400 }
          );
        }
        
        // Create new version
        existingPrompt.versions.push({
          version: newVersion,
          template: updateData.template,
          changelog: updateData.changelog || `New version ${newVersion}`,
          createdAt: new Date(),
          metadata: updateData.versionMetadata || {}
        });
        
        // Set as new primary version if it's not a draft
        if (!newVersion.endsWith('-draft')) {
          existingPrompt.primaryVersion = newVersion;
        }
      } else { // saveMode === 'draft'
        // Create or update draft
        if (existingVersionIndex >= 0) {
          // Update existing draft
          existingPrompt.versions[existingVersionIndex] = {
            ...existingPrompt.versions[existingVersionIndex],
            version: newVersion, // Ensure version field is always present
            template: updateData.template,
            changelog: updateData.changelog || 'Draft save',
            metadata: updateData.versionMetadata || {}
          };
        } else {
          // Create new draft
          existingPrompt.versions.push({
            version: newVersion,
            template: updateData.template,
            changelog: updateData.changelog || 'Draft save',
            createdAt: new Date(),
            metadata: updateData.versionMetadata || {}
          });
        }
      }
    }
    
    // Update other fields
    const updatableFields = [
      'name', 'agentType', 'diagramType', 'operation', 
      'tags', 'metadata', 'isProduction'
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    
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
  if (!currentVersion) {
    return '1.0.1'; // Default if no current version
  }
  
  const parts = currentVersion.split('.');
  if (parts.length !== 3) {
    return '1.0.1'; // Default if invalid format
  }
  
  const patch = parseInt(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}