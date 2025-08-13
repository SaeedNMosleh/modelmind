import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { VariablePreset } from '@/lib/database/models/VariablePreset';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const data = await request.json();
    
    // Validate required fields
    if (!data.variables) {
      return NextResponse.json(
        { error: 'Missing required field: variables' },
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

    // Update the preset
    const preset = await VariablePreset.findByIdAndUpdate(
      id,
      {
        variables: data.variables,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Preset updated successfully',
      preset: {
        id: preset._id.toString(),
        name: preset.name,
        description: preset.description,
        agentType: preset.agentType,
        operation: preset.operation,
        variables: preset.variables instanceof Map ? Object.fromEntries(preset.variables) : preset.variables,
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating preset:', error);
    return NextResponse.json(
      { error: 'Failed to update preset' },
      { status: 500 }
    );
  }
}