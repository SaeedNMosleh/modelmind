import { NextRequest } from 'next/server';
import { connectToDatabase, Prompt, TestCase, IPrompt } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handleApiError,
  withTimeout,
  createNotFoundResponse,
  createValidationErrorResponse,
  ValidationErrorDetails
} from '@/lib/api/responses';
import { ObjectIdSchema, ExportConfigSchema } from '@/lib/api/validation/prompts';
import { IPromptFooConfig } from '@/lib/database/types';
import pino from 'pino';

const logger = pino({ name: 'prompt-export-config-api' });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await withTimeout(connectToDatabase());
    
    const { id } = await params;
    const idValidation = ObjectIdSchema.safeParse(id);
    if (!idValidation.success) {
      return createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400);
    }

    const body = await request.json().catch(() => ({}));
    const validation = ExportConfigSchema.safeParse(body);
    
    if (!validation.success) {
      // Convert Zod errors to ValidationErrorDetails format
      const errorDetails: ValidationErrorDetails = {};
      validation.error.errors.forEach(err => {
        const path = err.path.join('.');
        errorDetails[path] = {
          message: err.message,
          path: path
        };
      });
      return createValidationErrorResponse(errorDetails);
    }

    const {
      includeTestCases,
      provider,
      model,
      temperature,
      maxTokens,
      outputPath
    } = validation.data;

    const prompt = await Prompt.findById(id).lean();
    
    if (!prompt) {
      return createNotFoundResponse('Prompt');
    }
    
    // Type assertion to handle the MongoDB document
    const typedPrompt = prompt as unknown as IPrompt;

    const activeVersion = typedPrompt.versions.find(v => v.isActive);
    
    if (!activeVersion) {
      return createErrorResponse(
        'Prompt has no active version',
        'NO_ACTIVE_VERSION',
        400
      );
    }

    const promptFooConfig: IPromptFooConfig = {
      prompts: [{
        id: `${typedPrompt.name}-${activeVersion.version}`,
        template: activeVersion.template
      }],
      providers: [{
        id: provider,
        config: {
          ...(provider === 'openai' && {
            apiKey: '${OPENAI_API_KEY}',
            model,
            temperature,
            ...(maxTokens && { max_tokens: maxTokens })
          }),
          ...(provider === 'anthropic' && {
            apiKey: '${ANTHROPIC_API_KEY}',
            model,
            temperature,
            ...(maxTokens && { max_tokens: maxTokens })
          })
        }
      }],
      tests: [],
      defaultTest: {
        vars: {},
        assert: [
          {
            type: 'contains',
            value: ''
          }
        ]
      },
      ...(outputPath && { outputPath }),
      evaluateOptions: {
        maxConcurrency: 5,
        repeat: 1,
        delay: 1000
      }
    };

    if (includeTestCases) {
      const testCases = await TestCase.find({ 
        promptId: id,
        isActive: true 
      }).lean();

      if (testCases.length > 0) {
        promptFooConfig.tests = testCases.map(testCase => ({
          vars: testCase.vars,
          assert: testCase.assert,
          ...(testCase.description && { description: testCase.description })
        }));
      }
    }

    if (promptFooConfig.tests.length === 0) {
      promptFooConfig.tests = [{
        vars: {
          input: "Example input for testing"
        },
        assert: [
          {
            type: 'contains',
            value: ''
          },
          {
            type: 'latency',
            threshold: 5000
          }
        ],
        description: 'Default test case - please customize'
      }];
    }

    const configYaml = generatePromptFooYaml(promptFooConfig);
    
    logger.info({ 
      promptId: id,
      promptName: typedPrompt.name,
      version: activeVersion.version,
      testCasesIncluded: promptFooConfig.tests.length,
      provider,
      model
    }, 'Generated PromptFoo config');

    return createSuccessResponse({
      prompt: {
        id: typedPrompt._id,
        name: typedPrompt.name,
        version: activeVersion.version
      },
      config: promptFooConfig,
      yaml: configYaml,
      metadata: {
        generatedAt: new Date(),
        testCasesIncluded: promptFooConfig.tests.length,
        provider,
        model,
        temperature
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}

function generatePromptFooYaml(config: IPromptFooConfig): string {
  const yaml = `# PromptFoo Configuration
# Generated from ModelMind prompt management system

prompts:
${config.prompts.map(p => `  - id: "${p.id}"
    template: |
${p.template.split('\n').map(line => `      ${line}`).join('\n')}`).join('\n')}

providers:
${config.providers.map(p => `  - id: ${p.id}
    config:
${Object.entries(p.config).map(([key, value]) => `      ${key}: ${typeof value === 'string' ? `"${value}"` : value}`).join('\n')}`).join('\n')}

tests:
${config.tests.map(test => `  - vars:
${Object.entries(test.vars || {}).map(([key, value]) => `      ${key}: "${value}"`).join('\n')}
    assert:
${test.assert.map(assertion => `      - type: ${assertion.type}${assertion.value !== undefined ? `\n        value: "${assertion.value}"` : ''}${assertion.threshold !== undefined ? `\n        threshold: ${assertion.threshold}` : ''}`).join('\n')}${test.description ? `\n    description: "${test.description}"` : ''}`).join('\n')}

${config.defaultTest ? `defaultTest:
  vars:
${Object.entries(config.defaultTest.vars || {}).map(([key, value]) => `    ${key}: "${value}"`).join('\n')}
  assert:
${config.defaultTest.assert?.map(assertion => `    - type: ${assertion.type}${assertion.value !== undefined ? `\n      value: "${assertion.value}"` : ''}${assertion.threshold !== undefined ? `\n      threshold: ${assertion.threshold}` : ''}`).join('\n') || ''}` : ''}

${config.outputPath ? `outputPath: "${config.outputPath}"` : ''}

evaluateOptions:
  maxConcurrency: ${config.evaluateOptions?.maxConcurrency || 5}
  repeat: ${config.evaluateOptions?.repeat || 1}
  delay: ${config.evaluateOptions?.delay || 1000}
`;

  return yaml;
}