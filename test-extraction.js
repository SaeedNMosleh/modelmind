// Simple test to validate extraction without compilation issues
const { extractAllPrompts, getBaseSystemPrompt } = require('./lib/migration/extractor');

console.log('Testing prompt extraction...');

try {
  const extractedPrompts = extractAllPrompts();
  console.log(`✅ Extracted ${extractedPrompts.length} prompts from AI pipeline`);
  
  const basePrompt = getBaseSystemPrompt();
  console.log(`✅ Base system prompt: "${basePrompt}"`);
  
  console.log('Prompt details:');
  for (const prompt of extractedPrompts) {
    console.log(`- ${prompt.name} (${prompt.agentType})`);
  }
  
  console.log('🎉 Extraction test completed successfully!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
}