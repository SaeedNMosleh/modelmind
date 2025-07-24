import { connectToDatabase } from '../connection';
import { Prompt } from '../models/prompt';
import { TestResult } from '../models/testResult';
import { PromptMetrics } from '../models/promptMetrics';
import { DiagramType, AgentType } from '../types';
import pino from 'pino';

const logger = pino();

/**
 * Sample test results for demonstration
 */
const sampleTestResults = [
  {
    success: true,
    executionTime: 1250,
    output: {
      diagram: `@startuml
participant User
participant WebApp
participant Database
User -> WebApp: login request
WebApp -> Database: validate credentials
Database -> WebApp: credentials valid
WebApp -> User: login successful
@enduml`,
      diagramType: 'SEQUENCE',
      explanation: 'Generated a sequence diagram showing the user login process with proper participant interactions.'
    },
    evaluation: {
      scores: {
        isValidPlantUML: 1.0,
        qualityScore: 0.85,
        completeness: 0.9,
        clarity: 0.88
      },
      feedback: [
        'Valid PlantUML syntax',
        'Clear participant flow',
        'Could include error handling'
      ]
    },
    metadata: {
      version: '1.0.0',
      environment: 'development',
      evaluatorVersion: '1.0.0'
    }
  },
  {
    success: true,
    executionTime: 2100,
    output: {
      diagram: `@startuml
class User {
  +id: number
  +name: string
  +email: string
  +login(): boolean
  +logout(): void
}
class Order {
  +id: number
  +userId: number
  +total: decimal
  +status: string
  +calculate(): decimal
}
class Product {
  +id: number
  +name: string
  +price: decimal
}
User ||--o{ Order
Order }o--|| Product
@enduml`,
      diagramType: 'CLASS',
      explanation: 'Created a class diagram for an e-commerce system showing users, orders, and products with appropriate relationships.'
    },
    evaluation: {
      scores: {
        isValidPlantUML: 1.0,
        qualityScore: 0.92,
        completeness: 0.95,
        clarity: 0.91
      },
      feedback: [
        'Excellent class structure',
        'Proper relationship modeling',
        'Good attribute and method definitions'
      ]
    },
    metadata: {
      version: '1.0.0',
      environment: 'development',
      evaluatorVersion: '1.0.0'
    }
  },
  {
    success: false,
    executionTime: 850,
    error: 'Invalid user input: empty requirements provided',
    evaluation: {
      scores: {
        isValidPlantUML: 0.0,
        qualityScore: 0.0,
        completeness: 0.0,
        clarity: 0.0
      },
      feedback: [
        'No diagram generated due to empty input',
        'Error handling working correctly'
      ]
    },
    metadata: {
      version: '1.0.0',
      environment: 'development',
      evaluatorVersion: '1.0.0'
    }
  }
];

/**
 * Sample metrics for different time periods
 */
function generateSampleMetrics(promptId: string, date: Date) {
  const baseDate = new Date(date);
  const metrics = [];

  // Generate metrics for the last 30 days
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(currentDate.getDate() - i);
    
    // Simulate realistic metrics with some randomness
    const totalExecutions = Math.floor(Math.random() * 50) + 10;
    const successfulExecutions = Math.floor(totalExecutions * (0.8 + Math.random() * 0.15));
    const failedExecutions = totalExecutions - successfulExecutions;
    
    metrics.push({
      promptId,
      date: currentDate,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime: Math.floor(Math.random() * 2000) + 500,
      averageQualityScore: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
      p95ExecutionTime: Math.floor(Math.random() * 3000) + 1000,
      p99ExecutionTime: Math.floor(Math.random() * 5000) + 2000,
      errorRate: Math.round((failedExecutions / totalExecutions) * 100) / 100,
      metadata: {
        version: '1.0.0',
        environment: i < 15 ? 'development' : 'production',
        samplingRate: 1.0
      }
    });
  }

  return metrics;
}

/**
 * Seed sample test results
 */
export async function seedSampleTestResults(): Promise<void> {
  try {
    await connectToDatabase();
    logger.info('Seeding sample test results');

    // Get some active prompts to create test results for
    const prompts = await Prompt.find({ isActive: true }).limit(10);
    
    let totalCreated = 0;

    for (const prompt of prompts) {
      // Check if test results already exist for this prompt
      const existingCount = await TestResult.countDocuments({ promptId: prompt._id });
      if (existingCount > 0) {
        logger.debug(`Skipping test results for ${prompt.name} - already exists`);
        continue;
      }

      // Create sample test results based on prompt type
      const resultsToCreate = [];
      for (let i = 0; i < sampleTestResults.length; i++) {
        const sampleResult = sampleTestResults[i];
        const testResult = {
          promptId: prompt._id,
          testCaseId: null, // These are manual test results
          ...sampleResult,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last week
        };
        resultsToCreate.push(testResult);
      }

      await TestResult.insertMany(resultsToCreate);
      totalCreated += resultsToCreate.length;
      logger.info(`Created ${resultsToCreate.length} sample test results for ${prompt.name}`);
    }

    logger.info(`Seeded ${totalCreated} sample test results`);

  } catch (error) {
    logger.error('Error seeding sample test results:', error);
    throw error;
  }
}

/**
 * Seed sample metrics data
 */
export async function seedSampleMetrics(): Promise<void> {
  try {
    await connectToDatabase();
    logger.info('Seeding sample metrics data');

    // Get active prompts
    const prompts = await Prompt.find({ isActive: true }).limit(5);
    
    let totalCreated = 0;

    for (const prompt of prompts) {
      // Check if metrics already exist for this prompt
      const existingCount = await PromptMetrics.countDocuments({ promptId: prompt._id });
      if (existingCount > 0) {
        logger.debug(`Skipping metrics for ${prompt.name} - already exists`);
        continue;
      }

      // Generate sample metrics
      const metrics = generateSampleMetrics(prompt._id.toString(), new Date());
      
      await PromptMetrics.insertMany(metrics);
      totalCreated += metrics.length;
      logger.info(`Created ${metrics.length} sample metrics for ${prompt.name}`);
    }

    logger.info(`Seeded ${totalCreated} sample metric records`);

  } catch (error) {
    logger.error('Error seeding sample metrics:', error);
    throw error;
  }
}

/**
 * Create sample prompt variations for A/B testing
 */
export async function seedPromptVariations(): Promise<void> {
  try {
    await connectToDatabase();
    logger.info('Seeding prompt variations for A/B testing');

    // Find a generator prompt to create variations for
    const basePrompt = await Prompt.findOne({ 
      agentType: AgentType.GENERATOR,
      name: 'diagram-generator-main'
    });

    if (!basePrompt) {
      logger.warn('Base generator prompt not found, skipping variations');
      return;
    }

    // Create variations with different approaches
    const variations = [
      {
        name: 'diagram-generator-main-v2',
        description: 'Generator with enhanced context awareness (A/B test variant)',
        template: basePrompt.template.replace(
          'Based on the requirements, create a detailed PlantUML diagram.',
          'Based on the requirements and considering the specific use case context, create a detailed and contextually appropriate PlantUML diagram.'
        ),
        version: '2.0.0-ab',
        metadata: {
          ...basePrompt.metadata,
          tags: [...(basePrompt.metadata?.tags || []), 'ab-test', 'variant-a'],
          parentPrompt: basePrompt.name,
          experimentName: 'context-awareness-test'
        }
      },
      {
        name: 'diagram-generator-main-v3',
        description: 'Generator with step-by-step approach (A/B test variant)',
        template: basePrompt.template.replace(
          'Based on the requirements, create a detailed PlantUML diagram.\nFocus on clarity, proper syntax, and following best practices.',
          'Based on the requirements, create a detailed PlantUML diagram following these steps:\n1. Identify key components and actors\n2. Define relationships and interactions\n3. Apply appropriate PlantUML syntax\n4. Ensure clarity and best practices compliance'
        ),
        version: '3.0.0-ab',
        metadata: {
          ...basePrompt.metadata,
          tags: [...(basePrompt.metadata?.tags || []), 'ab-test', 'variant-b'],
          parentPrompt: basePrompt.name,
          experimentName: 'step-by-step-test'
        }
      }
    ];

    // Create the variation prompts
    for (const variation of variations) {
      const existingVariation = await Prompt.findOne({ name: variation.name });
      if (!existingVariation) {
        const promptData = {
          ...basePrompt.toObject(),
          ...variation,
          _id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          isActive: false // Start inactive for A/B testing
        };
        
        const prompt = new Prompt(promptData);
        await prompt.save();
        logger.info(`Created prompt variation: ${variation.name}`);
      } else {
        logger.debug(`Variation ${variation.name} already exists`);
      }
    }

  } catch (error) {
    logger.error('Error seeding prompt variations:', error);
    throw error;
  }
}

/**
 * Seed sample version history
 */
export async function seedVersionHistory(): Promise<void> {
  try {
    // Find some prompts to create version history for
    const prompts = await Prompt.find({ isActive: true }).limit(3);

    for (const prompt of prompts) {
      // Create a few historical versions
      const versions = [
        {
          ...prompt.toObject(),
          _id: undefined,
          name: `${prompt.name}-v0.9`,
          version: '0.9.0',
          isActive: false,
          template: prompt.template.replace('detailed', 'basic'),
          metadata: {
            ...prompt.metadata,
            tags: [...(prompt.metadata?.tags || []), 'historical'],
            deprecatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        },
        {
          ...prompt.toObject(),
          _id: undefined,
          name: `${prompt.name}-v0.8`,
          version: '0.8.0',
          isActive: false,
          template: prompt.template.replace('specialist', 'assistant'),
          metadata: {
            ...prompt.metadata,
            tags: [...(prompt.metadata?.tags || []), 'historical'],
            deprecatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
          }
        }
      ];

      for (const version of versions) {
        const existing = await Prompt.findOne({ name: version.name });
        if (!existing) {
          const versionPrompt = new Prompt(version);
          await versionPrompt.save();
          logger.info(`Created version history: ${version.name}`);
        }
      }
    }

  } catch (error) {
    logger.error('Error seeding version history:', error);
    throw error;
  }
}

/**
 * Get sample data statistics
 */
export async function getSampleDataStats(): Promise<{
  testResults: number;
  metricsRecords: number;
  promptVariations: number;
  versionHistory: number;
}> {
  try {
    const testResults = await TestResult.countDocuments({ testCaseId: null });
    const metricsRecords = await PromptMetrics.countDocuments();
    const promptVariations = await Prompt.countDocuments({ 
      'metadata.tags': 'ab-test' 
    });
    const versionHistory = await Prompt.countDocuments({ 
      'metadata.tags': 'historical' 
    });

    return {
      testResults,
      metricsRecords,
      promptVariations,
      versionHistory
    };
  } catch (error) {
    logger.error('Error getting sample data stats:', error);
    throw error;
  }
}

/**
 * Clean up sample data
 */
export async function cleanupSampleData(): Promise<void> {
  try {
    // Delete sample test results (those without testCaseId)
    const testResultsDeleted = await TestResult.deleteMany({ testCaseId: null });
    logger.info(`Deleted ${testResultsDeleted.deletedCount} sample test results`);

    // Delete sample metrics older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const metricsDeleted = await PromptMetrics.deleteMany({
      date: { $lt: ninetyDaysAgo },
      'metadata.environment': 'development'
    });
    logger.info(`Deleted ${metricsDeleted.deletedCount} old sample metrics`);

    // Delete inactive prompt variations
    const variationsDeleted = await Prompt.deleteMany({
      isActive: false,
      'metadata.tags': 'ab-test'
    });
    logger.info(`Deleted ${variationsDeleted.deletedCount} inactive prompt variations`);

  } catch (error) {
    logger.error('Error cleaning up sample data:', error);
    throw error;
  }
}