import { connectToDatabase } from '../connection';
import { Prompt } from '../models/prompt';
import { AgentType, PromptOperation, PromptEnvironment } from '../types';
import { 
  extractAllPrompts, 
  getBaseSystemPrompt 
} from '../../migration/extractor';
import { 
  convertAllExtractedPrompts,
  createProductionPrompts 
} from '../../migration/converter-simple';
import pino from 'pino';

const logger = pino();

/**
 * Seed prompts from the existing AI pipeline
 */
export async function seedPromptsFromPipeline(): Promise<void> {
  try {
    await connectToDatabase();
    logger.info('Connected to database for prompt seeding');

    // Extract prompts from AI pipeline
    const extractedPrompts = extractAllPrompts();
    logger.info(`Extracted ${extractedPrompts.length} prompts from AI pipeline`);

    // Convert to database format
    const databasePrompts = convertAllExtractedPrompts(extractedPrompts);
    
    // Create production variants
    const productionPrompts = createProductionPrompts(databasePrompts);
    const finalPrompts = [...databasePrompts, ...productionPrompts];

    logger.info(`Total prompts to seed: ${finalPrompts.length}`);

    // Seed each prompt
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const promptData of finalPrompts) {
      try {
        // Check if prompt already exists
        const existing = await Prompt.findOne({ 
          name: promptData.name
        });

        if (existing) {
          // Update if current version template has changed
          const currentVersion = existing.versions.find(v => v.version === existing.currentVersion);
          const newTemplate = promptData.versions[0].template;
          
          if (!currentVersion || currentVersion.template !== newTemplate) {
            await Prompt.findByIdAndUpdate(existing._id, promptData);
            updated++;
            logger.info(`Updated prompt: ${promptData.name}`);
          } else {
            skipped++;
            logger.debug(`Skipped unchanged prompt: ${promptData.name}`);
          }
        } else {
          // Create new prompt
          const prompt = new Prompt(promptData);
          await prompt.save();
          created++;
          logger.info(`Created prompt: ${promptData.name}`);
        }
      } catch (error) {
        logger.error(`Error seeding prompt ${promptData.name}:`, error);
      }
    }

    logger.info('Prompt seeding completed', {
      created,
      updated,
      skipped,
      total: finalPrompts.length
    });

  } catch (error) {
    logger.error('Error seeding prompts:', error);
    throw error;
  }
}

/**
 * Seed base system prompt as a standalone prompt
 */
export async function seedBaseSystemPrompt(): Promise<void> {
  try {
    const basePrompt = {
      name: 'base-system-prompt',
      agentType: AgentType.GENERATOR,
      diagramType: [],
      operation: PromptOperation.GENERATION,
      currentVersion: '1.0.0',
      versions: [{
        version: '1.0.0',
        template: getBaseSystemPrompt(),
        changelog: 'Base system prompt used by all AI agents',
        createdAt: new Date(),
        isActive: true,
        metadata: {
          originalFile: 'lib/ai-pipeline/baseChain.ts',
          extractedAt: new Date()
        }
      }],
      isProduction: false,
      environments: [PromptEnvironment.DEVELOPMENT],
      tags: ['system', 'base'],
      metadata: {
        author: 'system-seeder'
      }
    };

    const existing = await Prompt.findOne({ name: basePrompt.name });
    if (!existing) {
      const prompt = new Prompt(basePrompt);
      await prompt.save();
      logger.info('Created base system prompt');
    } else {
      logger.info('Base system prompt already exists');
    }
  } catch (error) {
    logger.error('Error seeding base system prompt:', error);
  }
}

/**
 * Activate specific prompts for production use
 */
export async function activatePrompts(promptNames: string[]): Promise<void> {
  try {
    for (const name of promptNames) {
      await Prompt.updateMany(
        { name },
        { $set: { isProduction: true } }
      );
      logger.info(`Activated prompt: ${name}`);
    }
  } catch (error) {
    logger.error('Error activating prompts:', error);
    throw error;
  }
}

/**
 * Deactivate specific prompts
 */
export async function deactivatePrompts(promptNames: string[]): Promise<void> {
  try {
    for (const name of promptNames) {
      await Prompt.updateMany(
        { name },
        { $set: { isProduction: false } }
      );
      logger.info(`Deactivated prompt: ${name}`);
    }
  } catch (error) {
    logger.error('Error deactivating prompts:', error);
    throw error;
  }
}

/**
 * Get seeding statistics
 */
export async function getSeedingStats(): Promise<{
  totalPrompts: number;
  activePrompts: number;
  promptsByAgent: Record<string, number>;
  promptsByDiagram: Record<string, number>;
}> {
  try {
    const totalPrompts = await Prompt.countDocuments();
    const activePrompts = await Prompt.countDocuments({ isProduction: true });
    
    const promptsByAgent = await Prompt.aggregate([
      { $group: { _id: '$agentType', count: { $sum: 1 } } }
    ]).then(results => 
      results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {})
    );

    const promptsByDiagram = await Prompt.aggregate([
      { $unwind: '$diagramType' },
      { $group: { _id: '$diagramType', count: { $sum: 1 } } }
    ]).then(results => 
      results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {})
    );

    return {
      totalPrompts,
      activePrompts,
      promptsByAgent,
      promptsByDiagram
    };
  } catch (error) {
    logger.error('Error getting seeding stats:', error);
    throw error;
  }
}

/**
 * Clean up test prompts and inactive prompts
 */
export async function cleanupPrompts(): Promise<void> {
  try {
    // Delete test prompts
    const testResult = await Prompt.deleteMany({
      'tags': 'test'
    });
    logger.info(`Deleted ${testResult.deletedCount} test prompts`);

    // Delete inactive development prompts older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldResult = await Prompt.deleteMany({
      isProduction: false,
      environments: 'development',
      createdAt: { $lt: thirtyDaysAgo }
    });
    logger.info(`Deleted ${oldResult.deletedCount} old inactive prompts`);

  } catch (error) {
    logger.error('Error cleaning up prompts:', error);
    throw error;
  }
}