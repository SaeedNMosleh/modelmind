import { DiagramIntent } from "./schemas/MasterClassificationSchema";
import { GenerationResult } from "./agents/generator";
import { ModificationResult } from "./agents/modifier";
import { AnalysisResult } from "./agents/analyzer";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Types of possible responses
 */
export enum ResponseType {
  MESSAGE = "message",
  SCRIPT = "script",
  ERROR = "error"
}

/**
 * Base interface for all response objects
 */
export interface BaseResponse {
  type: ResponseType;
  content: string;
}

/**
 * Interface for message-only responses
 */
export interface MessageResponse extends BaseResponse {
  type: ResponseType.MESSAGE;
  content: string;
}

/**
 * Interface for script responses that include a diagram
 */
export interface ScriptResponse extends BaseResponse {
  type: ResponseType.SCRIPT;
  content: string;
  explanation: string;
}

/**
 * Interface for error responses
 */
export interface ErrorResponse extends BaseResponse {
  type: ResponseType.ERROR;
  content: string;
  errorCode?: string;
}

/**
 * Union type for all possible response types
 */
export type FormattedResponse = MessageResponse | ScriptResponse | ErrorResponse;

/**
 * Factory methods for creating standard responses
 */
export class ResponseFactory {
  /**
   * Create a message-only response
   * @param message - The message content
   * @returns A message response object
   */
  public static createMessageResponse(message: string): MessageResponse {
    return {
      type: ResponseType.MESSAGE,
      content: message
    };
  }

  /**
   * Create a script response with diagram
   * @param script - The PlantUML script
   * @param explanation - Explanation for the diagram
   * @returns A script response object
   */
  public static createScriptResponse(script: string, explanation: string): ScriptResponse {
    return {
      type: ResponseType.SCRIPT,
      content: script,
      explanation
    };
  }

  /**
   * Create an error response
   * @param message - The error message
   * @param errorCode - Optional error code
   * @returns An error response object
   */
  public static createErrorResponse(message: string, errorCode?: string): ErrorResponse {
    return {
      type: ResponseType.ERROR,
      content: message,
      errorCode
    };
  }
}

/**
 * Response formatter class for handling different agent outputs
 */
export class ResponseFormatter {
  /**
   * Format a generator result into a standardized response
   * @param result - The generator result
   * @returns Formatted response
   */
  public formatGeneratorResponse(result: GenerationResult): FormattedResponse {
    try {
      logger.info("Formatting generator response");
      
      return ResponseFactory.createScriptResponse(
        result.diagram,
        result.explanation
      );
    } catch (error) {
      logger.error("Error formatting generator response:", { error });
      return ResponseFactory.createErrorResponse(
        "Failed to format generator response",
        "FORMAT_ERROR"
      );
    }
  }

  /**
   * Format a modifier result into a standardized response
   * @param result - The modifier result
   * @returns Formatted response
   */
  public formatModifierResponse(result: ModificationResult): FormattedResponse {
    try {
      logger.info("Formatting modifier response");
      
      // Format the changes summary
      const changesList = result.changes.join('\n- ');
      const changesMessage = `Changes made:\n- ${changesList}`;
      
      return ResponseFactory.createScriptResponse(
        result.diagram,
        `${result.explanation}\n\n${changesMessage}`
      );
    } catch (error) {
      logger.error("Error formatting modifier response:", { error });
      return ResponseFactory.createErrorResponse(
        "Failed to format modifier response",
        "FORMAT_ERROR"
      );
    }
  }

  /**
   * Format an analyzer result into a standardized response
   * @param result - The analyzer result
   * @returns Formatted response
   */
  public formatAnalyzerResponse(result: AnalysisResult): FormattedResponse {
    try {
      logger.info("Formatting analyzer response");
      
      // Prepare the analysis message based on available data
      let analysisMessage = result.overview;
      
      // Add quality assessment if available
      if (result.qualityAssessment) {
        const quality = result.qualityAssessment;
        
        if (quality.score !== undefined) {
          analysisMessage += `\n\nQuality Score: ${quality.score}/10`;
        }
        
        if (quality.strengths && quality.strengths.length > 0) {
          analysisMessage += `\n\nStrengths:\n- ${quality.strengths.join('\n- ')}`;
        }
        
        if (quality.weaknesses && quality.weaknesses.length > 0) {
          analysisMessage += `\n\nAreas for Improvement:\n- ${quality.weaknesses.join('\n- ')}`;
        }
      }
      
      // Add improvement suggestions if available
      if (result.suggestedImprovements && result.suggestedImprovements.length > 0) {
        analysisMessage += `\n\nSuggested Improvements:\n- ${result.suggestedImprovements.join('\n- ')}`;
      }
      
      return ResponseFactory.createMessageResponse(analysisMessage);
    } catch (error) {
      logger.error("Error formatting analyzer response:", { error });
      return ResponseFactory.createErrorResponse(
        "Failed to format analyzer response",
        "FORMAT_ERROR"
      );
    }
  }

  /**
   * Format a generic response based on intent and result
   * @param intent - The diagram intent
   * @param result - The result object from any agent
   * @returns Formatted response
   */
  public formatResponse(intent: DiagramIntent, result: GenerationResult | ModificationResult | AnalysisResult | unknown): FormattedResponse {
    try {
      switch (intent) {
        case DiagramIntent.GENERATE:
          return this.formatGeneratorResponse(result as GenerationResult);
          
        case DiagramIntent.MODIFY:
          return this.formatModifierResponse(result as ModificationResult);
          
        case DiagramIntent.ANALYZE:
          return this.formatAnalyzerResponse(result as AnalysisResult);
          
        case DiagramIntent.UNKNOWN:
        default:
          return ResponseFactory.createMessageResponse(
            "I'm not sure what you'd like me to do with the diagram. " +
            "Could you please clarify if you want me to create a new diagram, " +
            "modify the existing one, or analyze it?"
          );
      }
    } catch (error) {
      logger.error("Error in response formatter:", { error, intent });
      
      return ResponseFactory.createErrorResponse(
        "An error occurred while processing your request. Please try again.",
        "GENERAL_ERROR"
      );
    }
  }
}

// Export singleton instance
export const responseFormatter = new ResponseFormatter();