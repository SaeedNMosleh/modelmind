import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt, TestCase, TestResult, IPrompt, IPromptVersion, ITestCase, ITestResult } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse
} from '@/lib/api/responses';
import { ObjectIdSchema } from '@/lib/api/validation/prompts';
import { promptFooRunner } from '@/lib/testing/promptfoo-runner';
import { testResultParser } from '@/lib/testing/result-parser';
import { TestComparisonResult, TestExecutionOptions } from '@/lib/testing/types';
import { PromptEnvironment } from '@/lib/database/types';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'prompt-comparison-test-api' });

// Extended TestExecutionOptions with comparison-specific fields
interface ComparisonTestExecutionOptions extends TestExecutionOptions {
  testCaseIds?: string[];
  useExistingResults?: boolean;
}

const ComparisonTestSchema = z.object({
  testCaseIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  environment: z.nativeEnum(PromptEnvironment).default(PromptEnvironment.DEVELOPMENT),
  provider: z.string().default('openai'),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8000).optional(),
  timeout: z.number().min(10000).max(300000).default(180000),
  saveResults: z.boolean().default(true),
  useExistingResults: z.boolean().default(true)
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id1: string; id2: string } }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const id1Validation = ObjectIdSchema.safeParse(params.id1);
    const id2Validation = ObjectIdSchema.safeParse(params.id2);
    
    if (!id1Validation.success || !id2Validation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    if (params.id1 === params.id2) {
      return createErrorResponse(
        'Cannot compare a prompt with itself',
        'SAME_PROMPT',
        400
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = ComparisonTestSchema.safeParse(body);
    
    if (!validation.success) {
      return createValidationErrorResponse(validation.error.errors);
    }

    const options: ComparisonTestExecutionOptions = {
      ...validation.data,
      async: false
    };

    // Get both prompts
    const [prompt1, prompt2] = await Promise.all([
      Prompt.findById(params.id1),
      Prompt.findById(params.id2)
    ]);
    
    if (!prompt1) {
      return createNotFoundResponse(`Prompt 1 (${params.id1})`);
    }

    if (!prompt2) {
      return createNotFoundResponse(`Prompt 2 (${params.id2})`);
    }

    const activeVersion1 = prompt1.getCurrentVersion();
    const activeVersion2 = prompt2.getCurrentVersion();
    
    if (!activeVersion1) {
      return createErrorResponse(
        `Prompt 1 (${prompt1.name}) has no active version`,
        'NO_ACTIVE_VERSION',
        400
      );
    }

    if (!activeVersion2) {
      return createErrorResponse(
        `Prompt 2 (${prompt2.name}) has no active version`,
        'NO_ACTIVE_VERSION',
        400
      );
    }

    // Get test cases - prioritize shared test cases for fair comparison
    let testCases;
    if (options.testCaseIds && options.testCaseIds.length > 0) {
      testCases = await TestCase.find({
        _id: { $in: options.testCaseIds },
        isActive: true
      });
    } else {
      // Find common test cases or use test cases from prompt1
      const [testCases1, testCases2] = await Promise.all([
        TestCase.find({ promptId: params.id1, isActive: true }).limit(10),
        TestCase.find({ promptId: params.id2, isActive: true }).limit(10)
      ]);

      // Try to find test cases with matching vars (indicating they test similar functionality)
      const commonTestCases = testCases1.filter(tc1 => 
        testCases2.some(tc2 => 
          JSON.stringify(tc1.vars) === JSON.stringify(tc2.vars)
        )
      );

      testCases = commonTestCases.length > 0 ? commonTestCases : testCases1;
    }

    if (testCases.length === 0) {
      return createErrorResponse(
        'No suitable test cases found for comparison',
        'NO_TEST_CASES',
        400
      );
    }

    logger.info({
      prompt1Id: params.id1,
      prompt2Id: params.id2,
      prompt1Name: prompt1.name,
      prompt2Name: prompt2.name,
      testCaseCount: testCases.length,
      useExistingResults: options.useExistingResults
    }, 'Starting prompt comparison test');

    let results1, results2;

    // Check for existing results if requested
    if (options.useExistingResults) {
      const [existingResults1, existingResults2] = await Promise.all([
        TestResult.find({
          promptId: params.id1,
          promptVersion: activeVersion1.version,
          testCaseId: { $in: testCases.map(tc => tc._id) },
          'metadata.environment': options.environment
        }).sort({ createdAt: -1 }).limit(testCases.length),
        TestResult.find({
          promptId: params.id2,
          promptVersion: activeVersion2.version,
          testCaseId: { $in: testCases.map(tc => tc._id) },
          'metadata.environment': options.environment
        }).sort({ createdAt: -1 }).limit(testCases.length)
      ]);

      const hasAllResults1 = existingResults1.length === testCases.length;
      const hasAllResults2 = existingResults2.length === testCases.length;

      if (hasAllResults1 && hasAllResults2) {
        logger.info({
          prompt1Id: params.id1,
          prompt2Id: params.id2,
          resultsFound: { prompt1: existingResults1.length, prompt2: existingResults2.length }
        }, 'Using existing test results for comparison');

        results1 = existingResults1;
        results2 = existingResults2;
      } else {
        logger.info({
          prompt1Id: params.id1,
          prompt2Id: params.id2,
          resultsFound: { prompt1: existingResults1.length, prompt2: existingResults2.length },
          requiredResults: testCases.length
        }, 'Insufficient existing results, running new tests');
      }
    }

    // Run tests if we don't have existing results
    if (!results1 || !results2) {
      const [execution1, execution2] = await Promise.all([
        promptFooRunner.executeTests(prompt1, testCases, options),
        promptFooRunner.executeTests(prompt2, testCases, options)
      ]);

      if (!execution1.result || !execution2.result) {
        return createErrorResponse(
          'One or both test executions failed',
          'EXECUTION_FAILED',
          500
        );
      }

      // Parse and store results
      const [resultIds1, resultIds2] = await Promise.all([
        testResultParser.parseAndStore(
          params.id1,
          activeVersion1.version,
          testCases.map(tc => tc._id.toString()),
          execution1.result,
          options
        ),
        testResultParser.parseAndStore(
          params.id2,
          activeVersion2.version,
          testCases.map(tc => tc._id.toString()),
          execution2.result,
          options
        )
      ]);

      // Get the stored results for comparison
      [results1, results2] = await Promise.all([
        TestResult.find({ _id: { $in: resultIds1 } }),
        TestResult.find({ _id: { $in: resultIds2 } })
      ]);
    }

    // Generate comparison
    const comparison = generateComparison(
      prompt1, prompt2, 
      activeVersion1, activeVersion2,
      testCases, results1, results2
    );

    logger.info({
      prompt1Id: params.id1,
      prompt2Id: params.id2,
      testCasesCompared: comparison.comparison.testCasesCompared,
      overallScoreDifference: comparison.comparison.overallScoreDifference,
      winner: comparison.comparison.overallScoreDifference > 0 ? 'prompt2' : 
              comparison.comparison.overallScoreDifference < 0 ? 'prompt1' : 'tie'
    }, 'Completed prompt comparison');

    return createSuccessResponse(comparison);
    
  } catch (error: unknown) {
    const err = error as Error;
    logger.error({
      prompt1Id: params.id1,
      prompt2Id: params.id2,
      error: err.message,
      stack: err.stack
    }, 'Prompt comparison test failed');
    
    return handleApiError(error);
  }
}

function generateComparison(
  prompt1: IPrompt, prompt2: IPrompt,
  version1: IPromptVersion, version2: IPromptVersion,
  testCases: ITestCase[], results1: ITestResult[], results2: ITestResult[]
): TestComparisonResult {
  const comparison: TestComparisonResult = {
    prompt1: {
      id: prompt1._id.toString(),
      name: prompt1.name,
      version: version1.version
    },
    prompt2: {
      id: prompt2._id.toString(),
      name: prompt2.name,
      version: version2.version
    },
    comparison: {
      testCasesCompared: testCases.length,
      overallScoreDifference: 0,
      performanceDifference: {
        averageLatencyMs: 0,
        totalCostDifference: 0,
        tokenUsageDifference: 0
      },
      qualityDifference: {
        successRateDifference: 0,
        averageScoreDifference: 0
      },
      detailedResults: []
    }
  };

  let totalScoreDiff = 0;
  let totalLatencyDiff = 0;
  let totalCostDiff = 0;
  let totalTokenDiff = 0;
  let successCount1 = 0;
  let successCount2 = 0;
  let totalScore1 = 0;
  let totalScore2 = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result1 = results1[i];
    const result2 = results2[i];

    if (!result1 || !result2) continue;

    const scoreDiff = result2.score - result1.score;
    const latencyDiff = result2.latencyMs - result1.latencyMs;
    const costDiff = result2.cost - result1.cost;
    const tokenDiff = result2.tokensUsed - result1.tokensUsed;

    totalScoreDiff += scoreDiff;
    totalLatencyDiff += latencyDiff;
    totalCostDiff += costDiff;
    totalTokenDiff += tokenDiff;

    if (result1.success) successCount1++;
    if (result2.success) successCount2++;
    
    totalScore1 += result1.score;
    totalScore2 += result2.score;

    let improvement: 'better' | 'worse' | 'same';
    if (Math.abs(scoreDiff) < 0.01 && result1.success === result2.success) {
      improvement = 'same';
    } else if (scoreDiff > 0 || (!result1.success && result2.success)) {
      improvement = 'better';
    } else {
      improvement = 'worse';
    }

    comparison.comparison.detailedResults.push({
      testCaseId: testCase._id.toString(),
      testCaseName: testCase.name,
      prompt1Result: {
        success: result1.success,
        score: result1.score,
        latencyMs: result1.latencyMs,
        cost: result1.cost
      },
      prompt2Result: {
        success: result2.success,
        score: result2.score,
        latencyMs: result2.latencyMs,
        cost: result2.cost
      },
      improvement
    });
  }

  // Calculate aggregate differences
  const testCount = testCases.length;
  comparison.comparison.overallScoreDifference = totalScoreDiff / testCount;
  comparison.comparison.performanceDifference.averageLatencyMs = totalLatencyDiff / testCount;
  comparison.comparison.performanceDifference.totalCostDifference = totalCostDiff;
  comparison.comparison.performanceDifference.tokenUsageDifference = totalTokenDiff;
  
  comparison.comparison.qualityDifference.successRateDifference = 
    (successCount2 / testCount) - (successCount1 / testCount);
  comparison.comparison.qualityDifference.averageScoreDifference = 
    (totalScore2 / testCount) - (totalScore1 / testCount);

  return comparison;
}