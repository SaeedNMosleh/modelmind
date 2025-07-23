import mongoose, { Schema, model, models } from 'mongoose';
import { z } from 'zod';
import {
  IPrompt,
  IPromptVersion,
  AgentType,
  DiagramType,
  PromptOperation,
  PromptEnvironment,
  CreatePromptInput,
  UpdatePromptInput,
  CreatePromptVersionInput
} from '../types';

const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const PromptVersionValidationSchema = z.object({
  version: z.string().regex(semverRegex, 'Version must follow semantic versioning (e.g., 1.0.0)'),
  template: z.string().min(1, 'Template cannot be empty'),
  changelog: z.string().min(1, 'Changelog cannot be empty'),
  isActive: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});

export const PromptValidationSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters'),
  agentType: z.nativeEnum(AgentType, { errorMap: () => ({ message: 'Invalid agent type' }) }),
  diagramType: z.array(z.nativeEnum(DiagramType)).min(1, 'At least one diagram type is required'),
  operation: z.nativeEnum(PromptOperation, { errorMap: () => ({ message: 'Invalid prompt operation' }) }),
  isProduction: z.boolean().default(false),
  environments: z.array(z.nativeEnum(PromptEnvironment)).min(1, 'At least one environment is required'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional()
});

export const CreatePromptValidationSchema = PromptValidationSchema.extend({
  initialVersion: PromptVersionValidationSchema.omit({ isActive: true })
});

export const UpdatePromptValidationSchema = PromptValidationSchema.partial();

const PromptVersionSchema = new Schema<IPromptVersion>({
  version: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => semverRegex.test(v),
      message: 'Version must follow semantic versioning (e.g., 1.0.0)'
    }
  },
  template: {
    type: String,
    required: true,
    minlength: [1, 'Template cannot be empty']
  },
  changelog: {
    type: String,
    required: true,
    minlength: [1, 'Changelog cannot be empty']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

const PromptSchema = new Schema<IPrompt>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Name cannot be empty'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  agentType: {
    type: String,
    enum: Object.values(AgentType),
    required: true
  },
  diagramType: [{
    type: String,
    enum: Object.values(DiagramType),
    required: true
  }],
  operation: {
    type: String,
    enum: Object.values(PromptOperation),
    required: true
  },
  currentVersion: {
    type: String,
    required: true
  },
  versions: {
    type: [PromptVersionSchema],
    required: true,
    validate: {
      validator: function(versions: IPromptVersion[]) {
        return versions.length > 0;
      },
      message: 'At least one version is required'
    }
  },
  isProduction: {
    type: Boolean,
    default: false
  },
  environments: [{
    type: String,
    enum: Object.values(PromptEnvironment),
    required: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

PromptSchema.index({ agentType: 1, diagramType: 1 });
PromptSchema.index({ operation: 1 });
PromptSchema.index({ isProduction: 1, environments: 1 });
PromptSchema.index({ tags: 1 });
PromptSchema.index({ name: 'text', tags: 'text' });
PromptSchema.index({ 'versions.version': 1 });
PromptSchema.index({ currentVersion: 1 });

PromptSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('versions')) {
    const activeVersions = this.versions.filter(v => v.isActive);
    if (activeVersions.length !== 1) {
      return next(new Error('Exactly one version must be active'));
    }
    this.currentVersion = activeVersions[0].version;
  }
  next();
});

PromptSchema.methods.addVersion = function(versionData: CreatePromptVersionInput) {
  const validation = PromptVersionValidationSchema.safeParse(versionData);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  const existingVersion = this.versions.find((v: IPromptVersion) => v.version === versionData.version);
  if (existingVersion) {
    throw new Error(`Version ${versionData.version} already exists`);
  }

  this.versions.forEach((v: IPromptVersion) => {
    v.isActive = false;
  });

  this.versions.push({
    ...versionData,
    createdAt: new Date(),
    isActive: true
  });

  this.currentVersion = versionData.version;
  this.updatedAt = new Date();
};

PromptSchema.methods.activateVersion = function(version: string) {
  const targetVersion = this.versions.find((v: IPromptVersion) => v.version === version);
  if (!targetVersion) {
    throw new Error(`Version ${version} not found`);
  }

  this.versions.forEach((v: IPromptVersion) => {
    v.isActive = v.version === version;
  });

  this.currentVersion = version;
  this.updatedAt = new Date();
};

PromptSchema.methods.getCurrentVersion = function(): IPromptVersion | null {
  return this.versions.find((v: IPromptVersion) => v.isActive) || null;
};

PromptSchema.methods.getVersion = function(version: string): IPromptVersion | null {
  return this.versions.find((v: IPromptVersion) => v.version === version) || null;
};

export const Prompt = models.Prompt || model<IPrompt>('Prompt', PromptSchema);

export default Prompt;