import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TestExecutionJob, TestExecutionOptions, PromptFooExecutionResult } from './types';
import { configGenerator } from './config-generator';
import { IPrompt, ITestCase, PromptEnvironment } from '@/lib/database/types';
import pino from 'pino';

const logger = pino({ name: 'promptfoo-runner' });

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
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
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

    const { configPath } = await configGenerator.generateConfig(prompt, testCases, options);
    
    try {
      const result = await this.executePromptFoo(configPath, options);
      
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.metadata.completedTests = result.results.length;
      job.metadata.failedTests = result.results.filter(r => !r.success).length;
      
      this.activeJobs.set(job.id, job);
      this.jobResults.set(job.id, result);

      return result;
    } finally {
      await configGenerator.cleanupConfig(configPath);
    }
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

      const { configPath } = await configGenerator.generateConfig(prompt, testCases, options);
      
      const result = await this.executePromptFoo(configPath, options);
      
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.metadata.completedTests = result.results.length;
      job.metadata.failedTests = result.results.filter(r => !r.success).length;
      
      this.activeJobs.set(job.id, job);
      this.jobResults.set(job.id, result);

      await configGenerator.cleanupConfig(configPath);
      
      logger.info({
        jobId: job.id,
        promptId: job.promptId,
        totalTests: job.metadata.totalTests,
        completedTests: job.metadata.completedTests,
        failedTests: job.metadata.failedTests
      }, 'Async test execution completed');

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.activeJobs.set(job.id, job);
      
      logger.error({
        jobId: job.id,
        error: error.message,
        stack: error.stack
      }, 'Async test execution failed');
    }
  }

  private async executePromptFoo(
    configPath: string,
    options: TestExecutionOptions
  ): Promise<PromptFooExecutionResult> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(path.dirname(configPath), `output-${uuidv4()}.json`);
      const timeout = options.timeout || 120000; // 2 minutes default

      const args = [
        'eval',
        '--config', configPath,
        '--output', outputPath,
        '--verbose'
      ];

      logger.info({ configPath, outputPath, args }, 'Starting PromptFoo execution');

      const child = spawn('npx', ['promptfoo', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        logger.debug({ data: data.toString() }, 'PromptFoo stdout');
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        logger.debug({ data: data.toString() }, 'PromptFoo stderr');
      });

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`PromptFoo execution timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', async (code) => {
        clearTimeout(timeoutHandle);
        
        if (code !== 0) {
          logger.error({
            code,
            stdout,
            stderr,
            configPath
          }, 'PromptFoo execution failed');
          
          reject(new Error(`PromptFoo execution failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const resultContent = await fs.readFile(outputPath, 'utf8');
          const result: PromptFooExecutionResult = JSON.parse(resultContent);
          
          await fs.unlink(outputPath).catch(err => 
            logger.warn({ error: err, outputPath }, 'Failed to cleanup output file')
          );

          logger.info({
            configPath,
            testsExecuted: result.results.length,
            successfulTests: result.summary.stats.successes,
            failedTests: result.summary.stats.failures
          }, 'PromptFoo execution completed successfully');

          resolve(result);
        } catch (parseError: any) {
          logger.error({
            error: parseError.message,
            outputPath,
            stdout,
            stderr
          }, 'Failed to parse PromptFoo output');
          
          reject(new Error(`Failed to parse PromptFoo output: ${parseError.message}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        logger.error({ error: error.message }, 'Failed to spawn PromptFoo process');
        reject(new Error(`Failed to spawn PromptFoo process: ${error.message}`));
      });
    });
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
      } catch (error: any) {
        results.push({ 
          promptId: prompt._id.toString(), 
          jobId: '', 
          error: error.message 
        });
      }
    }

    return results;
  }
}

export const promptFooRunner = new PromptFooRunner();