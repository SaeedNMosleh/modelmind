import pino from 'pino';
import { 
  seedPromptsFromPipeline, 
  seedBaseSystemPrompt, 
  getSeedingStats,
  cleanupPrompts
} from './prompts';
import { 
  seedTestCases, 
  seedPerformanceTestCases,
  getTestCaseStats,
  cleanupTestCases
} from './test-cases';
import { 
  seedSampleTestResults, 
  seedSampleMetrics,
  seedPromptVariations,
  seedVersionHistory,
  getSampleDataStats,
  cleanupSampleData
} from './sample-data';

const logger = pino();

/**
 * Seeding options
 */
export interface SeedingOptions {
  includePrompts?: boolean;
  includeTestCases?: boolean;
  includeSampleData?: boolean;
  includePerformanceTests?: boolean;
  includeVariations?: boolean;
  includeVersionHistory?: boolean;
  skipExisting?: boolean;
  dryRun?: boolean;
}

/**
 * Default seeding options
 */
const defaultOptions: SeedingOptions = {
  includePrompts: true,
  includeTestCases: true,
  includeSampleData: true,
  includePerformanceTests: true,
  includeVariations: true,
  includeVersionHistory: true,
  skipExisting: true,
  dryRun: false
};

/**
 * Main seeding function that orchestrates all seeding operations
 */
export async function seedDatabase(options: SeedingOptions = {}): Promise<void> {
  const opts = { ...defaultOptions, ...options };
  
  logger.info('Starting database seeding', { options: opts });
  
  if (opts.dryRun) {
    logger.info('DRY RUN MODE - No changes will be made to the database');
  }

  try {
    const startTime = Date.now();

    // Phase 1: Seed prompts from AI pipeline
    if (opts.includePrompts) {
      logger.info('Phase 1: Seeding prompts from AI pipeline');
      if (!opts.dryRun) {
        await seedBaseSystemPrompt();
        await seedPromptsFromPipeline();
      }
      logger.info('✅ Prompts seeded successfully');
    }

    // Phase 2: Seed test cases
    if (opts.includeTestCases) {
      logger.info('Phase 2: Seeding test cases');
      if (!opts.dryRun) {
        await seedTestCases();
      }
      logger.info('✅ Test cases seeded successfully');
    }

    // Phase 3: Seed performance test cases
    if (opts.includePerformanceTests) {
      logger.info('Phase 3: Seeding performance test cases');
      if (!opts.dryRun) {
        await seedPerformanceTestCases();
      }
      logger.info('✅ Performance test cases seeded successfully');
    }

    // Phase 4: Seed sample data
    if (opts.includeSampleData) {
      logger.info('Phase 4: Seeding sample data');
      if (!opts.dryRun) {
        await seedSampleTestResults();
        await seedSampleMetrics();
      }
      logger.info('✅ Sample data seeded successfully');
    }

    // Phase 5: Seed prompt variations for A/B testing
    if (opts.includeVariations) {
      logger.info('Phase 5: Seeding prompt variations');
      if (!opts.dryRun) {
        await seedPromptVariations();
      }
      logger.info('✅ Prompt variations seeded successfully');
    }

    // Phase 6: Seed version history
    if (opts.includeVersionHistory) {
      logger.info('Phase 6: Seeding version history');
      if (!opts.dryRun) {
        await seedVersionHistory();
      }
      logger.info('✅ Version history seeded successfully');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.info('Database seeding completed successfully', {
      duration: `${duration}ms`,
      dryRun: opts.dryRun
    });

    // Print statistics
    if (!opts.dryRun) {
      await printSeedingStatistics();
    }

  } catch (error) {
    logger.error('Error during database seeding:', error);
    throw error;
  }
}

/**
 * Seed only prompts (useful for development)
 */
export async function seedPromptsOnly(): Promise<void> {
  await seedDatabase({
    includePrompts: true,
    includeTestCases: false,
    includeSampleData: false,
    includePerformanceTests: false,
    includeVariations: false,
    includeVersionHistory: false
  });
}

/**
 * Seed only test cases (useful after prompt changes)
 */
export async function seedTestCasesOnly(): Promise<void> {
  await seedDatabase({
    includePrompts: false,
    includeTestCases: true,
    includeSampleData: false,
    includePerformanceTests: true,
    includeVariations: false,
    includeVersionHistory: false
  });
}

/**
 * Seed everything except sample data (useful for production)
 */
export async function seedProduction(): Promise<void> {
  await seedDatabase({
    includePrompts: true,
    includeTestCases: true,
    includeSampleData: false,
    includePerformanceTests: true,
    includeVariations: false,
    includeVersionHistory: false
  });
}

/**
 * Print comprehensive seeding statistics
 */
export async function printSeedingStatistics(): Promise<void> {
  try {
    logger.info('=== SEEDING STATISTICS ===');

    const promptStats = await getSeedingStats();
    logger.info('Prompt Statistics:', promptStats);

    const testCaseStats = await getTestCaseStats();
    logger.info('Test Case Statistics:', testCaseStats);

    const sampleDataStats = await getSampleDataStats();
    logger.info('Sample Data Statistics:', sampleDataStats);

    logger.info('=== END STATISTICS ===');

  } catch (error) {
    logger.error('Error printing statistics:', error);
  }
}

/**
 * Clean up all seeded data (useful for testing)
 */
export async function cleanupAllSeedData(): Promise<void> {
  try {
    logger.info('Starting cleanup of all seeded data');

    await cleanupSampleData();
    await cleanupTestCases();
    await cleanupPrompts();

    logger.info('Cleanup completed successfully');

  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Validate seeded data integrity
 */
export async function validateSeedData(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check if prompts exist
    const promptStats = await getSeedingStats();
    if (promptStats.totalPrompts === 0) {
      issues.push('No prompts found in database');
    }
    if (promptStats.activePrompts === 0) {
      issues.push('No active prompts found');
    }

    // Check if each agent type has prompts
    const requiredAgents = ['GENERATOR', 'MODIFIER', 'ANALYZER', 'CLASSIFIER'];
    for (const agent of requiredAgents) {
      if (!promptStats.promptsByAgent[agent]) {
        issues.push(`No prompts found for agent type: ${agent}`);
      }
    }

    // Check if test cases exist
    const testCaseStats = await getTestCaseStats();
    if (testCaseStats.totalTestCases === 0) {
      issues.push('No test cases found in database');
    }

    // Check if functional test cases exist
    if (!testCaseStats.testCasesByCategory['functional']) {
      issues.push('No functional test cases found');
    }

    logger.info('Seed data validation completed', {
      isValid: issues.length === 0,
      issuesFound: issues.length
    });

    return {
      isValid: issues.length === 0,
      issues
    };

  } catch (error) {
    logger.error('Error validating seed data:', error);
    return {
      isValid: false,
      issues: [`Validation error: ${error.message}`]
    };
  }
}

/**
 * Export all seeding functions for individual use
 */
export {
  // Prompt seeding
  seedPromptsFromPipeline,
  seedBaseSystemPrompt,
  getSeedingStats,
  cleanupPrompts,
  
  // Test case seeding
  seedTestCases,
  seedPerformanceTestCases,
  getTestCaseStats,
  cleanupTestCases,
  
  // Sample data seeding
  seedSampleTestResults,
  seedSampleMetrics,
  seedPromptVariations,
  seedVersionHistory,
  getSampleDataStats,
  cleanupSampleData
};