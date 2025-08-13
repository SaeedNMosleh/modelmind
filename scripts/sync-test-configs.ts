#!/usr/bin/env npx tsx

import { promises as fs } from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/database/connection';
import { SimpleTestCase } from '@/lib/database/models/SimpleTestCase';
import { generatePromptFooYAML } from '@/lib/test-case-generator/config-generator';

const CONFIGS_DIR = '.promptfoo/configs';

interface SyncStats {
  total: number;
  synced: number;
  skipped: number;
  errors: number;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateFileName(promptId: string, version: string, createdAt: Date): string {
  const agent = promptId.split('-')[0] || 'unknown';
  const operation = promptId.split('-')[1] || 'test';
  const date = formatDate(createdAt);
  
  return `testcase-${agent}-${operation}-${date}.yaml`;
}

async function ensureConfigsDirectory(): Promise<void> {
  try {
    await fs.access(CONFIGS_DIR);
    console.log(`✓ Directory ${CONFIGS_DIR} exists`);
  } catch {
    await fs.mkdir(CONFIGS_DIR, { recursive: true });
    console.log(`✓ Created directory ${CONFIGS_DIR}`);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function syncTestCase(testCase: any): Promise<'synced' | 'skipped' | 'error'> {
  try {
    const fileName = generateFileName(testCase.promptId, testCase.version, testCase.createdAt);
    const filePath = path.join(CONFIGS_DIR, fileName);

    if (await fileExists(filePath)) {
      console.log(`- Skipping ${fileName} (already exists)`);
      return 'skipped';
    }

    const config = {
      promptId: testCase.promptId,
      version: testCase.version,
      variables: testCase.variables || {},
      testParameters: testCase.testParameters || {}
    };

    const yamlContent = generatePromptFooYAML(config);
    await fs.writeFile(filePath, yamlContent, 'utf8');

    console.log(`✓ Synced ${fileName}`);
    return 'synced';
  } catch (error) {
    console.error(`✗ Error syncing test case ${testCase._id}:`, error);
    return 'error';
  }
}

async function main(): Promise<void> {
  console.log('🔄 Starting test config sync...\n');

  const stats: SyncStats = {
    total: 0,
    synced: 0,
    skipped: 0,
    errors: 0
  };

  try {
    console.log('📡 Connecting to database...');
    await connectToDatabase();
    console.log('✓ Connected to database\n');

    await ensureConfigsDirectory();
    console.log('');

    console.log('📊 Fetching test cases from database...');
    const testCases = await SimpleTestCase.find({}).sort({ createdAt: -1 });
    stats.total = testCases.length;
    
    console.log(`✓ Found ${stats.total} test cases\n`);

    if (stats.total === 0) {
      console.log('ℹ️  No test cases found to sync');
      return;
    }

    console.log('🔄 Syncing test cases...');
    
    for (const testCase of testCases) {
      const result = await syncTestCase(testCase);
      stats[result]++;
    }

    console.log('\n📋 Sync Summary:');
    console.log(`   Total test cases: ${stats.total}`);
    console.log(`   ✓ Synced: ${stats.synced}`);
    console.log(`   - Skipped: ${stats.skipped}`);
    console.log(`   ✗ Errors: ${stats.errors}`);

    if (stats.synced > 0) {
      console.log(`\n✅ Sync completed successfully! ${stats.synced} new config files created.`);
    } else if (stats.skipped === stats.total) {
      console.log('\n✅ All test cases already synced, no new files created.');
    } else {
      console.log('\n⚠️  Sync completed with some issues. Check error messages above.');
    }

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as syncTestConfigs };