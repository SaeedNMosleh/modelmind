/**
 * Simplified prompt registry for loading and managing prompt templates
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { 
  PromptTemplate, 
  PromptMetadata, 
  AgentType, 
  PromptOperation, 
  PromptEnvironment,  
} from './types';
import { DiagramType } from '../knowledge/guidelines';
import pino from 'pino';

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

// Schema for validating JSON prompt files
const promptFileSchema = z.object({
  metadata: z.object({    id: z.string(),
    name: z.string(),
    agentType: z.nativeEnum(AgentType),
    diagramType: z.union([
      z.literal('sequence'),
      z.literal('class'),
      z.literal('activity'),
      z.literal('state'),
      z.literal('component'),
      z.literal('use-case')
    ]).optional(), // Define using literals for type union
    operation: z.nativeEnum(PromptOperation),
    version: z.string(),
    author: z.string().optional(),
    createdAt: z.string().transform(str => new Date(str)),
    updatedAt: z.string().transform(str => new Date(str)),
    description: z.string(),
    isProduction: z.boolean().default(false),
    trafficAllocation: z.number().min(0).max(100).default(0),
    environments: z.array(z.nativeEnum(PromptEnvironment)).default([PromptEnvironment.DEVELOPMENT]),
    tags: z.array(z.string()).default([]),
    relatedPrompts: z.array(z.string()).optional(),
    properties: z.record(z.unknown()).optional(),
  }),
  template: z.string(),
  examples: z.array(
    z.object({
      input: z.record(z.string()),
      output: z.string()
    })
  ).optional(),
});

/**
 * Registry for managing and accessing prompt templates
 */
export class PromptRegistry {
  private basePath: string;
  private cache: Map<string, PromptTemplate> = new Map();

  /**
   * Creates a new instance of the prompt registry
   * @param basePath - Base path for prompt files
   */
  constructor(basePath = path.join(process.cwd(), 'lib/prompts/templates')) {
    this.basePath = basePath;
  }

  /**
   * Loads a prompt template by path
   * @param promptId - ID of the prompt to load
   * @param forceReload - Whether to bypass cache and force reload
   * @returns The prompt template
   */
  async loadPrompt(promptId: string, forceReload = false): Promise<PromptTemplate> {
    try {
      // Check cache first if not forcing reload
      if (!forceReload && this.cache.has(promptId)) {
        return this.cache.get(promptId)!;
      }
      
      // Find the prompt file across all agent directories
      const agentTypes = Object.values(AgentType);
      let promptFile: string | null = null;
      
      for (const agentType of agentTypes) {
        const agentPath = path.join(this.basePath, agentType);
        
        if (!fs.existsSync(agentPath)) {
          continue;
        }
        
        const files = fs.readdirSync(agentPath);
        
        for (const file of files) {
          if (file.startsWith(`${promptId}.`) && file.endsWith('.json')) {
            promptFile = path.join(agentPath, file);
            break;
          }
        }
        
        if (promptFile) {
          break;
        }
      }
      
      if (!promptFile) {
        throw new Error(`Prompt not found: ${promptId}`);
      }
      
      // Read and parse the prompt file
      const content = await fs.promises.readFile(promptFile, 'utf-8');
      const parsed = JSON.parse(content);
        // Validate against schema
      const prompt = promptFileSchema.parse(parsed);
      
      // Convert dates from strings if they came from JSON
      const promptTemplate: PromptTemplate = {
        ...prompt,
        metadata: {
          ...prompt.metadata,
          createdAt: new Date(prompt.metadata.createdAt),
          updatedAt: new Date(prompt.metadata.updatedAt)
        }
      } as PromptTemplate;
      
      // Add to cache
      this.cache.set(promptId, promptTemplate);
      
      logger.info(`Loaded prompt: ${promptId} (${promptTemplate.metadata.version})`);
      return promptTemplate;
    } catch (error) {
      logger.error(`Failed to load prompt ${promptId}:`, error);
      throw new Error(`Failed to load prompt: ${promptId}`);
    }
  }

  /**
   * Gets the best matching prompt for the specified criteria
   * @param agentType - Type of agent
   * @param operation - Operation type
   * @param diagramType - Type of diagram (optional)
   * @param environment - Deployment environment
   * @returns The best matching prompt template
   */
  async getPrompt(
    agentType: AgentType,
    operation: PromptOperation,
    diagramType?: DiagramType, // Changed from string to DiagramType
    environment: PromptEnvironment = PromptEnvironment.DEVELOPMENT
  ): Promise<PromptTemplate> {
    try {
      // Scan for matching prompts
      const promptFiles = await this.findPromptFiles(agentType);
      const candidates: PromptTemplate[] = [];
      
      for (const file of promptFiles) {
        try {
          const content = await fs.promises.readFile(file, 'utf-8');
          const parsed = JSON.parse(content);
          const prompt = promptFileSchema.parse(parsed);          // Check if this prompt matches our criteria
          if (
            prompt.metadata.operation === operation &&
            (prompt.metadata.environments as PromptEnvironment[]).includes(environment) &&
            (!diagramType || prompt.metadata.diagramType === diagramType)
          ) {
            candidates.push({
              ...prompt,
              metadata: {
                ...prompt.metadata,
                createdAt: new Date(prompt.metadata.createdAt as string | number | Date),
                updatedAt: new Date(prompt.metadata.updatedAt as string | number | Date)
              }
            } as PromptTemplate);
          }
        } catch (error) {
          logger.warn(`Skipping invalid prompt file ${file}:`, error);
          continue;
        }
      }
      
      if (candidates.length === 0) {
        throw new Error(
          `No matching prompt found for ${agentType}/${operation}/${diagramType || 'any'} in ${environment}`
        );
      }
      
      // Simple selection logic: use the latest version that's marked for production in production env
      // or latest version in other environments
      if (environment === PromptEnvironment.PRODUCTION) {
        // For production, get production prompts
        const productionCandidates = candidates.filter(c => c.metadata.isProduction);
        
        if (productionCandidates.length > 0) {
          // Sort by version (descending)
          productionCandidates.sort((a, b) => {
            return b.metadata.version.localeCompare(a.metadata.version);
          });
          
          return productionCandidates[0];
        }
      }
      
      // For non-production or if no production prompts, get latest
      candidates.sort((a, b) => {
        return b.metadata.version.localeCompare(a.metadata.version);
      });
      
      return candidates[0];
    } catch (error: unknown) { // Type annotation for error
      logger.error(`Failed to get prompt for ${agentType}/${operation}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get prompt for ${agentType}/${operation}: ${errorMessage}`);
    }
  }

  /**
   * Finds all prompt files for a given agent type
   * @param agentType - Type of agent
   * @returns List of file paths
   * @private
   */
  private async findPromptFiles(agentType: AgentType): Promise<string[]> {
    const agentPath = path.join(this.basePath, agentType);
    
    if (!fs.existsSync(agentPath)) {
      return [];
    }
    
    const files = await fs.promises.readdir(agentPath);
    return files.filter(f => f.endsWith('.json')).map(f => path.join(agentPath, f));
  }

  /**
   * Saves a prompt template to the registry
   * @param prompt - The prompt template to save
   */
  async savePrompt(prompt: PromptTemplate): Promise<void> {
    try {
      const agentPath = path.join(this.basePath, prompt.metadata.agentType);
      
      if (!fs.existsSync(agentPath)) {
        throw new Error(`Agent directory does not exist: ${agentPath}`);
      }
      
      const fileName = `${prompt.metadata.id}.v${prompt.metadata.version}.json`;
      const filePath = path.join(agentPath, fileName);
      
      // Update timestamp
      prompt.metadata.updatedAt = new Date();
      
      // Save to file
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(prompt, null, 2),
        'utf-8'
      );
      
      // Update cache
      this.cache.set(prompt.metadata.id, prompt);
      
      logger.info(`Saved prompt: ${prompt.metadata.id} (${prompt.metadata.version})`);
    } catch (error) {
      logger.error(`Failed to save prompt ${prompt.metadata.id}:`, error);
      throw new Error(`Failed to save prompt: ${prompt.metadata.id}`);
    }
  }

  /**
   * Lists all prompts matching the specified criteria
   * @param agentType - Type of agent (optional)
   * @param operation - Operation type (optional)
   * @param diagramType - Type of diagram (optional)
   * @returns Array of prompt metadata
   */
  async listPrompts(
    agentType?: AgentType,
    operation?: PromptOperation,
    diagramType?: DiagramType // Changed from string to DiagramType
  ): Promise<PromptMetadata[]> {
    try {
      const agentTypes = agentType ? [agentType] : Object.values(AgentType);
      const promptMetadata: PromptMetadata[] = [];
      
      for (const type of agentTypes) {
        const promptFiles = await this.findPromptFiles(type);
        
        for (const file of promptFiles) {
          try {
            const content = await fs.promises.readFile(file, 'utf-8');
            const parsed = JSON.parse(content);
            const prompt = promptFileSchema.parse(parsed);
            
            // Apply filters
            if (
              (!operation || prompt.metadata.operation === operation) &&
              (!diagramType || prompt.metadata.diagramType === diagramType)
            ) {              promptMetadata.push({
                ...prompt.metadata,
                createdAt: new Date(prompt.metadata.createdAt as string | number | Date),
                updatedAt: new Date(prompt.metadata.updatedAt as string | number | Date)
              } as PromptMetadata);
            }
          } catch (error) {
            logger.warn(`Skipping invalid prompt file ${file}:`, error);
            continue;
          }
        }
      }
      
      return promptMetadata;
    } catch (error: unknown) { // Type annotation for error
      logger.error('Failed to list prompts:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list prompts: ${errorMessage}`);
    }
  }

  /**
   * Creates a new version of an existing prompt
   * @param promptId - ID of the prompt to version
   * @param newTemplate - New template content
   * @param metadata - Metadata updates (optional)
   * @returns The new prompt template
   */
  async createNewVersion(
    promptId: string,
    newTemplate: string,
    metadata?: Partial<PromptMetadata>
  ): Promise<PromptTemplate> {
    try {
      // Load the current version
      const currentPrompt = await this.loadPrompt(promptId);
      
      // Parse current version and increment
      const versionParts = currentPrompt.metadata.version.split('.');
      const major = parseInt(versionParts[0] || '0', 10);
      const minor = parseInt(versionParts[1] || '0', 10);
      const patch = parseInt(versionParts[2] || '0', 10);
      
      // Default to incrementing patch version
      const newVersion = `${major}.${minor}.${patch + 1}`;
      
      // Create the new prompt template
      const newPrompt: PromptTemplate = {
        ...currentPrompt,
        template: newTemplate,
        metadata: {
          ...currentPrompt.metadata,
          ...metadata,
          version: metadata?.version || newVersion,
          updatedAt: new Date(),
          // By default, new versions are not production ready
          isProduction: metadata?.isProduction ?? false,
          trafficAllocation: metadata?.trafficAllocation ?? 0
        }
      };
      
      // Save the new version
      await this.savePrompt(newPrompt);
      
      return newPrompt;
    } catch (error) {
      logger.error(`Failed to create new version of prompt ${promptId}:`, error);
      throw new Error(`Failed to create new version of prompt: ${promptId}`);
    }
  }

  /**
   * Clears the registry cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Prompt registry cache cleared');
  }
}

// Export singleton instance for easier imports
export const promptRegistry = new PromptRegistry();