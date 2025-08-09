import { connectToDatabase, TestResult, PromptMetrics } from '@/lib/database';
import {
  PromptFooExecutionResult,
  TestExecutionOptions
} from './types';

// Interfaces to help with type checking
interface PromptFooResultSummary {
  numTests: number;
  stats: {
    successes: number;
    failures: number;
  };
}

interface PromptFooResultObject {
  results: unknown[];
  summary: PromptFooResultSummary;
  version?: number;
}
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('result-parser');

export class TestResultParser {
  async parseAndStore(
    promptId: string,
    promptVersion: string,
    testCaseIds: string[],
    promptFooResult: PromptFooExecutionResult,
    options: TestExecutionOptions = {}
  ): Promise<string[]> {
    await connectToDatabase();
    
    const environment = options.environment || 'development';
    const storedResultIds: string[] = [];

    try {
      for (let i = 0; i < promptFooResult.results.length; i++) {
        const result = promptFooResult.results[i];
        const testCaseId = testCaseIds[i] || testCaseIds[0]; // Fallback to first test case if mismatch

        const testResult = TestResult.createFromPromptFoo(
          testCaseId,
          promptId,
          promptVersion,
          result as PromptFooExecutionResult['results'][number],
          environment
        );

        const savedResult = await testResult.save();
        storedResultIds.push(savedResult._id.toString());

        logger.debug({
          testResultId: savedResult._id,
          testCaseId,
          promptId,
          success: result.success,
          score: result.score
        }, 'Stored test result');
      }

      if (options.saveResults !== false) {
        await this.updatePromptMetrics(promptId, promptVersion, environment);
      }

      logger.info({
        promptId,
        promptVersion,
        environment,
        resultsStored: storedResultIds.length,
        totalTests: promptFooResult.summary.numTests,
        successRate: promptFooResult.summary.stats.successes / promptFooResult.summary.numTests
      }, 'Parsed and stored PromptFoo results');

      return storedResultIds;

    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        error: errorMessage,
        promptId,
        promptVersion,
        resultCount: promptFooResult.results.length
      }, 'Failed to parse and store results');
      throw error;
    }
  }

  private async updatePromptMetrics(
    promptId: string,
    promptVersion: string,
    environment: 'production' | 'development'
  ): Promise<void> {
    try {
      const periods: Array<'hour' | 'day' | 'week' | 'month'> = ['hour', 'day', 'week', 'month'];
      const now = new Date();

      for (const period of periods) {
        await PromptMetrics.createFromTestResults(
          promptId,
          promptVersion,
          period,
          now,
          environment
        );
      }

      logger.debug({
        promptId,
        promptVersion,
        environment
      }, 'Updated prompt metrics');

    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn({
        error: errorMessage,
        promptId,
        promptVersion,
        environment
      }, 'Failed to update prompt metrics');
    }
  }

  extractSummaryMetrics(result: PromptFooExecutionResult) {
    const {
      numTests,
      stats: { successes, failures, tokenUsage, cost }
    } = result.summary;

    const successRate = numTests > 0 ? successes / numTests : 0;
    const averageScore = result.results.length > 0 
      ? result.results.reduce((sum, r) => sum + r.score, 0) / result.results.length 
      : 0;
    
    const averageLatency = result.results.length > 0
      ? result.results.reduce((sum, r) => sum + r.response.latencyMs, 0) / result.results.length
      : 0;

    return {
      totalTests: numTests,
      successfulTests: successes,
      failedTests: failures, 
      successRate,
      averageScore,
      averageLatencyMs: averageLatency,
      totalTokensUsed: tokenUsage.total,
      totalCost: cost,
      tokenBreakdown: {
        prompt: tokenUsage.prompt,
        completion: tokenUsage.completion
      }
    };
  }

  validatePromptFooResult(result: unknown): result is PromptFooExecutionResult {
    if (!result || typeof result !== 'object' || result === null) {
      return false;
    }

    const resultObj = result as Partial<PromptFooResultObject>;
    
    // Check if results array exists
    if (!Array.isArray(resultObj.results)) {
      return false;
    }
    
    // Check if summary exists and has the right structure
    const summary = resultObj.summary;
    if (!summary || typeof summary !== 'object') {
      return false;
    }
    
    // Check if summary has numTests as a number
    if (typeof summary.numTests !== 'number') {
      return false;
    }
    
    // Check if stats exists and has the right structure
    const stats = summary.stats;
    if (!stats || typeof stats !== 'object') {
      return false;
    }
    
    // Check if stats has successes and failures as numbers
    if (typeof stats.successes !== 'number' || typeof stats.failures !== 'number') {
      return false;
    }
    
    return true;
  }

  extractTestFailures(result: PromptFooExecutionResult): Array<{
    testIndex: number;
    testVars: Record<string, unknown>;
    error: string;
    failedAssertions: Array<{
      type: string;
      reason: string;
      score: number;
    }>;
  }> {
    return result.results
      .map((testResult, index) => {
        if (testResult.success) return null;

        const failedAssertions = testResult.gradingResult ? [{
          type: testResult.gradingResult.assertion?.type || 'unknown',
          reason: testResult.gradingResult.reason,
          score: testResult.gradingResult.score
        }] : [];

        return {
          testIndex: index,
          testVars: testResult.vars,
          error: testResult.response.output || 'Unknown error',
          failedAssertions
        };
      })
      .filter(Boolean) as Array<{
        testIndex: number;
        testVars: Record<string, unknown>;
        error: string;
        failedAssertions: Array<{
          type: string;
          reason: string;
          score: number;
        }>;
      }>;
  }

  generateTestReport(result: PromptFooExecutionResult): {
    summary: ReturnType<TestResultParser['extractSummaryMetrics']>;
    failures: ReturnType<TestResultParser['extractTestFailures']>;
    recommendations: string[];
  } {
    const summary = this.extractSummaryMetrics(result);
    const failures = this.extractTestFailures(result);
    const recommendations: string[] = [];

    // Generate recommendations based on results
    if (summary.successRate < 0.8) {
      recommendations.push('Consider revising the prompt template to improve success rate');
    }

    if (summary.averageScore < 0.7) {
      recommendations.push('Review test assertions to ensure they align with expected outputs');
    }

    if (summary.averageLatencyMs > 10000) {
      recommendations.push('Consider optimizing the prompt to reduce response time');
    }

    if (failures.length > 0) {
      const commonFailureTypes = failures.reduce((acc, failure) => {
        failure.failedAssertions.forEach(assertion => {
          acc[assertion.type] = (acc[assertion.type] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      const mostCommonFailure = Object.entries(commonFailureTypes)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostCommonFailure) {
        recommendations.push(`Address common failure type: ${mostCommonFailure[0]} (${mostCommonFailure[1]} occurrences)`);
      }
    }

    if (summary.totalCost > 1.0) {
      recommendations.push('Consider using a more cost-effective model or optimizing prompt length');
    }

    return {
      summary,
      failures,
      recommendations
    };
  }

  async bulkStoreResults(
    results: Array<{
      promptId: string;
      promptVersion: string;
      testCaseIds: string[];
      promptFooResult: PromptFooExecutionResult;
      options?: TestExecutionOptions;
    }>
  ): Promise<Array<{ promptId: string; resultIds: string[]; error?: string }>> {
    const responses: Array<{ promptId: string; resultIds: string[]; error?: string }> = [];

    for (const resultData of results) {
      try {
        const resultIds = await this.parseAndStore(
          resultData.promptId,
          resultData.promptVersion,
          resultData.testCaseIds,
          resultData.promptFooResult,
          resultData.options
        );

        responses.push({
          promptId: resultData.promptId,
          resultIds
        });
      } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        responses.push({
          promptId: resultData.promptId,
          resultIds: [],
          error: errorMessage
        });
      }
    }

    return responses;
  }
}

export const testResultParser = new TestResultParser();