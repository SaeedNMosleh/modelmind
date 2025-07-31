import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { TestResult } from '@/lib/database/models/testResult';
import { ApiResponse, VersionComparison } from '@/lib/prompt-mgmt/types';
import { generateDiff, validateSemanticVersion } from '@/lib/prompt-mgmt/utils';
import pino from 'pino';

const logger = pino();

// GET /api/prompt-mgmt/[id]/versions - Get all versions of a prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const compare = searchParams.get('compare'); // Format: "v1.0.0,v1.1.0"
    
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // If comparison requested
    if (compare) {
      const [oldVersion, newVersion] = compare.split(',');
      
      const oldVer = prompt.versions.find(v => v.version === oldVersion);
      const newVer = prompt.versions.find(v => v.version === newVersion);
      
      if (!oldVer || !newVer) {
        return NextResponse.json(
          { success: false, error: 'One or both versions not found' },
          { status: 404 }
        );
      }
      
      // Generate diff
      const diff = generateDiff(oldVer.template, newVer.template);
      
      // Get metrics for comparison
      const oldMetrics = await getVersionMetrics(promptId, oldVersion);
      const newMetrics = await getVersionMetrics(promptId, newVersion);
      
      const comparison: VersionComparison = {
        oldVersion: {
          ...oldVer.toObject(),
          _stats: oldMetrics
        },
        newVersion: {
          ...newVer.toObject(),
          _stats: newMetrics
        },
        diff,
        metrics: {
          performanceDelta: newMetrics.avgLatency - oldMetrics.avgLatency,
          accuracyDelta: newMetrics.successRate - oldMetrics.successRate,
          testResultComparison: {
            oldPassRate: oldMetrics.successRate,
            newPassRate: newMetrics.successRate,
            improvement: newMetrics.successRate - oldMetrics.successRate
          }
        }
      };
      
      const response: ApiResponse<VersionComparison> = {
        success: true,
        data: comparison
      };
      
      return NextResponse.json(response);
    }
    
    // Return all versions with stats
    const versionsWithStats = await Promise.all(
      prompt.versions.map(async (version) => {
        const stats = await getVersionMetrics(promptId, version.version);
        return {
          ...version.toObject(),
          _stats: stats
        };
      })
    );
    
    const response: ApiResponse = {
      success: true,
      data: versionsWithStats
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching prompt versions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompt versions' },
      { status: 500 }
    );
  }
}

// POST /api/prompt-mgmt/[id]/versions - Create a new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    const versionData = await request.json();
    
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Validate version number
    const versionError = validateSemanticVersion(versionData.version);
    if (versionError) {
      return NextResponse.json(
        { success: false, error: versionError },
        { status: 400 }
      );
    }
    
    // Check if version already exists
    const existingVersion = prompt.versions.find(v => v.version === versionData.version);
    if (existingVersion) {
      return NextResponse.json(
        { success: false, error: 'Version already exists' },
        { status: 409 }
      );
    }
    
    // Deactivate current version if this is to be the active one
    if (versionData.isActive) {
      prompt.versions.forEach(v => v.isActive = false);
      prompt.currentVersion = versionData.version;
    }
    
    // Add new version
    prompt.versions.push({
      version: versionData.version,
      template: versionData.template,
      changelog: versionData.changelog || 'New version',
      createdAt: new Date(),
      isActive: versionData.isActive || false,
      metadata: versionData.metadata || {}
    });
    
    const updatedPrompt = await prompt.save();
    
    const response: ApiResponse = {
      success: true,
      data: updatedPrompt,
      message: 'Version created successfully'
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    logger.error('Error creating prompt version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    );
  }
}

// PUT /api/prompt-mgmt/[id]/versions - Activate a version or rollback
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    const { action, version } = await request.json();
    
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    const targetVersion = prompt.versions.find(v => v.version === version);
    if (!targetVersion) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }
    
    if (action === 'activate' || action === 'rollback') {
      // Deactivate all versions
      prompt.versions.forEach(v => v.isActive = false);
      
      // Activate target version
      targetVersion.isActive = true;
      prompt.currentVersion = version;
      
      // Add rollback changelog entry if this is a rollback
      if (action === 'rollback') {
        targetVersion.changelog += `\n\nRolled back on ${new Date().toISOString()}`;
      }
      
      const updatedPrompt = await prompt.save();
      
      const response: ApiResponse = {
        success: true,
        data: updatedPrompt,
        message: `Version ${version} ${action === 'rollback' ? 'rolled back to' : 'activated'} successfully`
      };
      
      return NextResponse.json(response);
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "activate" or "rollback"' },
      { status: 400 }
    );
    
  } catch (error) {
    logger.error('Error updating prompt version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update version' },
      { status: 500 }
    );
  }
}

// Helper function to get version metrics
async function getVersionMetrics(promptId: string, version: string) {
  const testResults = await TestResult.find({
    promptId,
    promptVersion: version
  });
  
  if (testResults.length === 0) {
    return {
      testCount: 0,
      successRate: 0,
      avgLatency: 0,
      usageCount: 0
    };
  }
  
  const successCount = testResults.filter(r => r.success).length;
  const avgLatency = testResults.reduce((sum, r) => sum + r.latencyMs, 0) / testResults.length;
  
  return {
    testCount: testResults.length,
    successRate: successCount / testResults.length,
    avgLatency,
    usageCount: testResults.length
  };
}