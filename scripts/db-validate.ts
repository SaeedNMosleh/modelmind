#!/usr/bin/env tsx

import { disconnectFromDatabase } from '../lib/database/connection';
import { validationManager } from '../lib/scripts/validation-utils';
import pino from 'pino';

const logger = pino({ name: 'db-validate' });

/**
 * Validate all prompts and generate report
 */
async function validateDatabase() {
  try {
    console.log('🚀 Starting database validation...');
    console.log('🔍 Checking prompts, test cases, and data integrity...');
    
    // Run comprehensive validation
    const report = await validationManager.validateAllPrompts();
    
    // Display formatted report
    console.log('\\n' + validationManager.formatReport(report));
    
    // Return appropriate exit code
    if (!report.isValid) {
      console.log('\\n❌ Validation failed - critical errors must be fixed');
      return false;
    } else if (report.warnings > 0) {
      console.log('\\n⚠️  Validation passed with warnings - review recommended');
      return true;
    } else {
      console.log('\\n✅ All validations passed successfully!');
      return true;
    }
    
  } catch (error) {
    logger.error({ error }, 'Validation failed');
    console.error('❌ Validation failed:', (error as Error).message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const success = await validateDatabase();
    
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    logger.error({ error }, 'Validation script failed');
    console.error('❌ Validation script failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { validateDatabase };