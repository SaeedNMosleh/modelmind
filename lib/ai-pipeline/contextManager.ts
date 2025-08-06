import { BufferMemory } from "langchain/memory";
import { DiagramIntent, DiagramType, AnalysisType } from "./schemas/MasterClassificationSchema";
import { createEnhancedLogger } from "../utils/consola-logger";

// Use enhanced logger
const logger = createEnhancedLogger('pipeline');

/**
 * Interface defining a message in the conversation history
 */
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * Interface defining the diagram metadata
 */
export interface DiagramMetadata {
  id?: string;
  type?: string;
  lastModified: Date;
  createdAt: Date;
  version: number;
  history: string[];
}

/**
 * Class for managing context in the AI pipeline
 * Maintains diagram state, conversation history, and session metadata
 */
export class ContextManager {
  private currentDiagram: string;
  private diagramMetadata: DiagramMetadata;
  private memory: BufferMemory | null = null;
  private sessionId: string;
  private messages: Message[];
  private lastIntent: DiagramIntent;
  private lastDiagramType: DiagramType = DiagramType.UNKNOWN;
  private lastAnalysisType: AnalysisType = AnalysisType.GENERAL;
  private isMemoryInitialized: boolean = false;

  /**
   * Constructor for the ContextManager
   * @param sessionId - Unique identifier for the current session
   * @param initialDiagram - Initial diagram code (if any)
   */
  constructor(sessionId: string = "", initialDiagram: string = "") {
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.currentDiagram = initialDiagram;
    this.messages = [];
    this.lastIntent = DiagramIntent.UNKNOWN;
    
    // Initialize memory lazily to avoid issues
    try {
      this.memory = new BufferMemory({
        returnMessages: true,
        memoryKey: "conversation_history"
      });
    } catch (error) {
      logger.error("Failed to initialize LangChain memory:", error);
      this.memory = null;
    }
    
    // Initialize diagram metadata
    const now = new Date();
    this.diagramMetadata = {
      lastModified: now,
      createdAt: now,
      version: 1,
      history: initialDiagram ? [initialDiagram] : []
    };
    
    logger.debug(`🔧 Context manager initialized | Session: ${this.sessionId}`);
  }

  /**
   * Updates the current diagram and its metadata
   * @param newDiagram - The new diagram code
   * @param intent - The intent that caused this update
   */
  public updateDiagram(newDiagram: string, intent: DiagramIntent = DiagramIntent.MODIFY): void {
    // Don't update if diagram hasn't changed
    if (this.currentDiagram === newDiagram) {
      return;
    }
    
    this.currentDiagram = newDiagram;
    
    // Update metadata
    this.diagramMetadata.lastModified = new Date();
    this.diagramMetadata.version += 1;
    this.diagramMetadata.history.push(newDiagram);
    
    // Limit history size
    if (this.diagramMetadata.history.length > 10) {
      this.diagramMetadata.history = this.diagramMetadata.history.slice(-10);
    }
    
    // If this is a new generation, reset creation time
    if (intent === DiagramIntent.GENERATE) {
      this.diagramMetadata.createdAt = new Date();
      this.diagramMetadata.version = 1;
    }
    
    logger.debug(`📝 Diagram updated | Version: ${this.diagramMetadata.version} | Intent: ${intent}`);
  }

  /**
   * Adds a message to the conversation history
   * @param role - Role of the message sender (user or assistant)
   * @param content - Content of the message
   */
  public async addMessage(role: "user" | "assistant", content: string): Promise<void> {
    const message: Message = {
      role,
      content,
      timestamp: new Date()
    };
    
    this.messages.push(message);
      // Only try to use memory if it was successfully initialized
    if (this.memory) {
      try {
        // Add to LangChain memory
        if (role === "user") {
          // For user messages, just save with empty output
          await this.memory.saveContext({ input: content }, { output: "" });
          this.isMemoryInitialized = true;
        } else if (role === "assistant" && this.isMemoryInitialized) {
          try {
            // For assistant messages, get the most recent user message from our messages array
            const recentUserMessages = this.messages
              .filter(msg => msg.role === "user")
              .slice(-1);
            
            if (recentUserMessages.length > 0) {
              const lastUserMessage = recentUserMessages[0];
              await this.memory.saveContext(
                { input: lastUserMessage.content }, 
                { output: content }
              );
            } else {
              // If no user message found, save as standalone entry
              await this.memory.saveContext(
                { input: `[Context at ${new Date().toISOString()}]` }, 
                { output: content }
              );
            }
          } catch (memoryError) {
            logger.error("Error accessing memory variables:", memoryError);
            // Continue execution - memory failure shouldn't break the flow
          }
        }
      } catch (error) {
        logger.error("Error saving message to memory:", error);
        // Continue execution even if memory fails - we still have the messages array
      }
    }
    
    logger.debug(`💬 Message added | Role: ${role}`);
  }

  /**
   * Sets the last detected intent
   * @param intent - The intent to set
   */
  public setLastIntent(intent: DiagramIntent): void {
    this.lastIntent = intent;
    logger.debug(`🎯 Intent updated | Intent: ${intent}`);
  }

  /**
   * Gets the current diagram
   * @returns The current diagram code
   */
  public getCurrentDiagram(): string {
    return this.currentDiagram;
  }

  /**
   * Gets the diagram metadata
   * @returns The current diagram metadata
   */
  public getDiagramMetadata(): DiagramMetadata {
    return { ...this.diagramMetadata };
  }

  /**
   * Gets the conversation history
   * @param limit - Optional limit on the number of messages to return
   * @returns An array of messages
   */
  public getConversationHistory(limit?: number): Message[] {
    if (limit && limit > 0) {
      return [...this.messages].slice(-limit);
    }
    return [...this.messages];
  }

  /**
   * Gets the last detected intent
   * @returns The last intent
   */
  public getLastIntent(): DiagramIntent {
    return this.lastIntent;
  }

  /**
   * Gets the conversation history in a format suitable for LLM context
   * @param limit - Optional limit on the number of messages to return
   * @returns Formatted conversation history string
   */
  public async getFormattedConversationHistory(limit?: number): Promise<string> {
    // If memory is unavailable or fails, fall back to the messages array
    if (!this.memory || !this.isMemoryInitialized) {
      return this.messages
        .slice(limit ? -limit : 0)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
    
    try {
      const memoryVariables = await this.memory.loadMemoryVariables({});
      const history = memoryVariables.conversation_history || [];
      
      // If no history from memory, use the messages array
      if (!Array.isArray(history) || history.length === 0) {
        return this.messages
          .slice(limit ? -limit : 0)
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
      }
      
      // Format the history from memory
      return history
        .slice(limit ? -limit : 0)
        .map((msg: { type: string; content: string }) => 
          `${msg.type || 'unknown'}: ${msg.content}`)
        .join('\n');
    } catch (error) {
      logger.error("Error loading conversation history:", error);
      // Fallback to messages array if memory fails
      return this.messages
        .slice(limit ? -limit : 0)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
  }

  /**
   * Gets the complete context for agent operations
   * @returns An object containing all relevant context for agents
   */
  public async getCompleteContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: this.diagramMetadata,
      lastIntent: this.lastIntent,
      sessionId: this.sessionId,
      conversationHistory: await this.getFormattedConversationHistory()
    };
  }

  /**
   * Gets context specifically tailored for diagram generation
   * @returns Context for the generator agent
   */
  public async getGeneratorContext(): Promise<Record<string, unknown>> {
    return {
      conversationHistory: await this.getFormattedConversationHistory(5),
      lastIntent: this.lastIntent,
      sessionId: this.sessionId
    };
  }

  /**
   * Gets context specifically tailored for diagram modification
   * @returns Context for the modifier agent
   */
  public async getModifierContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: {
        version: this.diagramMetadata.version,
        lastModified: this.diagramMetadata.lastModified
      },
      conversationHistory: await this.getFormattedConversationHistory(3),
      lastIntent: this.lastIntent
    };
  }

  /**
   * Gets context specifically tailored for diagram analysis
   * @returns Context for the analyzer agent
   */
  public async getAnalyzerContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: {
        version: this.diagramMetadata.version,
        type: this.diagramMetadata.type
      },
      lastIntent: this.lastIntent
    };
  }

  /**
   * Resets the current diagram state
   */
  public resetDiagram(): void {
    this.currentDiagram = "";
    const now = new Date();
    this.diagramMetadata = {
      lastModified: now,
      createdAt: now,
      version: 0,
      history: []
    };
    logger.info("Diagram state reset");
  }

  /**
   * Clears the conversation history
   */
  public async clearConversation(): Promise<void> {
    this.messages = [];
    this.isMemoryInitialized = false;
    
    // Recreate memory instance to clear it
    try {
      this.memory = new BufferMemory({
        returnMessages: true,
        memoryKey: "conversation_history"
      });
    } catch (error) {
      logger.error("Error recreating memory:", error);
      this.memory = null;
    }
    
    logger.info("Conversation history cleared");
  }

  /**
   * Sets the last diagram type
   * @param diagramType - The diagram type to set
   */
  public setLastDiagramType(diagramType: DiagramType): void {
    this.lastDiagramType = diagramType;
    logger.debug(`📊 Diagram type updated | Type: ${diagramType}`);
  }

  /**
   * Gets the last diagram type
   * @returns The last diagram type
   */
  public getLastDiagramType(): DiagramType {
    return this.lastDiagramType;
  }

  /**
   * Sets the last analysis type
   * @param analysisType - The analysis type to set
   */
  public setLastAnalysisType(analysisType: AnalysisType): void {
    this.lastAnalysisType = analysisType;
    logger.debug(`🔍 Analysis type updated | Type: ${analysisType}`);
  }

  /**
   * Gets the last analysis type
   * @returns The last analysis type
   */
  public getLastAnalysisType(): AnalysisType {
    return this.lastAnalysisType;
  }
}

// Export an instance for singleton usage across the application
export const contextManager = new ContextManager();