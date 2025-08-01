import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { model } from "./baseChain";
import { DiagramIntent } from "./inputProcessor";
import { contextManager } from "./contextManager";
import { diagramGenerator } from "./agents/generator";
import { diagramModifier } from "./agents/modifier";
import { diagramAnalyzer } from "./agents/analyzer";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

// Define the task router prompt template
const routerPromptTemplate = PromptTemplate.fromTemplate(`
You are a task router for a PlantUML diagram assistant.
Based on the user's message and the current state of the diagram, determine which specialized agent
should handle this request.

User message: {userInput}

Current diagram: {currentDiagram}

Previous messages: {messageHistory}

Classify the request into exactly one of the following categories:
- GENERATE: Create a new diagram or a completely different one
- MODIFY: Make changes to an existing diagram
- ANALYZE: Explain, interpret, or provide feedback on the diagram

Return only the category name (GENERATE, MODIFY, or ANALYZE) with no additional text.
`);

// Create the task router chain
export const taskRouter = RunnableSequence.from([
  routerPromptTemplate,
  model,
  new StringOutputParser(),
]);

/**
 * Routes the request to the appropriate specialized agent based on intent
 * @param params - Object containing user input, current diagram and message history
 * @returns Response from the appropriate specialized agent
 */
export async function routeRequest({ 
  userInput, 
  currentDiagram, 
  messageHistory 
}: { 
  userInput: string; 
  currentDiagram: string; 
  messageHistory: string;
}) {
  try {
    // Get the task classification
    const taskType = await taskRouter.invoke({
      userInput,
      currentDiagram,
      messageHistory,
    });

    // Update context with intent
    let intent: DiagramIntent;
    
    // Route to the appropriate agent based on the task type
    switch (taskType.trim().toUpperCase()) {
      case "GENERATE":
        intent = DiagramIntent.GENERATE;
        contextManager.setLastIntent(intent);
        logger.info("Routing to generator agent", { userInput });
        return await diagramGenerator.generate({ 
          userInput, 
          context: await contextManager.getGeneratorContext()
        });
        
      case "MODIFY":
        intent = DiagramIntent.MODIFY;
        contextManager.setLastIntent(intent);
        logger.info("Routing to modifier agent", { userInput });
        return await diagramModifier.modify({ 
          userInput, 
          currentDiagram, 
          context: await contextManager.getModifierContext()
        });
        
      case "ANALYZE":
        intent = DiagramIntent.ANALYZE;
        contextManager.setLastIntent(intent);
        logger.info("Routing to analyzer agent", { userInput });
        return await diagramAnalyzer.analyze({ 
          userInput, 
          diagram: currentDiagram, 
          context: await contextManager.getAnalyzerContext()
        });
        
      default:
        // Fallback if classification is unclear
        intent = DiagramIntent.UNKNOWN;
        contextManager.setLastIntent(intent);
        logger.warn(`Unknown task type: ${taskType}. Defaulting to ANALYZE.`);
        return await diagramAnalyzer.analyze({ 
          userInput, 
          diagram: currentDiagram, 
          context: await contextManager.getAnalyzerContext()
        });
    }
  } catch (error) {
    logger.error("Error in task router:", error);
    return {
      type: "error",
      content: "I encountered an error determining how to process your request. Please try again.",
    };
  }
}

