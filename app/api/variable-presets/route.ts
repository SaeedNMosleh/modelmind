import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { VariablePreset, IVariablePreset } from '@/lib/database/models/VariablePreset';
import { AgentType, PromptOperation } from '@/lib/database/types';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get('agentType') as AgentType | null;
    const operation = searchParams.get('operation') as PromptOperation | null;
    const includeGlobal = searchParams.get('includeGlobal') !== 'false';

    const presets: IVariablePreset[] = [];

    // Get specific presets for agent/operation
    if (agentType || operation) {
      const specificPresets = await VariablePreset.findActiveByAgentOperation(
        agentType || undefined, 
        operation || undefined
      );
      presets.push(...specificPresets);
    }

    // Get global presets (not tied to specific agent/operation)
    if (includeGlobal) {
      const globalPresets = await VariablePreset.findGlobalPresets();
      presets.push(...globalPresets);
    }

    // Remove duplicates based on ID
    const uniquePresets = presets.filter((preset, index, self) => 
      index === self.findIndex(p => p._id.toString() === preset._id.toString())
    );

    // Sort by relevance: specific matches first, then global, then by creation date
    uniquePresets.sort((a, b) => {
      // Specific matches (both agentType and operation match)
      const aSpecific = a.agentType === agentType && a.operation === operation ? 2 : 0;
      const bSpecific = b.agentType === agentType && b.operation === operation ? 2 : 0;
      
      // Partial matches (either agentType or operation match)
      const aPartial = (!aSpecific && (a.agentType === agentType || a.operation === operation)) ? 1 : 0;
      const bPartial = (!bSpecific && (b.agentType === agentType || b.operation === operation)) ? 1 : 0;
      
      const aScore = aSpecific + aPartial;
      const bScore = bSpecific + bPartial;
      
      if (aScore !== bScore) return bScore - aScore;
      
      // Sort by creation date if scores are equal
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      presets: uniquePresets.map(preset => ({
        id: preset._id.toString(),
        name: preset.name,
        description: preset.description,
        agentType: preset.agentType,
        operation: preset.operation,
        variables: preset.variables instanceof Map ? Object.fromEntries(preset.variables) : preset.variables,
        createdAt: preset.createdAt
      })),
      count: uniquePresets.length
    });

  } catch (error) {
    console.error('Error fetching variable presets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variable presets' },
      { status: 500 }
    );
  }
}

// Admin-only endpoint for creating presets
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.description || !data.variables) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, variables' },
        { status: 400 }
      );
    }

    // Validate variables object
    if (typeof data.variables !== 'object' || Array.isArray(data.variables)) {
      return NextResponse.json(
        { error: 'Variables must be a valid object' },
        { status: 400 }
      );
    }

    // Check for existing preset with same name
    const existingPreset = await VariablePreset.findOne({ name: data.name });
    if (existingPreset) {
      return NextResponse.json(
        { error: 'A preset with this name already exists' },
        { status: 409 }
      );
    }

    const preset = await VariablePreset.createPreset({
      name: data.name.trim(),
      description: data.description.trim(),
      agentType: data.agentType,
      operation: data.operation,
      variables: data.variables,
      createdBy: 'admin' // TODO: Get from auth context
    });

    return NextResponse.json({
      message: 'Variable preset created successfully',
      preset: {
        id: preset._id.toString(),
        name: preset.name,
        description: preset.description,
        agentType: preset.agentType,
        operation: preset.operation,
        variables: preset.variables instanceof Map ? Object.fromEntries(preset.variables) : preset.variables,
        createdAt: preset.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating variable preset:', error);
    return NextResponse.json(
      { error: 'Failed to create variable preset' },
      { status: 500 }
    );
  }
}