import { NextRequest, NextResponse } from 'next/server';
import { requestRouter, RequestRouterParams } from '@/lib/ai-pipeline/RequestRouter';
import { DiagramIntent, DiagramType, AnalysisType } from '@/lib/ai-pipeline/schemas/MasterClassificationSchema';
import { contextManager } from '@/lib/ai-pipeline/contextManager';
import { responseFormatter, ResponseType } from '@/lib/ai-pipeline/responseFormatter';
import { z } from 'zod';
import { createEnhancedLogger } from '@/lib/utils/consola-logger';

// Use enhanced logger
const logger = createEnhancedLogger('pipeline');

// Schema for request validation
const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  currentScript: z.string().optional().default(''),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request
    const body = await req.json();
    const { messages, currentScript } = requestSchema.parse(body);

    // Get the latest user message
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return NextResponse.json(
        { 
          type: ResponseType.ERROR, 
          content: 'No user message found in the request' 
        },
        { status: 400 }
      );
    }

    // Extract previous conversation for context
    const conversation = messages.map(
      msg => `${msg.role}: ${msg.content}`
    );

    // Add the message to context
    await contextManager.addMessage('user', lastUserMessage.content);

    // Update the current diagram in context manager if provided
    if (currentScript && currentScript.trim() !== '') {
      contextManager.updateDiagram(currentScript);
    }

    // Log details for debugging
    logger.debug(`🔧 Processing with new pipeline architecture`);

    // Prepare request router parameters
    const routerParams: RequestRouterParams = {
      userInput: lastUserMessage.content,
      currentDiagram: currentScript && currentScript.trim() !== '' ? currentScript : undefined,
      conversation: conversation.slice(-5), // Use last 5 messages for context
      context: await contextManager.getCompleteContext()
    };

    // Process request using the new RequestRouter (single LLM call)
    const routerResponse = await requestRouter.processRequest(routerParams);

    // Handle router response
    if (!routerResponse.success) {
      // Log the error for debugging
      logger.error("Request router failed", {
        error: routerResponse.error,
        intent: routerResponse.intent,
        classification: routerResponse.classification
      });

      // Add error message to context
      await contextManager.addMessage(
        'assistant',
        routerResponse.error?.message || "I encountered an error processing your request. Please try again."
      ).catch(err => {
        logger.error("Failed to add assistant message to context:", err);
      });

      // Map router error types to appropriate HTTP status codes
      let statusCode = 500;
      switch (routerResponse.error?.type) {
        case 'validation':
          statusCode = 400;
          break;
        case 'classification':
        case 'routing':
        case 'agent':
          statusCode = 422; // Unprocessable Entity
          break;
        default:
          statusCode = 500;
      }

      return NextResponse.json(
        {
          type: ResponseType.ERROR,
          content: routerResponse.error?.message || "An error occurred while processing your request"
        },
        { status: statusCode }
      );
    }

    // Success case - we have a result from the appropriate agent
    const { intent, result, classification } = routerResponse;

    // Type assertion for better type safety
    const typedIntent = intent as DiagramIntent;

    const resultType = 'diagramType' in classification ? classification.diagramType as DiagramType : undefined;
    logger.requestComplete(Date.now() - Date.now(), typedIntent, resultType);

    // Update context manager with diagram if it was generated/modified
    if (result && 'diagram' in result && result.diagram) {
      contextManager.updateDiagram(result.diagram, typedIntent);
    }

    // Format the response using the existing response formatter
    const formattedResponse = responseFormatter.formatResponse(typedIntent, result);

    // Add the assistant response to context
    if (formattedResponse.type === ResponseType.SCRIPT) {
      await contextManager.addMessage(
        'assistant', 
        `${formattedResponse.explanation}\n\nI've updated the diagram.`
      );
    } else {
      await contextManager.addMessage('assistant', formattedResponse.content);
    }

    // Return the formatted response (maintains backward compatibility)
    return NextResponse.json(formattedResponse);

  } catch (error) {
    logger.error('Pipeline API error:', error);
    
    // Add error message to context
    await contextManager.addMessage(
      'assistant',
      "I encountered an unexpected error processing your request. Please try again."
    ).catch(err => {
      logger.error("Failed to add assistant message to context:", err);
    });
    
    // Return appropriate error response
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          type: ResponseType.ERROR,
          content: 'Invalid request format - please check your input parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        type: ResponseType.ERROR,
        content: 'An unexpected error occurred while processing your request',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}