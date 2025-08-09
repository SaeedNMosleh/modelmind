import mongoose, { Schema, model, Model } from 'mongoose';
import { z } from 'zod';
import {
  IPrompt,
  IPromptVersion,
  AgentType,
  DiagramType,
  PromptOperation,
  CreatePromptVersionInput
} from '../types';

const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const PromptVersionValidationSchema = z.object({
  version: z.string().regex(semverRegex, 'Version must follow semantic versioning (e.g., 1.0.0)'),
  template: z.string().min(1, 'Template cannot be empty'),
  changelog: z.string().min(1, 'Changelog cannot be empty'),
  metadata: z.record(z.any()).optional()
});

export const PromptValidationSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters'),
  agentType: z.nativeEnum(AgentType, { errorMap: () => ({ message: 'Invalid agent type' }) }),
  diagramType: z.array(z.nativeEnum(DiagramType)).min(0, 'Diagram types array must be valid'),
  operation: z.nativeEnum(PromptOperation, { errorMap: () => ({ message: 'Invalid prompt operation' }) }),
  isProduction: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional()
});

export const CreatePromptValidationSchema = PromptValidationSchema.extend({
  initialVersion: PromptVersionValidationSchema
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
  primaryVersion: {
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
    default: false,
    required: true
  },
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
PromptSchema.index({ isProduction: 1 });
PromptSchema.index({ agentType: 1, operation: 1, isProduction: 1 }); // For atomic activation queries
PromptSchema.index({ tags: 1 });
PromptSchema.index({ name: 'text', tags: 'text' });
PromptSchema.index({ 'versions.version': 1 });
PromptSchema.index({ primaryVersion: 1 });

PromptSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('versions')) {
    // Ensure primaryVersion exists and points to a valid version
    if (!this.primaryVersion) {
      // Set the first version as primary if no primary is set
      this.primaryVersion = this.versions[0]?.version;
    }
    
    // Validate that primaryVersion exists in versions array
    const primaryVersionExists = this.versions.some(v => v.version === this.primaryVersion);
    if (!primaryVersionExists) {
      return next(new Error('Primary version must exist in versions array'));
    }
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

  this.versions.push({
    ...versionData,
    createdAt: new Date()
  });

  // Set as primary version if it's the first version or if explicitly requested
  if (this.versions.length === 1 || versionData.isPrimary) {
    this.primaryVersion = versionData.version;
  }
  
  this.updatedAt = new Date();
};

PromptSchema.methods.setPrimaryVersion = function(version: string) {
  const targetVersion = this.versions.find((v: IPromptVersion) => v.version === version);
  if (!targetVersion) {
    throw new Error(`Version ${version} not found`);
  }

  this.primaryVersion = version;
  this.updatedAt = new Date();
};

PromptSchema.methods.getPrimaryVersion = function(): IPromptVersion | null {
  return this.versions.find((v: IPromptVersion) => v.version === this.primaryVersion) || null;
};

PromptSchema.methods.getVersion = function(version: string): IPromptVersion | null {
  return this.versions.find((v: IPromptVersion) => v.version === version) || null;
};

/**
 * Atomically activate this prompt for its agent-operation combination.
 * This will deactivate any other prompts for the same agent-operation.
 */
PromptSchema.methods.activateAtomically = async function(): Promise<void> {
  const PromptModel = this.constructor as Model<IPrompt>;
  
  // Start a session for atomic operation
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Deactivate all other prompts for this agent-operation combination
      await PromptModel.updateMany(
        {
          agentType: this.agentType,
          operation: this.operation,
          _id: { $ne: this._id },
          isProduction: true
        },
        { isProduction: false },
        { session }
      );
      
      // Activate this prompt
      this.isProduction = true;
      this.updatedAt = new Date();
      await this.save({ session });
    });
  } finally {
    await session.endSession();
  }
};

export const Prompt = mongoose.models.Prompt || model<IPrompt>('Prompt', PromptSchema);

export default Prompt;