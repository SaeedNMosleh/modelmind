import { v4 as uuidv4 } from 'uuid';
import { TestExecutionJob, TestExecutionOptions, PromptFooExecutionResult, PromptFooConfig } from './types';
import { configGenerator } from './config-generator';
import { IPrompt, ITestCase, PromptEnvironment, IPromptFooAssertion } from '@/lib/database/types';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

// Dynamically import promptfoo to avoid bundling issues in Next.js
let evaluate: any = null;

async function loadPromptFoo() {
  if (!evaluate && typeof window === 'undefined') {
    try {
      const promptfoo = await import('promptfoo');
      evaluate = promptfoo.evaluate;
    } catch (error) {
      console.warn('Failed to load promptfoo:', error);
      evaluate = null;
    }
  }
  return evaluate;
}

const logger = createEnhancedLogger('promptfoo-runner');

export class PromptFooRunner {
  private activeJobs = new Map<string, TestExecutionJob>();
  private jobResults = new Map<string, PromptFooExecutionResult>();

  async executeTests(
    prompt: IPrompt,
    testCases: ITestCase[],
    options: TestExecutionOptions = {}
  ): Promise<{ jobId: string; result?: PromptFooExecutionResult }> {
    const jobId = uuidv4();
    const job: TestExecutionJob = {
      id: jobId,
      promptId: prompt._id.toString(),
      testCaseIds: testCases.map(tc => tc._id.toString()),
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      resultIds: [],
      metadata: {
        totalTests: testCases.length,
        completedTests: 0,
        failedTests: 0,
        environment: options.environment || PromptEnvironment.DEVELOPMENT
      }
    };

    this.activeJobs.set(jobId, job);

    try {
      if (options.async) {
        this.runTestsAsync(job, prompt, testCases, options);
        return { jobId };
      } else {
        const result = await this.runTestsSync(job, prompt, testCases, options);
        return { jobId, result };
      }
    } catch (error: Error | unknown) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      this.activeJobs.set(jobId, job);
      throw error;
    }
  }

  private async runTestsSync(
    job: TestExecutionJob,
    prompt: IPrompt,
    testCases: ITestCase[],
    options: TestExecutionOptions
  ): Promise<PromptFooExecutionResult> {
    job.status = 'running';
    this.activeJobs.set(job.id, job);

    const { config } = await configGenerator.generateConfig(prompt, testCases, options);
    
    const result = await this.executePromptFoo(config, options, testCases);
    
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    job.metadata.completedTests = result.results.length;
    job.metadata.failedTests = result.results.filter(r => !r.success).length;
    
    this.activeJobs.set(job.id, job);
    this.jobResults.set(job.id, result);

    return result;
  }

  private async runTestsAsync(
    job: TestExecutionJob,
    prompt: IPrompt,
    testCases: ITestCase[],
    options: TestExecutionOptions
  ): Promise<void> {
    try {
      job.status = 'running';
      this.activeJobs.set(job.id, job);

      const { config } = await configGenerator.generateConfig(prompt, testCases, options);
      
      const result = await this.executePromptFoo(config, options, testCases);
      
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.metadata.completedTests = result.results.length;
      job.metadata.failedTests = result.results.filter(r => !r.success).length;
      
      this.activeJobs.set(job.id, job);
      this.jobResults.set(job.id, result);
      
      logger.info({
        jobId: job.id,
        promptId: job.promptId,
        totalTests: job.metadata.totalTests,
        completedTests: job.metadata.completedTests,
        failedTests: job.metadata.failedTests
      }, 'Async test execution completed');

    } catch (error: Error | unknown) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      this.activeJobs.set(job.id, job);
      
      logger.error({
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'Async test execution failed');
    }
  }

  private async executePromptFoo(
    config: PromptFooConfig,
    options: TestExecutionOptions,
    testCases: ITestCase[] = []
  ): Promise<PromptFooExecutionResult> {
    logger.info({ 
      promptCount: config.prompts.length,
      testCount: config.tests.length,
      providers: config.providers.map(p => p)
    }, 'Starting PromptFoo execution');

    // Load promptfoo dynamically
    const evaluateFunction = await loadPromptFoo();
    
    // Check if we're in development, promptfoo is not available, or explicitly disabled
    if (process.env.NODE_ENV === 'development' || !process.env.PROMPTFOO_ENABLED || !evaluateFunction) {
      if (!evaluateFunction) {
        logger.warn('PromptFoo is not available, using mock results');
      } else {
        logger.info('Skipping PromptFoo execution in development mode');
      }
      
      // Return mock results for development
      const mockResults = testCases.map((testCase, index) => {
        const success = Math.random() > 0.3; // 70% success rate for demo
        const score = Math.random();
        const latencyMs = Math.floor(Math.random() * 1000) + 200;
        const totalTokens = Math.floor(Math.random() * 300) + 150;
        const cost = (totalTokens / 1000) * 0.002; // Mock cost calculation
        
        const promptObj = config.prompts[0];
        const promptData = typeof promptObj === 'string' 
          ? { id: 'mock-prompt', template: promptObj }
          : { 
              id: promptObj.id || 'mock-prompt', 
              template: promptObj.content || promptObj.template || 'mock template' 
            };
        
        return {
          prompt: promptData,
          vars: testCase.vars || {},
          response: {
            output: `Mock response for test case ${index + 1}`,
            latencyMs,
            tokenUsage: {
              total: totalTokens,
              prompt: Math.floor(totalTokens * 0.7),
              completion: Math.floor(totalTokens * 0.3)
            },
            cost
          },
          success,
          score,
          namedScores: { overall: score },
          gradingResult: {
            pass: success,
            score,
            reason: success ? 'Mock success' : 'Mock failure',
            namedScores: { overall: score },
            tokensUsed: {
              total: totalTokens,
              prompt: Math.floor(totalTokens * 0.7),
              completion: Math.floor(totalTokens * 0.3)
            },
            assertion: testCase.assert?.[0] || null
          }
        };
      });

      const passedCount = mockResults.filter(r => r.success).length;
      const failedCount = mockResults.filter(r => !r.success).length;
      const totalTokens = mockResults.reduce((sum, r) => sum + (r.response.tokenUsage?.total || 0), 0);
      const totalCost = mockResults.reduce((sum, r) => sum + (r.response.cost || 0), 0);
      
      return {
        version: 1,
        results: mockResults,
        table: {
          head: ['Test', 'Success', 'Score'],
          body: mockResults.map((r, i) => [`Test ${i + 1}`, r.success ? 'Pass' : 'Fail', r.score.toFixed(2)])
        },
        summary: {
          version: 1,
          timestamp: new Date().toISOString(),
          numTests: mockResults.length,
          stats: {
            successes: passedCount,
            failures: failedCount,
            tokenUsage: {
              total: totalTokens,
              prompt: Math.floor(totalTokens * 0.7),
              completion: Math.floor(totalTokens * 0.3)
            },
            cost: totalCost
          }
        }
      };
    }

    try {
      const timeout = options.timeout || 120000; // 2 minutes default
      
      // Set up timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`PromptFoo execution timed out after ${timeout}ms`));
        }, timeout);
      });

      // Execute promptfoo with programmatic API
      if (!evaluateFunction) {
        throw new Error('PromptFoo is not available in this environment');
      }
      
      const executePromise = evaluateFunction(config, {
        maxConcurrency: options.maxConcurrency || 3,
        showProgressBar: false,
        repeat: 1,
        delay: 1000
      });

      const evalResult = await Promise.race([executePromise, timeoutPromise]) as {
        results?: Array<{
          prompt?: { id?: string; raw?: string; display?: string };
          vars?: Record<string, unknown>;
          response?: { 
            output?: string; 
            tokenUsage?: { total?: number; prompt?: number; completion?: number };
            cost?: number;
            latencyMs?: number;
            cached?: boolean;
          };
          success?: boolean;
          score?: number;
          namedScores?: Record<string, number>;
          gradingResult?: {
            pass?: boolean;
            score?: number;
            reason?: string;
            namedScores?: Record<string, number>;
            tokensUsed?: { total?: number; prompt?: number; completion?: number };
            assertion?: unknown;
          };
        }>;
        table?: { head?: string[]; body?: string[][] };
        stats?: {
          successes?: number;
          failures?: number;
          tokenUsage?: { total?: number; prompt?: number; completion?: number };
          cost?: number;
        };
      };

      // Transform the Eval object into our expected format
      const result: PromptFooExecutionResult = {
        version: 1,
        results: (evalResult.results || []).map((r) => ({
          prompt: {
            id: r.prompt?.id || 'unknown',
            template: r.prompt?.raw || r.prompt?.display || 'unknown'
          },
          vars: r.vars || {},
          response: {
            output: r.response?.output || '',
            tokenUsage: r.response?.tokenUsage ? {
              total: r.response.tokenUsage.total || 0,
              prompt: r.response.tokenUsage.prompt || 0,
              completion: r.response.tokenUsage.completion || 0
            } : undefined,
            cost: r.response?.cost,
            latencyMs: r.response?.latencyMs || 0,
            cached: r.response?.cached
          },
          success: r.success || false,
          score: r.score || 0,
          namedScores: r.namedScores || {},
          gradingResult: r.gradingResult ? {
            pass: r.gradingResult.pass || false,
            score: r.gradingResult.score || 0,
            reason: r.gradingResult.reason || '',
            namedScores: r.gradingResult.namedScores || {},
            tokensUsed: {
              total: r.gradingResult.tokensUsed?.total || 0,
              prompt: r.gradingResult.tokensUsed?.prompt || 0,
              completion: r.gradingResult.tokensUsed?.completion || 0
            },
            assertion: (r.gradingResult.assertion as IPromptFooAssertion) || null
          } : undefined
        })),
        table: {
          head: evalResult.table?.head || [],
          body: evalResult.table?.body || []
        },
        summary: {
          version: 1,
          timestamp: new Date().toISOString(),
          numTests: evalResult.results?.length || 0,
          stats: {
            successes: evalResult.stats?.successes || 0,
            failures: evalResult.stats?.failures || 0,
            tokenUsage: {
              total: evalResult.stats?.tokenUsage?.total || 0,
              prompt: evalResult.stats?.tokenUsage?.prompt || 0,
              completion: evalResult.stats?.tokenUsage?.completion || 0
            },
            cost: evalResult.stats?.cost || 0
          }
        }
      };

      logger.info({
        testsExecuted: result.results.length,
        successfulTests: result.summary.stats.successes,
        failedTests: result.summary.stats.failures,
        totalCost: result.summary.stats.cost,
        totalTokens: result.summary.stats.tokenUsage.total
      }, 'PromptFoo execution completed successfully');

      return result;
    } catch (error: Error | unknown) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'PromptFoo execution failed');
      
      throw new Error(`PromptFoo execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getJobStatus(jobId: string): TestExecutionJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  getJobResult(jobId: string): PromptFooExecutionResult | null {
    return this.jobResults.get(jobId) || null;
  }

  cleanupJob(jobId: string): void {
    this.activeJobs.delete(jobId);
    this.jobResults.delete(jobId);
  }

  getAllActiveJobs(): TestExecutionJob[] {
    return Array.from(this.activeJobs.values());
  }

  cleanupCompletedJobs(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        if (job.completedAt && job.completedAt < cutoffTime) {
          this.cleanupJob(jobId);
        }
      }
    }
    
    logger.info({ 
      olderThanHours,
      remainingJobs: this.activeJobs.size 
    }, 'Cleaned up old completed jobs');
  }

  async executeBatch(
    prompts: IPrompt[],
    testCasesMap: Map<string, ITestCase[]>,
    options: TestExecutionOptions = {}
  ): Promise<Array<{ promptId: string; jobId: string; error?: string }>> {
    const results: Array<{ promptId: string; jobId: string; error?: string }> = [];
    
    for (const prompt of prompts) {
      try {
        const testCases = testCasesMap.get(prompt._id.toString()) || [];
        const { jobId } = await this.executeTests(prompt, testCases, { 
          ...options, 
          async: true 
        });
        
        results.push({ promptId: prompt._id.toString(), jobId });
      } catch (error: Error | unknown) {
        results.push({ 
          promptId: prompt._id.toString(), 
          jobId: '', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return results;
  }
}

export const promptFooRunner = new PromptFooRunner();