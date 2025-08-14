import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

// Define the model configuration for the unified pipeline
const model: ChatOpenAI = new ChatOpenAI({ model: "gpt-4o-2024-08-06" });

export {
    model,
};




