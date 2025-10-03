import { consumeStream, streamText } from "ai"
import { openai as openaiProvider } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"
import { requestRouter, type RequestRouterParams } from "@/lib/ai-pipeline/RequestRouter"
import type { DiagramIntent, DiagramType } from "@/lib/ai-pipeline/schemas/MasterClassificationSchema"
import { contextManager } from "@/lib/ai-pipeline/contextManager"
import { responseFormatter, ResponseType } from "@/lib/ai-pipeline/responseFormatter"
import { z } from "zod"
import { createEnhancedLogger } from "@/lib/utils/consola-logger"
import dotenv from "dotenv"

dotenv.config()

export const maxDuration = 30

const logger = createEnhancedLogger("pipeline")

// Schema for request validation
const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      parts: z
        .array(
          z.object({
            type: z.string(),
            text: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
  currentScript: z.string().optional().default(""),
})

export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request
    const body = await req.json()
    const { messages, currentScript } = requestSchema.parse(body)

    const convertedMessages = messages.map((msg) => ({
      role: msg.role,
      content:
        msg.parts
          ?.map((part) => {
            if (part.type === "text") return part.text
            return ""
          })
          .join("") || "",
    }))

    // Get the latest user message
    const lastUserMessage = convertedMessages.filter((msg) => msg.role === "user").pop()

    if (!lastUserMessage) {
      return NextResponse.json(
        {
          type: ResponseType.ERROR,
          content: "No user message found in the request",
        },
        { status: 400 },
      )
    }

    // Extract previous conversation for context
    const conversation = convertedMessages.map((msg) => `${msg.role}: ${msg.content}`)

    // Add the message to context
    await contextManager.addMessage("user", lastUserMessage.content)

    // Update the current diagram in context manager if provided
    if (currentScript && currentScript.trim() !== "") {
      contextManager.updateDiagram(currentScript)
    }

    logger.debug(`🔧 Processing with new pipeline architecture`)

    // Prepare request router parameters
    const routerParams: RequestRouterParams = {
      userInput: lastUserMessage.content,
      currentDiagram: currentScript && currentScript.trim() !== "" ? currentScript : undefined,
      conversation: conversation.slice(-5),
      context: await contextManager.getCompleteContext(),
    }

    const routerResponse = await requestRouter.processRequest(routerParams)

    // Handle router response
    if (!routerResponse.success) {
      logger.error("Request router failed", {
        error: routerResponse.error,
        intent: routerResponse.intent,
        classification: routerResponse.classification,
      })

      await contextManager
        .addMessage(
          "assistant",
          routerResponse.error?.message || "I encountered an error processing your request. Please try again.",
        )
        .catch((err) => {
          logger.error("Failed to add assistant message to context:", err)
        })

      let statusCode = 500
      switch (routerResponse.error?.type) {
        case "validation":
          statusCode = 400
          break
        case "classification":
        case "routing":
        case "agent":
          statusCode = 422
          break
        default:
          statusCode = 500
      }

      return NextResponse.json(
        {
          type: ResponseType.ERROR,
          content: routerResponse.error?.message || "An error occurred while processing your request",
        },
        { status: statusCode },
      )
    }

    // Success case
    const { intent, result, classification } = routerResponse

    const typedIntent = intent as DiagramIntent
    const resultType = "diagramType" in classification ? (classification.diagramType as DiagramType) : undefined
    logger.requestComplete(Date.now() - Date.now(), typedIntent, resultType)

    // Update context manager with diagram if it was generated/modified
    if (result && "diagram" in result && result.diagram) {
      contextManager.updateDiagram(result.diagram, typedIntent)
    }

    // Format the response
    const formattedResponse = responseFormatter.formatResponse(typedIntent, result)

    // Add the assistant response to context
    if (formattedResponse.type === ResponseType.SCRIPT) {
      await contextManager.addMessage("assistant", `${formattedResponse.explanation}\n\nI've updated the diagram.`)
    } else {
      await contextManager.addMessage("assistant", formattedResponse.content)
    }

    const responseText =
      formattedResponse.type === ResponseType.SCRIPT
        ? `${formattedResponse.explanation || ""}\n\nI've updated the diagram.`
        : formattedResponse.content

    const result2 = streamText({
      model: openaiProvider("gpt-4o-mini"),
      prompt: responseText,
      abortSignal: req.signal,
    })

    return result2.toUIMessageStreamResponse({
      messageMetadata: () => formattedResponse,
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    logger.error("Pipeline API error:", error)

    await contextManager
      .addMessage("assistant", "I encountered an unexpected error processing your request. Please try again.")
      .catch((err) => {
        logger.error("Failed to add assistant message to context:", err)
      })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          type: ResponseType.ERROR,
          content: "Invalid request format - please check your input parameters",
          details: error.errors,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        type: ResponseType.ERROR,
        content: "An unexpected error occurred while processing your request",
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 },
    )
  }
}
