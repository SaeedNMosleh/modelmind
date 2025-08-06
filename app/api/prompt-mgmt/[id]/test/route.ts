import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { TestCase } from '@/lib/database/models/testCase';
import { TestResult } from '@/lib/database/models/testResult';
import { TestExecutionRequest, TestExecutionResponse, ApiResponse } from '@/lib/prompt-mgmt/types';
import { PromptFooRunner } from '@/lib/testing/promptfoo-runner';
import { IPrompt, ITestCase, PromptEnvironment } from '@/lib/database/types';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('prompt-mgmt-test-api');
const promptFooRunner = new PromptFooRunner();

// Store for tracking running tests (in production, use Redis or similar)
const runningTests = new Map<string, TestExecutionResponse>();

// POST /api/prompt-mgmt/[id]/test - Execute tests for a prompt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: promptId } = await params;
    const testRequest: TestExecutionRequest = await request.json();
    
    // Validate prompt exists
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Get the version to test (default to primary version)
    const versionToTest = testRequest.version || prompt.primaryVersion;
    const version = prompt.versions.find(v => v.version === versionToTest);
    
    if (!version) {
      return NextResponse.json(
        { success: false, error: `Version ${versionToTest} not found` },
        { status: 404 }
      );
    }
    
    // Get test cases
    let testCases;
    if (testRequest.testCaseIds && testRequest.testCaseIds.length > 0) {
      testCases = await TestCase.find({ 
        _id: { $in: testRequest.testCaseIds },
        promptId: promptId
      });
    } else {
      testCases = await TestCase.find({ promptId: promptId, isActive: true });
    }
    
    if (testCases.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No test cases found for this prompt' },
        { status: 400 }
      );
    }
    
    // Generate execution ID
    const executionId = `test_${promptId}_${Date.now()}`;
    
    // Initialize test execution response
    const testExecution: TestExecutionResponse = {
      executionId,
      status: 'queued',
      progress: 0,
      results: []
    };
    
    runningTests.set(executionId, testExecution);
    
    // Start async test execution
    executeTestsAsync(executionId, prompt, version, testCases, testRequest.variables);
    
    const response: ApiResponse<TestExecutionResponse> = {
      success: true,
      data: testExecution,
      message: 'Test execution started'
    };
    
    return NextResponse.json(response, { status: 202 });
    
  } catch (error) {
    logger.error('Error starting test execution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start test execution' },
      { status: 500 }
    );
  }
}

// GET /api/prompt-mgmt/[id]/test?executionId=... - Get test execution status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promptId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const executionId = searchParams.get('executionId');
    
    if (!executionId) {
      // Return recent test results for the prompt
      await connectToDatabase();
      
      const recentResults = await TestResult.find({ 
        promptId: promptId 
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('testCaseId');
      
      const response: ApiResponse = {
        success: true,
        data: recentResults
      };
      
      return NextResponse.json(response);
    }
    
    // Return specific execution status
    const testExecution = runningTests.get(executionId);
    if (!testExecution) {
      return NextResponse.json(
        { success: false, error: 'Test execution not found' },
        { status: 404 }
      );
    }
    
    const response: ApiResponse<TestExecutionResponse> = {
      success: true,
      data: testExecution
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching test status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test status' },
      { status: 500 }
    );
  }
}

// Async function to execute tests
async function executeTestsAsync(
  executionId: string,
  prompt: IPrompt,
  version: { version: string; template: string },
  testCases: ITestCase[],
  variables?: Record<string, unknown>
) {
  const testExecution = runningTests.get(executionId);
  if (!testExecution) return;
  
  try {
    testExecution.status = 'running';
    testExecution.results = [];
    
    logger.info(`Starting test execution ${executionId} for prompt ${prompt.name}`);
    
    // Execute tests one by one
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        logger.info(`Executing test case: ${testCase.name}`);
        
        // Merge test case variables with provided variables
        const testVars = { ...testCase.vars, ...(variables || {}) };
        
        // Run the test using PromptFoo
        const { result } = await promptFooRunner.executeTests(
          prompt,
          [testCase],
          {
            provider: 'openai',
            saveResults: true,
            environment: PromptEnvironment.DEVELOPMENT
          }
        );
        
        if (!result) {
          throw new Error('Test execution failed to return results');
        }
        
        // Extract test result data from the first result (we only ran one test)
        const testRun = result.results[0];
        const tokenUsage = testRun.response.tokenUsage || { total: 0, prompt: 0, completion: 0 };
        const assertions = testRun.gradingResult ? [
          {
            type: testRun.gradingResult.assertion?.type || 'custom',
            passed: testRun.gradingResult.pass,
            score: testRun.gradingResult.score,
            reason: testRun.gradingResult.reason,
            expected: testRun.gradingResult.assertion?.value || '',
            actual: testRun.response.output
          }
        ] : [];
        
        // Create test result record
        const testResult = new TestResult({
          testCaseId: testCase._id,
          promptId: prompt._id,
          promptVersion: version.version,
          success: testRun.success,
          score: testRun.score || 0,
          latencyMs: testRun.response.latencyMs || 0,
          tokensUsed: tokenUsage.total,
          cost: testRun.response.cost || 0,
          response: testRun.response.output || '',
          error: testRun.gradingResult?.reason || '',
          assertions: assertions,
          metadata: {
            executionId,
            variables: testVars,
            provider: 'openai',
            model: 'gpt-4',
            timestamp: new Date(),
            environment: PromptEnvironment.DEVELOPMENT
          }
        });
        
        await testResult.save();
        
        // Update execution results
        testExecution.results!.push({
          testCaseId: testCase._id.toString(),
          testCaseName: testCase.name,
          status: testRun.success ? 'passed' : 'failed',
          score: testRun.score || 0,
          executionTime: testRun.response.latencyMs || 0,
          output: testRun.response.output,
          error: testRun.gradingResult?.reason || '',
          assertions: assertions,
          metadata: {
            provider: 'openai',
            model: 'gpt-4'
          }
        });
        
        // Update progress
        testExecution.progress = Math.round(((i + 1) / testCases.length) * 100);
        
        logger.info(`Test case ${testCase.name} completed: ${testRun.success ? 'PASSED' : 'FAILED'}`);
        
      } catch (testError) {
        logger.error(`Error executing test case ${testCase.name}:`, testError);
        
        // Record failed test
        testExecution.results!.push({
          testCaseId: testCase._id.toString(),
          testCaseName: testCase.name,
          status: 'error',
          score: 0,
          executionTime: 0,
          error: testError instanceof Error ? testError.message : 'Unknown error',
          assertions: []
        });
        
        // Create error test result record
        const errorResult = new TestResult({
          testCaseId: testCase._id,
          promptId: prompt._id,
          promptVersion: version.version,
          success: false,
          score: 0,
          latencyMs: 0,
          tokensUsed: 0,
          cost: 0,
          response: '',
          error: testError instanceof Error ? testError.message : 'Unknown error',
          assertions: [],
          metadata: { executionId, error: 'test_execution_error' }
        });
        
        await errorResult.save();
      }
    }
    
    testExecution.status = 'completed';
    testExecution.progress = 100;
    
    logger.info(`Test execution ${executionId} completed successfully`);
    
    // Clean up after 1 hour
    setTimeout(() => {
      runningTests.delete(executionId);
    }, 60 * 60 * 1000);
    
  } catch (error) {
    logger.error(`Test execution ${executionId} failed:`, error);
    
    testExecution.status = 'failed';
    testExecution.error = error instanceof Error ? error.message : 'Unknown error';
    
    // Clean up after 1 hour
    setTimeout(() => {
      runningTests.delete(executionId);
    }, 60 * 60 * 1000);
  }
}