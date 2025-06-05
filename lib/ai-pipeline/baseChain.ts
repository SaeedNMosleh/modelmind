import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

dotenv.config();

// Define the type for the model configuration
const model: ChatOpenAI = new ChatOpenAI({ model: "gpt-4o-2024-08-06" });


// Base system prompt that all chains will extend
const baseSystemPrompt: string = `You are an AI assistant specialized in PlantUML diagrams.`;

// Create base templates for different operations
const baseGenerateTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Generate a PlantUML diagram based on the following requirements:
    {requirements}
    `);

const baseModifyTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Modify the following PlantUML diagram according to these instructions:
    Current diagram:
    {currentDiagram}
    
    Modification instructions:
    {instructions}
    `);

const baseAnalyzeTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Analyze the following PlantUML diagram:
    {diagram}
    
    Focus on:
    {analysisType}
    `);

// Define the type for the function parameter and return value
const createBaseChain = (promptTemplate: PromptTemplate): RunnableSequence => {
    return RunnableSequence.from([
        promptTemplate,
        model,
        new StringOutputParser(),
    ]);
};

export {
    model,
    baseSystemPrompt,
    baseGenerateTemplate,
    baseModifyTemplate,
    baseAnalyzeTemplate,
    createBaseChain,
};




