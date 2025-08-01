#!/usr/bin/env node

/**
 * Database Migration Script: Convert currentVersion to primaryVersion
 * 
 * This script migrates the existing database schema from using 'currentVersion' 
 * to using 'primaryVersion' for better semantic clarity.
 * 
 * Changes:
 * - Renames 'currentVersion' field to 'primaryVersion' in all prompt documents
 * - Removes the 'isActive' field from version objects (no longer needed)
 * 
 * Usage: node scripts/migrate-current-to-primary.js
 */

//const { MongoClient } = require('mongodb');
//require('dotenv').config();

import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config();


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/modelmind';
console.log('🔥 DEBUG: Process is started');
console.log('🔥 DEBUG: Node version:', process.version);
console.log('🔥 DEBUG: Current working directory:', process.cwd());
console.log('🔥 DEBUG: Script file path:', import.meta.url);
console.log('🔥 DEBUG: Command line args:', process.argv);
console.log('🔥 DEBUG: MONGODB_URI:', MONGODB_URI);
console.log('🔥 DEBUG: NODE_ENV:', process.env.NODE_ENV);

async function migrateDatabase() {
  console.log('🔥 DEBUG: migrateDatabase function called');
  try {
    console.log('🔗 Connecting to MongoDB with Mongoose...');
    console.log('🔥 DEBUG: About to connect to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, { dbName: 'test' });
    console.log('🔥 DEBUG: MongoDB connection successful');

    // Define a minimal Prompt schema for migration
    const promptSchema = new mongoose.Schema({}, { strict: false, collection: 'prompts' });
    const Prompt = mongoose.model('Prompt', promptSchema);
    
    console.log('📊 Analyzing current database structure...');
    
    // Debug: Check what databases and collections exist
    console.log('🔥 DEBUG: Checking available databases and collections...');
    const admin = mongoose.connection.db.admin();
    try {
      const databases = await admin.listDatabases();
      console.log('🔥 DEBUG: Available databases:', databases.databases.map(db => db.name));
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('🔥 DEBUG: Collections in current database:', collections.map(c => c.name));
      
      // Check if there are any documents in the prompts collection
      const promptCount = await mongoose.connection.db.collection('prompts').countDocuments();
      console.log('🔥 DEBUG: Documents in prompts collection:', promptCount);
      
    } catch (dbError) {
      console.log('🔥 DEBUG: Error checking database structure:', dbError.message);
    }
    
    // Check current structure
    const samplePrompt = await Prompt.findOne({}).lean();
    console.log('🔥 DEBUG: Sample prompt found:', !!samplePrompt);
    if (samplePrompt) {
      console.log('🔥 DEBUG: Using collection: prompts');
      console.log('🔥 DEBUG: Sample prompt keys:', Object.keys(samplePrompt));
      console.log('🔥 DEBUG: Has currentVersion:', !!samplePrompt.currentVersion, '- Value:', samplePrompt.currentVersion);
      console.log('🔥 DEBUG: Has primaryVersion:', !!samplePrompt.primaryVersion, '- Value:', samplePrompt.primaryVersion);
    }
    
    if (!samplePrompt) {
      console.log('📝 No prompts found in database. Migration not needed.');
      return;
    }
    
    if (samplePrompt.primaryVersion) {
      console.log('✅ Database already migrated. primaryVersion field exists.');
      console.log('🔥 DEBUG: Existing primaryVersion value:', samplePrompt.primaryVersion);
      return;
    }
    
    if (!samplePrompt.currentVersion) {
      console.log('⚠️  No currentVersion field found. Database might be in unexpected state.');
      console.log('🔥 DEBUG: Available fields:', Object.keys(samplePrompt));
      return;
    }
    
    console.log('🔄 Starting migration...');
    console.log('🔥 DEBUG: Will migrate currentVersion:', samplePrompt.currentVersion, 'to primaryVersion');
    
    // Count total documents to migrate
    const totalPrompts = await Prompt.countDocuments({});
    console.log(`📋 Found ${totalPrompts} prompt documents to migrate`);
    
    let migrated = 0;
    let errors = 0;
    
    // Process all prompts in batches
    const prompts = await Prompt.find({}).lean();
    for (const prompt of prompts) {
      try {
        // Prepare update object
        const updateObj = {
          primaryVersion: prompt.currentVersion
        };
        
        // Handle versions array - remove isActive from all versions
        if (prompt.versions && prompt.versions.length > 0) {
          updateObj.versions = prompt.versions.map(version => {
            const result = { ...version };
            delete result.isActive;
            return result;
          });
        }
        
        console.log('🔥 DEBUG: Updating prompt', prompt._id, 'with:', {
          primaryVersion: updateObj.primaryVersion,
          versionsCount: updateObj.versions ? updateObj.versions.length : 0
        });
        // Update the document
        await Prompt.updateOne(
          { _id: prompt._id },
          {
            $set: updateObj,
            $unset: { currentVersion: "" }
          }
        );
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ⏳ Migrated ${migrated}/${totalPrompts} prompts...`);
        }
      } catch (error) {
        console.error(`❌ Error migrating prompt ${prompt._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('🎉 Migration completed!');
    console.log(`   ✅ Successfully migrated: ${migrated} prompts`);
    console.log(`   ❌ Errors encountered: ${errors} prompts`);
    
    if (errors > 0) {
      console.log('⚠️  Some documents had errors. Please review the logs above.');
    }
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const verifyPrompt = await Prompt.findOne({}).lean();
    
    if (verifyPrompt && verifyPrompt.primaryVersion && !verifyPrompt.currentVersion) {
      console.log('✅ Migration verification successful!');
      console.log(`   📋 Sample document now has primaryVersion: ${verifyPrompt.primaryVersion}`);
    } else {
      console.log('❌ Migration verification failed!');
      console.log('   🔍 Sample document structure:', {
        hasCurrentVersion: !!verifyPrompt?.currentVersion,
        hasPrimaryVersion: !!verifyPrompt?.primaryVersion,
        primaryVersion: verifyPrompt?.primaryVersion
      });
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.error('🔥 DEBUG: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔒 Database connection closed.');
  }
}

// Safety check function
async function createBackup() {
  console.log('� DEBUG: createBackup function called');
  console.log('�💾 Creating backup before migration...');
  console.log('⚠️  IMPORTANT: Make sure you have a database backup before running this migration!');
  console.log('   You can create a backup using:');
  console.log('   mongodump --uri="' + MONGODB_URI + '" --out=./backup-before-migration');
  console.log('');
  
  // Wait for user confirmation in production
  console.log('🔥 DEBUG: NODE_ENV check:', process.env.NODE_ENV);
  if (process.env.NODE_ENV === 'production') {
    console.log('🔥 DEBUG: Production environment detected, asking for confirmation');
    const readlineModule = await import('readline');
    const readline = readlineModule.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise((resolve) => {
      readline.question('Do you have a backup and want to proceed? (yes/no): ', (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'yes') {
          console.log('🛑 Migration cancelled by user.');
          process.exit(0);
        }
        resolve();
      });
    });
  } else {
    console.log('🔥 DEBUG: Non-production environment, skipping confirmation');
  }
}

// Main execution
async function main() {
  console.log('🔥 DEBUG: main function called');
  try {
    console.log('🚀 ModelMind Database Migration: currentVersion → primaryVersion');
    console.log('================================================');
    
    console.log('🔥 DEBUG: About to call createBackup');
    await createBackup();
    console.log('🔥 DEBUG: createBackup completed, calling migrateDatabase');
    await migrateDatabase();
    console.log('🔥 DEBUG: migrateDatabase completed');
    
    console.log('================================================');
    console.log('🎊 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test your application to ensure everything works correctly');
    console.log('2. Deploy the updated application code');
    console.log('3. Monitor for any issues');
    console.log('');
    console.log('If you encounter issues, you can restore from your backup using:');
    console.log('mongorestore --uri="' + MONGODB_URI + '" ./backup-before-migration');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.error('🔥 DEBUG: Main function error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    process.exit(1);
  }
}

// Run the migration
console.log('🔥 DEBUG: Script execution check - import.meta.url:', import.meta.url);
console.log('🔥 DEBUG: Script execution check - process.argv[1]:', process.argv[1]);

// Fix for Windows path comparison - normalize both paths
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = resolve(process.argv[1]);

console.log('🔥 DEBUG: Normalized current file:', currentFilePath);
console.log('🔥 DEBUG: Normalized executed file:', executedFilePath);
console.log('🔥 DEBUG: Should run main?', currentFilePath === executedFilePath);

if (currentFilePath === executedFilePath) {
  console.log('🔥 DEBUG: Calling main function...');
  main();
} else {
  console.log('🔥 DEBUG: Script not being run directly, main function not called');
}