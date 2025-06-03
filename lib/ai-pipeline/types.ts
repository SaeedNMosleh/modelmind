/**
 * Type definitions for the AI Pipeline
 * These types provide a common interface between different components
 */

import { DiagramIntent } from "./inputProcessor";
import { DiagramType } from "../knowledge/guidelines";
import { FormattedResponse } from "./responseFormatter";

/**
 * Base agent parameters that all specialized agents share
 */
export interface BaseAgentParams {
  /**
   * The user's input message
   */
  userInput: string;
  
  /**
   * Optional context information
   */
  context?: Record<string, unknown>;
}

/**
 * Base agent result that all specialized agent results extend
 */
export interface BaseAgentResult {
  /**
   * The type of diagram
   */
  diagramType: DiagramType;
  
  /**
   * Explanation or message to the user
   */
  explanation: string;
}

/**
 * Parameters for pipeline processing
 */
export interface PipelineParams {
  /**
   * The user's input message
   */
  userInput: string;
  
  /**
   * Current PlantUML script (if any)
   */
  currentScript?: string;
  
  /**
   * Previous conversation messages
   */
  conversation?: string[];
  
  /**
   * Optional session identifier
   */
  sessionId?: string;
}

/**
 * Result from the pipeline processing
 */
export interface PipelineResult {
  /**
   * Formatted response for the UI
   */
  response: FormattedResponse;
  
  /**
   * The intent that was determined
   */
  intent: DiagramIntent;
  
  /**
   * Updated PlantUML script (if applicable)
   */
  updatedScript?: string;
  
  /**
   * Session identifier
   */
  sessionId: string;
}

/**
 * Interface for the complete AI pipeline
 */
export interface AIPipeline {
  /**
   * Process a user request through the pipeline
   * @param params - Parameters for processing
   * @returns Pipeline result
   */
  process(params: PipelineParams): Promise<PipelineResult>;
  
  /**
   * Reset the pipeline state
   * @param sessionId - Optional session ID to reset
   */
  reset(sessionId?: string): void;
}

/**
 * Interface for specialized agents
 */
export interface Agent<TParams extends BaseAgentParams, TResult extends BaseAgentResult> {
  /**
   * Process a request with this agent
   * @param params - Agent parameters
   * @returns Agent result
   */
  invoke(params: TParams): Promise<TResult>;
}