/* import OpenAI from "openai";
import { zodResponseFormat} from "openai/helpers/zod";
import {z} from "zod";
export const openai = new OpenAI();

const responseSchema = z.object({
    type: z.string(),
    content: z.string(),
});

export const streaming = openai.beta.chat.completions.stream(
  {
    model:'gpt-4-turbo',
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
        {
            role: "user",
            content: "What is the purpose of life?"
        }
    ]
  }  
); */