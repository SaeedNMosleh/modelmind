import { 
  DiagramType, 
  AgentType, 
  PromptOperation, 
  IPromptVersion
} from '../database/types';

/**
 * Simple prompt data structure for seeding
 */
export interface PromptSeedData {
  name: string;
  agentType: AgentType;
  diagramType: DiagramType[];
  operation: PromptOperation;
  primaryVersion: string;
  versions: IPromptVersion[];
  isProduction: boolean;  
  tags: string[];
  metadata?: Record<string, unknown>;
}