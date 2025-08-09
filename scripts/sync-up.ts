#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { resolve, basename, extname } from 'path';
import { connectToDatabase, Prompt } from '@/lib/database';
import { IPrompt } from '@/lib/database/types';
import { testResultParser } from '@/lib/testing/result-parser';
import { createEnhancedLogger } from '@/lib/utils/consola-logger';
import { PromptFooExecutionResult } from '@/lib/testing/types';

const logger = createEnhancedLogger('sync-up');

interface SyncUpSummary {
  totalFiles: number;
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function syncUp() {
  const summary: SyncUpSummary = {
    totalFiles: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    const projectRoot = resolve(__dirname, '..');
    const resultsDir = resolve(projectRoot, '.promptfoo', 'results');
    const processedDir = resolve(resultsDir, 'processed');
    
    // Ensure processed directory exists
    await fs.mkdir(processedDir, { recursive: true });
    
    logger.info('Connecting to database...');
    await connectToDatabase();
    
    logger.info('Scanning for result files...');
    
    // Read all JSON files in results directory
    const files = await fs.readdir(resultsDir);
    const jsonFiles = files.filter(file => 
      extname(file) === '.json' && 
      file !== '.keep' &&
      !file.startsWith('processed_')
    );
    
    summary.totalFiles = jsonFiles.length;
    logger.info(`Found ${jsonFiles.length} result files`);
    
    if (jsonFiles.length === 0) {
      logger.info('No result files to process');
      return;
    }
    
    for (const filename of jsonFiles) {
      try {
        logger.info(`Processing: ${filename}`);
        
        const filepath = resolve(resultsDir, filename);
        const fileContent = await fs.readFile(filepath, 'utf8');
        
        // Parse JSON result
        let resultData: PromptFooExecutionResult;
        try {
          resultData = JSON.parse(fileContent);
        } catch (parseError) {
          throw new Error(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
        
        // Validate result structure
        if (!testResultParser.validatePromptFooResult(resultData)) {
          throw new Error('Invalid PromptFoo result structure');
        }
        
        // Extract prompt info from filename
        // Expected format: {agentType}-{operation}-v{version}.json or similar
        const baseName = basename(filename, '.json');
        const promptInfo = parseFilename(baseName);
        
        if (!promptInfo) {
          throw new Error(`Cannot parse prompt info from filename: ${filename}`);
        }
        
        // Find matching prompt in database
        const prompt = await findMatchingPrompt(promptInfo);
        
        if (!prompt) {
          throw new Error(`No matching prompt found for: ${JSON.stringify(promptInfo)}`);
        }
        
        logger.info(`Matched to prompt: ${prompt.name} (${prompt._id})`);
        
        // Get test case IDs from the results (approximate mapping)
        const testCaseIds = resultData.results.map((_, index) => 
          `test_case_${prompt._id}_${index}`
        );
        
        // Parse and store results
        await testResultParser.parseAndStore(
          prompt._id.toString(),
          prompt.primaryVersion,
          testCaseIds,
          resultData,
          {
            environment: 'development',
            provider: 'openai',
            model: 'gpt-4'
          }
        );
        
        // Move processed file
        const processedPath = resolve(processedDir, `processed_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}_${filename}`);
        await fs.rename(filepath, processedPath);
        
        logger.info(`✅ Processed and moved: ${filename}`);
        summary.processed++;
        
      } catch (error) {
        const errorMsg = `Failed to process ${filename}: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        summary.errors.push(errorMsg);
        summary.failed++;
        
        // Move failed file to processed with error prefix
        try {
          const failedPath = resolve(processedDir, `error_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}_${filename}`);
          await fs.rename(resolve(resultsDir, filename), failedPath);
        } catch (moveError) {
          logger.error(`Failed to move error file: ${moveError}`);
        }
      }
    }
    
    // Log summary
    logger.info('=== Sync Up Summary ===');
    logger.info(`Total files found: ${summary.totalFiles}`);
    logger.info(`Successfully processed: ${summary.processed}`);
    logger.info(`Failed: ${summary.failed}`);
    logger.info(`Skipped: ${summary.skipped}`);
    
    if (summary.errors.length > 0) {
      logger.warn('Errors encountered:');
      summary.errors.forEach(error => logger.warn(`  - ${error}`));
    }
    
    if (summary.processed > 0) {
      logger.info('✅ Sync up completed successfully!');
      logger.info('Results have been stored in the database and files moved to processed/');
    } else {
      logger.warn('No files were processed successfully.');
    }
    
  } catch (error) {
    logger.error('Sync up failed:', error);
    process.exit(1);
  }
}

interface PromptInfo {
  agentType?: string;
  operation?: string;
  version?: string;
}

function parseFilename(baseName: string): PromptInfo | null {
  // Try to parse filename patterns like:
  // generator-create-v1-0 -> { agentType: 'generator', operation: 'create', version: '1.0' }
  // analyzer-review-v2-1 -> { agentType: 'analyzer', operation: 'review', version: '2.1' }
  
  const parts = baseName.split('-');
  
  if (parts.length >= 3) {
    const agentType = parts[0];
    const operation = parts[1];
    
    // Find version part (starts with 'v')
    const versionIndex = parts.findIndex(part => part.startsWith('v'));
    if (versionIndex !== -1) {
      const versionParts = parts.slice(versionIndex);
      const version = versionParts.join('.').replace(/^v/, '').replace(/-/g, '.');
      
      return {
        agentType,
        operation,
        version
      };
    }
  }
  
  // Fallback: just try to extract what we can
  if (parts.length >= 2) {
    return {
      agentType: parts[0],
      operation: parts[1]
    };
  }
  
  return null;
}

interface MongoQuery {
  isActive: boolean;
  isDeleted: { $ne: boolean };
  agentType?: string;
  'metadata.operation'?: string;
}

async function findMatchingPrompt(info: PromptInfo): Promise<IPrompt | null> {
  try {
    const query: MongoQuery = {
      isActive: true,
      isDeleted: { $ne: true }
    };
    
    if (info.agentType) {
      query.agentType = info.agentType;
    }
    
    if (info.operation) {
      query['metadata.operation'] = info.operation;
    }
    
    const prompts = await Prompt.find(query);
    
    if (prompts.length === 0) {
      return null;
    }
    
    // If we have version info, try to find exact match
    if (info.version) {
      const exactMatch = prompts.find(p => p.primaryVersion === info.version);
      if (exactMatch) {
        return exactMatch;
      }
    }
    
    // Return first match if no exact version match
    return prompts[0];
    
  } catch (error) {
    logger.error('Error finding matching prompt:', error);
    return null;
  }
}

if (require.main === module) {
  syncUp();
}

export default syncUp;