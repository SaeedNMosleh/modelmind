import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { AgentType, PromptOperation } from '@/lib/database/types';
import { extractTemplateVariables } from '@/lib/prompt-mgmt/utils';
import { TemplateVariable } from '@/lib/prompt-mgmt/types';

export interface PromptVersion {
  version: string;
  createdAt: Date;
  changelog: string;
  isPrimary: boolean;
  template: string;
  variables: TemplateVariable[];
}

export interface ActivePromptForGenerator {
  id: string;
  name: string;
  agentType: string;
  operation: string;
  displayName: string;
  versions: PromptVersion[];
  primaryVersion: string;
  primaryTemplate: string;
  primaryVariables: TemplateVariable[];
}

export async function GET() {
  try {
    await connectToDatabase();

    const prompts = await Prompt.find({ 
      isProduction: true 
    })
    .select('_id name agentType operation primaryVersion versions')
    .lean();

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({
        prompts: [],
        message: 'No activated prompts found'
      });
    }

    const formattedPrompts: ActivePromptForGenerator[] = prompts.map(prompt => {
      const versions: PromptVersion[] = prompt.versions.map(version => {
        const template = version.template || '';
        const variables = extractTemplateVariables(template);
        
        return {
          version: version.version,
          createdAt: version.createdAt,
          changelog: version.changelog,
          isPrimary: version.version === prompt.primaryVersion,
          template,
          variables
        };
      });

      // Sort versions: primary first, then by semantic version descending
      versions.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        
        // Simple semantic version comparison (assumes format x.y.z)
        const aVersionParts = a.version.split('.').map(n => parseInt(n));
        const bVersionParts = b.version.split('.').map(n => parseInt(n));
        
        for (let i = 0; i < Math.max(aVersionParts.length, bVersionParts.length); i++) {
          const aPart = aVersionParts[i] || 0;
          const bPart = bVersionParts[i] || 0;
          if (aPart !== bPart) return bPart - aPart; // Descending order
        }
        return 0;
      });

      // Get primary version data
      const primaryVersionData = versions.find(v => v.isPrimary) || versions[0];

      return {
        id: (prompt._id as string).toString(),
        name: prompt.name,
        agentType: prompt.agentType,
        operation: prompt.operation,
        displayName: `${prompt.agentType.charAt(0).toUpperCase() + prompt.agentType.slice(1)} - ${prompt.operation.charAt(0).toUpperCase() + prompt.operation.slice(1)}`,
        versions,
        primaryVersion: prompt.primaryVersion,
        primaryTemplate: primaryVersionData?.template || '',
        primaryVariables: primaryVersionData?.variables || []
      };
    });

    // Sort prompts by agentType then operation for consistent display
    formattedPrompts.sort((a, b) => {
      if (a.agentType !== b.agentType) {
        return a.agentType.localeCompare(b.agentType);
      }
      return a.operation.localeCompare(b.operation);
    });

    // Health validation: Check for missing critical agent+operation combinations
    // Note: BASE+BASE_SYSTEM is optional - not critical for AI pipeline operation
    const criticalCombinations = [
      { agentType: AgentType.GENERATOR, operation: PromptOperation.GENERATION },
      { agentType: AgentType.MODIFIER, operation: PromptOperation.MODIFICATION },
      { agentType: AgentType.ANALYZER, operation: PromptOperation.ANALYSIS }
    ];

    const missingCombinations = criticalCombinations.filter(combo => 
      !formattedPrompts.some(prompt => 
        prompt.agentType === combo.agentType && prompt.operation === combo.operation
      )
    );

    const healthWarnings = missingCombinations.map(combo => 
      `Missing activated prompt for ${combo.agentType}+${combo.operation} - AI pipeline may fail`
    );

    return NextResponse.json({
      prompts: formattedPrompts,
      count: formattedPrompts.length,
      health: {
        status: missingCombinations.length === 0 ? 'healthy' : 'warning',
        warnings: healthWarnings,
        missingCombinations
      }
    });

  } catch (error) {
    console.error('Error fetching prompts for test case generator:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}