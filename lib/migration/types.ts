import { 
  DiagramType, 
  AgentType, 
  PromptOperation, 
  PromptEnvironment,
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
  currentVersion: string;
  versions: IPromptVersion[];
  isProduction: boolean;
  environments: PromptEnvironment[];
  tags: string[];
  metadata?: Record<string, any>;
}