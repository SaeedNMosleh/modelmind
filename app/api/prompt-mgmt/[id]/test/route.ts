import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Prompt } from '@/lib/database/models/prompt';
import { TestCase } from '@/lib/database/models/testCase';
import { TestResult } from '@/lib/database/models/testResult';
import { TestExecutionRequest, TestExecutionResponse, ApiResponse } from '@/lib/prompt-mgmt/types';
import { runPromptTest } from '@/lib/testing/promptfoo-runner';
import pino from 'pino';

const logger = pino();

// Store for tracking running tests (in production, use Redis or similar)
const runningTests = new Map<string, TestExecutionResponse>();

// POST /api/prompt-mgmt/[id]/test - Execute tests for a prompt
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const promptId = params.id;
    const testRequest: TestExecutionRequest = await request.json();
    
    // Validate prompt exists
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Get the version to test (default to current version)
    const versionToTest = testRequest.version || prompt.currentVersion;
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
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const executionId = searchParams.get('executionId');
    
    if (!executionId) {
      // Return recent test results for the prompt
      await connectToDatabase();
      
      const recentResults = await TestResult.find({ 
        promptId: params.id 
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
  prompt: any,
  version: any,
  testCases: any[],
  variables?: Record<string, any>
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
        const testVars = { ...testCase.vars, ...variables };
        
        // Run the test using PromptFoo
        const result = await runPromptTest({
          template: version.template,
          variables: testVars,
          assertions: testCase.assert
        });
        
        // Create test result record
        const testResult = new TestResult({
          testCaseId: testCase._id,
          promptId: prompt._id,
          promptVersion: version.version,
          success: result.success,
          score: result.score || 0,
          latencyMs: result.latencyMs || 0,
          tokensUsed: result.tokensUsed || 0,
          cost: result.cost || 0,
          response: result.output || '',
          error: result.error,
          assertions: result.assertions || [],
          metadata: {
            executionId,
            variables: testVars,
            ...result.metadata
          }
        });
        
        await testResult.save();
        
        // Update execution results
        testExecution.results!.push({
          testCaseId: testCase._id.toString(),
          testCaseName: testCase.name,
          status: result.success ? 'passed' : 'failed',
          score: result.score || 0,
          executionTime: result.latencyMs || 0,
          output: result.output,
          error: result.error,
          assertions: result.assertions || [],
          metadata: result.metadata
        });
        
        // Update progress
        testExecution.progress = Math.round(((i + 1) / testCases.length) * 100);
        
        logger.info(`Test case ${testCase.name} completed: ${result.success ? 'PASSED' : 'FAILED'}`);
        
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