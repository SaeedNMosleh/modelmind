#!/usr/bin/env tsx

/**
 * Script to populate variable presets from existing prompt templates
 * This analyzes all active prompts and creates presets based on their unique variable combinations
 */

import { createEnhancedLogger } from '../lib/utils/consola-logger';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { connectToDatabase, disconnectFromDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { VariablePreset } from '../lib/database/models/VariablePreset';
import { TemplateVariable } from '../lib/prompt-mgmt/types';

const logger = createEnhancedLogger('populate-presets');

interface PresetStats {
  analyzed: number;
  created: number;
  skipped: number;
  warnings: string[];
  operations: string[];
}

/**
 * Prompt user for confirmation
 */
function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Helper function to get default value based on variable type
function getDefaultValue(variable: TemplateVariable) {
  if (variable.defaultValue !== undefined) {
    return variable.defaultValue;
  }
  
  switch (variable.type) {
    case 'string':
      if (variable.name === 'diagramType') return 'sequence';
      if (variable.name === 'analysisType') return 'GENERAL';
      if (variable.name === 'userInput') return 'Create a simple diagram showing the main components and their interactions';
      if (variable.name === 'complexity') return 'medium';
      return `Sample ${variable.name}`;
    case 'number':
      return 1;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return '';
  }
}

// Main function to populate presets
async function populatePresets() {
  try {
    console.log('🔍 Creating hardcoded presets for 4 agent types...');
    
    // Clean existing presets collection first
    console.log(`\n🗑️ Cleaning existing presets...`);
    const deleteResult = await VariablePreset.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing presets`);

    // Hardcoded presets based on embedded prompts with ALL variables included
    const hardcodedPresets = [
      {
        name: 'Master Classifier Preset',
        description: 'Complete variables for comprehensive intent classification',
        agentType: 'classifier',
        operation: 'intent-classification', 
        variables: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams. You have deep knowledge of PlantUML syntax, best practices, and design patterns. Always provide accurate, well-structured PlantUML code that follows conventions.',
          userInput: 'Create a sequence diagram showing user authentication flow with database validation',
          currentDiagram: '@startuml\n!theme plain\nactor User\nparticipant "Login Form" as LF\nparticipant "Auth Service" as AS\nparticipant "Database" as DB\n\nUser -> LF: Enter credentials\nLF -> AS: Validate user\nAS -> DB: Check credentials\nDB -> AS: Return result\nAS -> LF: Auth response\nLF -> User: Show result\n@enduml',
          conversationHistory: 'User is requesting help with authentication flow diagrams for their web application',
          formatInstructions: 'Provide a complete classification with intent, diagram type, analysis type, and confidence score. Format as structured JSON response.'
        }
      },
      {
        name: 'Generator Preset',
        description: 'Complete variables for unified diagram generation',
        agentType: 'generator',
        operation: 'generation',
        variables: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams. You have deep knowledge of PlantUML syntax, best practices, and design patterns. Always provide accurate, well-structured PlantUML code that follows conventions.',
          currentDiagram: '@startuml\n!theme plain\n@enduml',
          userInput: 'Create a sequence diagram showing user authentication flow with error handling and session management',
          diagramType: 'sequence',
          guidelines: 'Use clear actor and participant names. Include proper activation blocks. Add notes for complex interactions. Follow modern PlantUML styling with themes.',
          templates: 'Available templates: Basic Authentication, Multi-tier Architecture, Database Integration, API Communication, Error Handling Patterns',
          formatInstructions: 'Provide complete PlantUML code wrapped in ```plantuml code blocks. Include title and proper formatting. Add comments for complex sections.'
        }
      },
      {
        name: 'Modifier Preset', 
        description: 'Complete variables for unified diagram modification',
        agentType: 'modifier',
        operation: 'modification',
        variables: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams. You have deep knowledge of PlantUML syntax, best practices, and design patterns. Always provide accurate, well-structured PlantUML code that follows conventions.',
          currentDiagram: '@startuml\n!theme plain\nactor User\nparticipant "Login Form" as LF\nparticipant "Auth Service" as AS\nparticipant "Database" as DB\n\nUser -> LF: Enter credentials\nLF -> AS: Validate user\nAS -> DB: Check credentials\nDB -> AS: Return result\nAS -> LF: Auth response\nLF -> User: Show result\n@enduml',
          userInput: 'Add error handling for invalid credentials and database connection failures',
          diagramType: 'sequence',
          guidelines: 'Preserve existing flow structure. Add error handling with proper alt/opt blocks. Include timeout scenarios. Use consistent naming conventions.',
          formatInstructions: 'Provide the complete modified PlantUML code. Highlight the changes made. Ensure all syntax is correct and the diagram flows logically.'
        }
      },
      {
        name: 'Analyzer Preset',
        description: 'Complete variables for unified diagram analysis',
        agentType: 'analyzer', 
        operation: 'analysis',
        variables: {
          baseSystemPrompt: 'You are an expert assistant specializing in PlantUML diagrams. You have deep knowledge of PlantUML syntax, best practices, and design patterns. Always provide accurate, well-structured PlantUML code that follows conventions.',
          diagram: '@startuml\n!theme plain\nactor User\nparticipant "Login Form" as LF\nparticipant "Auth Service" as AS\nparticipant "Database" as DB\n\nUser -> LF: Enter credentials\nLF -> AS: Validate user\nAS -> DB: Check credentials\nDB -> AS: Return result\nAS -> LF: Auth response\nLF -> User: Show result\n@enduml',
          userInput: 'Analyze this authentication flow diagram for security best practices and potential improvements',
          analysisType: 'GENERAL',
          diagramType: 'sequence',
          guidelines: 'Focus on security patterns, error handling, performance considerations, and PlantUML best practices. Consider scalability and maintainability aspects.',
          formatInstructions: 'Provide detailed analysis with specific recommendations. Include code suggestions where applicable. Structure the response with clear sections for different aspects.'
        }
      }
    ];

    console.log(`\n💾 Creating ${hardcodedPresets.length} new presets...`);
    
    let createdCount = 0;
    let failedCount = 0;

    for (const preset of hardcodedPresets) {
      try {
        await VariablePreset.create({
          ...preset,
          createdBy: 'populate-script'
        });
        console.log(`  ✅ Created: ${preset.name}`);
        createdCount++;
      } catch (error) {
        console.log(`  ❌ Failed to create ${preset.name}:`, (error as Error).message);
        failedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  • Successfully created: ${createdCount} presets`);
    console.log(`  • Failed to create: ${failedCount} presets`);
    console.log(`  • Total processed: ${hardcodedPresets.length} presets`);

    console.log('\n🎉 Preset population completed!');
    console.log('\nTo use these presets:');
    console.log('1. Go to the test-case-generator page');
    console.log('2. Select a prompt (agent/operation will filter presets)');
    console.log('3. In Configuration tab, select preset from dropdown');
    console.log('4. Click "Apply Preset" to populate variables');
    console.log('5. Edit individual variables as needed');
    console.log('6. Save your test case');

  } catch (error) {
    console.error('❌ Error populating presets:', error);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Variable Preset Population Script\n');
  
  try {
    await connectToDatabase();
    await populatePresets();
    
    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  main();
}

export { populatePresets };