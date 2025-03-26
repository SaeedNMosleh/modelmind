
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file using

export async function POST(req: Request) {
  const { messages, currentScript } = await req.json()

  const lastMessage = messages[messages.length - 1]
  const response = streamText({
    model: openai("gpt-4-turbo"),
    messages: [
      {
        role: "system",
        content: `You are a PlantUML expert assistant. 
        When providing PlantUML scripts, return a JSON object with the following structure:
        {
          "type": "script",
          "content": "your PlantUML script here"
        }
        
        When providing explanations or discussions, return a JSON object with:
        {
          "type": "message",
          "content": "your explanation here"
        }
        
        Current script in editor: ${currentScript}`,
      },
      ...messages.slice(0, -1),
      {
        role: lastMessage.role,
        content: `${lastMessage.content}\n\nRespond in the specified JSON format.`,
      },
    ],
  })

  return response.toDataStreamResponse()
}