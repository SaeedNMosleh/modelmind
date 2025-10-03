import { consumeStream, streamText, type UIMessage } from "ai"
import { openai as openaiProvider } from "@ai-sdk/openai"
import OpenAI from "openai"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import dotenv from "dotenv"

dotenv.config()

export const maxDuration = 30

const openai = new OpenAI()

const openAIModels = ["gpt-4o-2024-08-06", "gpt-4o-mini-2024-07-18", "o3-mini-2025-01-31"]

const ResponseObjectSchema = z.object({
  type: z.string(),
  content: z.string(),
})

const ResponseSchema = z.object({
  mandatory: ResponseObjectSchema,
  optional: ResponseObjectSchema.nullable().optional(),
})

export async function POST(req: Request) {
  const { messages, currentScript }: { messages: UIMessage[]; currentScript?: string } = await req.json()

  const openAIMessages = messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content:
      msg.parts
        ?.map((part) => {
          if (part.type === "text") return part.text
          return ""
        })
        .join("") || "",
  }))

  const lastMessage = openAIMessages[openAIMessages.length - 1]

  const completion = await openai.beta.chat.completions.parse({
    model: openAIModels[0],
    messages: [
      {
        role: "system",
        content: `You are an assistant integrated into an app for creating and modifying PlantUML diagrams based on user input. Your response must follow these guidelines:

1. **Explanation Response (Always Required):**  
   Always provide an explanation, acknowledgment, or clarification of the user's input in the "message" object.  
   This should be informative and help the user understand the state or action related to their request.  
   The response should always be structured as:
   {
     "type": "message",
     "content": "explanation here"
   }

2. **Diagram Response (Optional and Conditional):**  
   Only provide the \`script\` object when:
   - The user explicitly asks to **modify** the diagram (e.g., "Add an attribute to this class").
   - The user **requests a completely new diagram**.
   
   **Do not provide the \`script\` object** in the following cases:
   - The user asks for information about the diagram (e.g., "How many attributes does this class have?").
   - The user asks for analysis of the diagram or a property of the diagram (e.g., "What relationships exist in this diagram?").
   - If no change is needed or requested, simply provide the explanation without returning the same diagram.
   
   If the \`script\` object is provided, structure it as follows:
   {
     "type": "script",
     "content": "PlantUML script here"
   }

3. **Context Awareness:**  
   Always consider the current content of the diagram in the editor (provided with the user input) and the user's request when crafting your response. Ignore the current diagram if the user requests a completely new diagram. If no modifications are necessary or no new diagram is requested, do not return a new diagram.

4. **Ambiguity Handling:**  
   If the user's request is unclear, ask clarifying questions in the "message" object. If no modification or creation of a diagram is necessary, do not include the \`script\` object.`,
      },
      ...openAIMessages.slice(0, -1),
      {
        role: lastMessage.role,
        content: `${lastMessage.content}\n\nCurrent script in editor: ${currentScript || ""}`,
      },
    ],
    response_format: zodResponseFormat(ResponseSchema, "response"),
  })

  const parsedResponse = completion.choices[0].message.parsed

  if (!parsedResponse) {
    throw new Error("Failed to parse OpenAI response")
  }

  const messageText = parsedResponse.mandatory.content

  // Create a simple stream that returns the message immediately
  const result = streamText({
    model: openaiProvider("gpt-4o-mini"),
    prompt: messageText,
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    messageMetadata: () => ({
      mandatory: parsedResponse.mandatory,
      optional: parsedResponse.optional,
    }),
    consumeSseStream: consumeStream,
  })
}
