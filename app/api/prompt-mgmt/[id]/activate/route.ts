import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { ApiResponse } from '@/lib/prompt-mgmt/types';
import mongoose from 'mongoose';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('prompt-activation-api');

/**
 * POST /api/prompt-mgmt/[id]/activate - Atomically activate a prompt
 * This will deactivate any other prompts for the same agent-operation combination
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(promptId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid prompt ID' },
        { status: 400 }
      );
    }
    
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Check if prompt is already active
    if (prompt.isProduction) {
      return NextResponse.json(
        { success: false, error: 'Prompt is already active' },
        { status: 400 }
      );
    }
    
    // Check if this would leave any operation without an active prompt
    const allPromptsForOperation = await Prompt.find({
      agentType: prompt.agentType,
      operation: prompt.operation
    });
    
    const otherActivePrompts = allPromptsForOperation.filter(
      p => p._id.toString() !== promptId && p.isProduction
    );
    
    // Perform atomic activation
    try {
      await (prompt as typeof prompt & { activateAtomically(): Promise<void> }).activateAtomically();
      
      logger.info({
        promptId,
        promptName: prompt.name,
        agentType: prompt.agentType,
        operation: prompt.operation,
        deactivatedPrompts: otherActivePrompts.length,
        primaryVersion: prompt.primaryVersion
      }, 'Prompt activated atomically');
      
      // Fetch updated prompt data
      const updatedPrompt = await Prompt.findById(promptId);
      
      const response: ApiResponse = {
        success: true,
        data: {
          prompt: updatedPrompt,
          deactivatedPrompts: otherActivePrompts.map(p => ({
            id: p._id,
            name: p.name
          })),
          activatedAt: new Date(),
          primaryVersion: updatedPrompt?.primaryVersion
        },
        message: `Prompt "${prompt.name}" activated successfully`
      };
      
      return NextResponse.json(response);
      
    } catch (activationError) {
      logger.error('Atomic activation failed:', activationError);
      return NextResponse.json(
        { 
          success: false, 
          error: activationError instanceof Error 
            ? activationError.message 
            : 'Failed to activate prompt atomically'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    logger.error('Error in prompt activation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}