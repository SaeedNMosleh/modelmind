import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent, DiagramIntent } from '@/lib/ai-pipeline/inputProcessor';
import { contextManager } from '@/lib/ai-pipeline/contextManager';
import { diagramGenerator } from '@/lib/ai-pipeline/agents/generator';
import { diagramModifier } from '@/lib/ai-pipeline/agents/modifier';
import { diagramAnalyzer } from '@/lib/ai-pipeline/agents/analyzer';
import { responseFormatter, ResponseType } from '@/lib/ai-pipeline/responseFormatter';
import { z } from 'zod';
import pino from 'pino';

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

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
    logger.info("Processing request", {
      messageLength: lastUserMessage.content.length,
      conversationLength: conversation.length,
      hasDiagram: !!currentScript && currentScript.trim() !== ''
    });

    try {
      // Classify the user intent
      const intentClassification = await classifyIntent({
        userInput: lastUserMessage.content,
        currentDiagram: contextManager.getCurrentDiagram(),
        conversation: conversation.slice(-5) // Use last 5 messages for context
      });

      // Update the context with the detected intent
      contextManager.setLastIntent(intentClassification.intent);

      // Get relevant context for the agent
      const contextData = await contextManager.getCompleteContext();

      // Process the request based on intent
      let result;
      switch (intentClassification.intent) {
        case DiagramIntent.GENERATE:
          logger.info("Generating diagram", { userInput: lastUserMessage.content });
          result = await diagramGenerator.generate({
            userInput: lastUserMessage.content,
            context: contextData
          });
          
          // Update the context with the new diagram
          if (result.diagram) {
            contextManager.updateDiagram(result.diagram, DiagramIntent.GENERATE);
          }
          break;

        case DiagramIntent.MODIFY:
          logger.info("Modifying diagram", { userInput: lastUserMessage.content });
          result = await diagramModifier.modify({
            userInput: lastUserMessage.content,
            currentDiagram: contextManager.getCurrentDiagram(),
            context: contextData
          });
          
          // Update the context with the modified diagram
          if (result.diagram) {
            contextManager.updateDiagram(result.diagram, DiagramIntent.MODIFY);
          }
          break;

        case DiagramIntent.ANALYZE:
          logger.info("Analyzing diagram", { userInput: lastUserMessage.content });
          result = await diagramAnalyzer.analyze({
            userInput: lastUserMessage.content,
            diagram: contextManager.getCurrentDiagram(),
            context: contextData
          });
          break;        default:
          // Handle unknown intent with a fallback response
          logger.warn("Unknown intent detected", { intent: intentClassification.intent });
          result = { 
            overview: "I'm not sure what you'd like me to do with the diagram. Could you please clarify if you want me to create a new diagram, modify the existing one, or analyze it?",
            qualityAssessment: {
              strengths: [],
              weaknesses: []
            },
            suggestedImprovements: []
          };
          break;
      }

      // Format the response
      const formattedResponse = responseFormatter.formatResponse(
        intentClassification.intent,
        result
      );

      // Add the assistant response to context
      if (formattedResponse.type === ResponseType.SCRIPT) {
        await contextManager.addMessage(
          'assistant', 
          `${formattedResponse.explanation}\n\nI've updated the diagram.`
        );
      } else {
        await contextManager.addMessage('assistant', formattedResponse.content);
      }

      // Return the formatted response
      return NextResponse.json(formattedResponse);    } catch (processingError) {
      logger.error("Error processing user request:", processingError);
      
      // Add error message to context
      await contextManager.addMessage(
        'assistant',
        "I encountered an error processing your request. Please try again."
      ).catch(err => {
        logger.error("Failed to add assistant message to context:", err);
      });
      
      // Return error response
      return NextResponse.json({
        type: ResponseType.ERROR,
        content: "I encountered an error processing your request. Please try again with more specific instructions."
      });
    }
  } catch (error) {
    console.error('Pipeline API error:', error);
    
    // Return appropriate error response
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          type: ResponseType.ERROR,
          content: 'Invalid request format',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        type: ResponseType.ERROR,
        content: 'An error occurred while processing your request',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}