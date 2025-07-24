#!/usr/bin/env ts-node

import pino from 'pino';
import { extractAllPrompts, getBaseSystemPrompt } from '../lib/migration/extractor';
import { convertAllExtractedPrompts } from '../lib/migration/converter-simple';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
});

async function testExtraction() {
  try {
    logger.info('Testing prompt extraction from AI pipeline...');

    // Test extraction
    const extractedPrompts = extractAllPrompts();
    logger.info(`✅ Extracted ${extractedPrompts.length} prompts from AI pipeline`);

    // Test conversion
    const convertedPrompts = convertAllExtractedPrompts(extractedPrompts);
    logger.info(`✅ Converted ${convertedPrompts.length} prompts to database format`);

    // Test base system prompt
    const basePrompt = getBaseSystemPrompt();
    logger.info(`✅ Base system prompt: "${basePrompt}"`);

    // Log prompt details
    for (const prompt of convertedPrompts) {
      logger.info(`Prompt: ${prompt.name} (${prompt.agentType}) - ${prompt.operation}`);
    }

    logger.info('🎉 All tests passed! The seeder should work correctly.');

  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testExtraction();
}