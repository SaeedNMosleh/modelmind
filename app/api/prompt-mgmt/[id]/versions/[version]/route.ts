
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { ApiResponse } from '@/lib/prompt-mgmt/types';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";
import { IPromptVersion } from '@/lib/database/types';

const logger = createEnhancedLogger('prompt-version-api');

// DELETE /api/prompt-mgmt/[id]/versions/[version] - Delete a specific version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId, version } = await params;
    
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Check if version exists
    const versionIndex = prompt.versions.findIndex(v => v.version === version);
    if (versionIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }
    
    // Prevent deletion if it's the only version
    if (prompt.versions.length <= 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the only version. At least one version must remain.' },
        { status: 400 }
      );
    }
    
    const wasPrimary = prompt.primaryVersion === version;
    
    // Remove the version
    prompt.versions.splice(versionIndex, 1);
    
    // If the deleted version was primary, set a new primary version
    if (wasPrimary) {
      // Find the next best version to be primary
      const nextPrimary = findNextPrimaryVersion(prompt.versions);
      if (nextPrimary) {
        prompt.primaryVersion = nextPrimary;
        logger.info('Primary version reassigned:', {
          promptId,
          deletedVersion: version,
          newPrimaryVersion: nextPrimary
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'No suitable version found to be primary' },
          { status: 500 }
        );
      }
    }
    
    const updatedPrompt = await prompt.save();
    
    const response: ApiResponse = {
      success: true,
      data: updatedPrompt,
      message: `Version ${version} deleted successfully${wasPrimary ? ` and primary version changed to ${updatedPrompt.primaryVersion}` : ''}`
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error deleting version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}

// Helper function to find the next primary version
function findNextPrimaryVersion(versions: IPromptVersion[]): string | null {
  // Filter out draft versions for primary consideration
  const nonDraftVersions = versions.filter(v => !v.version.endsWith('-draft'));
  
  if (nonDraftVersions.length === 0) {
    // If only drafts remain, use the latest draft
    const latestDraft = versions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return latestDraft?.version || null;
  }
  
  // Find the highest semantic version
  const sortedVersions = nonDraftVersions.sort((a, b) => {
    const aParts = a.version.split('.').map(Number);
    const bParts = b.version.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart !== bPart) return bPart - aPart; // Descending order (highest first)
    }
    
    return 0;
  });
  
  return sortedVersions[0]?.version || null;
}