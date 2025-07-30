import { z } from 'zod';
import { AgentType, DiagramType, PromptOperation, PromptEnvironment } from '@/lib/database';

const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const CreatePromptSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  agentType: z.nativeEnum(AgentType, {
    errorMap: () => ({ message: 'Invalid agent type' })
  }),
  diagramType: z
    .array(z.nativeEnum(DiagramType))
    .min(1, 'At least one diagram type is required')
    .max(6, 'Too many diagram types selected'),
  operation: z.nativeEnum(PromptOperation, {
    errorMap: () => ({ message: 'Invalid prompt operation' })
  }),
  isProduction: z.boolean().default(false),
  environments: z
    .array(z.nativeEnum(PromptEnvironment))
    .min(1, 'At least one environment is required'),
  tags: z.array(z.string().trim().min(1)).default([]),
  metadata: z.record(z.any()).optional(),
  initialVersion: z.object({
    version: z
      .string()
      .regex(semverRegex, 'Version must follow semantic versioning (e.g., 1.0.0)'),
    template: z
      .string()
      .min(1, 'Template is required')
      .max(10000, 'Template must be less than 10000 characters'),
    changelog: z
      .string()
      .min(1, 'Changelog is required')
      .max(1000, 'Changelog must be less than 1000 characters')
  })
});

export const UpdatePromptSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  agentType: z.nativeEnum(AgentType).optional(),
  diagramType: z
    .array(z.nativeEnum(DiagramType))
    .min(1, 'At least one diagram type is required')
    .max(6, 'Too many diagram types selected')
    .optional(),
  operation: z.nativeEnum(PromptOperation).optional(),
  isProduction: z.boolean().optional(),
  environments: z
    .array(z.nativeEnum(PromptEnvironment))
    .min(1, 'At least one environment is required')
    .optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  metadata: z.record(z.any()).optional(),
  newVersion: z.object({
    version: z
      .string()
      .regex(semverRegex, 'Version must follow semantic versioning (e.g., 1.0.0)'),
    template: z
      .string()
      .min(1, 'Template is required')
      .max(10000, 'Template must be less than 10000 characters'),
    changelog: z
      .string()
      .min(1, 'Changelog is required')
      .max(1000, 'Changelog must be less than 1000 characters')
  }).optional()
});

export const CreateVersionSchema = z.object({
  version: z
    .string()
    .regex(semverRegex, 'Version must follow semantic versioning (e.g., 1.0.0)'),
  template: z
    .string()
    .min(1, 'Template is required')
    .max(10000, 'Template must be less than 10000 characters'),
  changelog: z
    .string()
    .min(1, 'Changelog is required')
    .max(1000, 'Changelog must be less than 1000 characters'),
  metadata: z.record(z.any()).optional()
});

export const DuplicatePromptSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  copyVersions: z.boolean().default(true),
  includeTestCases: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});

export const PromptQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => val ? Math.max(1, parseInt(val)) : 1),
  limit: z
    .string()
    .optional()
    .transform(val => val ? Math.min(100, Math.max(1, parseInt(val))) : 20),
  sort: z
    .enum(['name', 'createdAt', 'updatedAt', 'agentType', 'operation'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  agentType: z.nativeEnum(AgentType).optional(),
  diagramType: z.nativeEnum(DiagramType).optional(),
  operation: z.nativeEnum(PromptOperation).optional(),
  environment: z.nativeEnum(PromptEnvironment).optional(),
  isProduction: z
    .string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  search: z.string().max(100).optional(),
  tags: z
    .string()
    .optional()
    .transform(val => val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : undefined)
});

export const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const VersionSchema = z.string().regex(semverRegex, 'Invalid version format');

export const ExportConfigSchema = z.object({
  includeTestCases: z.boolean().default(true),
  provider: z.string().default('openai'),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8000).optional(),
  outputPath: z.string().optional()
});

export type CreatePromptInput = z.infer<typeof CreatePromptSchema>;
export type UpdatePromptInput = z.infer<typeof UpdatePromptSchema>;
export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;
export type DuplicatePromptInput = z.infer<typeof DuplicatePromptSchema>;
export type PromptQueryInput = z.infer<typeof PromptQuerySchema>;
export type ExportConfigInput = z.infer<typeof ExportConfigSchema>;

// Converts Zod errors to ValidationErrorDetails for API responses
import type { ValidationErrorDetails } from '@/lib/api/responses';
export function zodErrorsToValidationDetails(errors: z.ZodIssue[]): ValidationErrorDetails {
  const errorDetails: ValidationErrorDetails = {};
  errors.forEach((err, index) => {
    const path = err.path.join('.');
    errorDetails[path || `error_${index}`] = {
      message: err.message,
      path: path,
      value: err.code
    };
  });
  return errorDetails;
}