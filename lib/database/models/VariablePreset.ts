import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import { AgentType, PromptOperation } from '../types';

export interface IVariablePreset extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  agentType?: AgentType;
  operation?: PromptOperation;
  variables: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Admin-only management metadata
  createdBy: string; // Admin identifier
  lastModifiedBy: string;
}

export interface IVariablePresetStatics extends Model<IVariablePreset> {
  findActiveByAgentOperation(agentType?: AgentType, operation?: PromptOperation): Promise<IVariablePreset[]>;
  findGlobalPresets(): Promise<IVariablePreset[]>;
  createPreset(data: {
    name: string;
    description: string;
    agentType?: AgentType;
    operation?: PromptOperation;
    variables: Record<string, unknown>;
    createdBy: string;
  }): Promise<IVariablePreset>;
  updatePreset(id: string, data: Partial<IVariablePreset>, updatedBy: string): Promise<IVariablePreset | null>;
  deactivatePreset(id: string, updatedBy: string): Promise<IVariablePreset | null>;
}

const VariablePresetSchema = new Schema<IVariablePreset>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  agentType: {
    type: String,
    enum: Object.values(AgentType),
    required: false
  },
  operation: {
    type: String,
    enum: Object.values(PromptOperation),
    required: false
  },
  variables: {
    type: Map,
    of: Schema.Types.Mixed,
    required: true,
    default: () => new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true,
    default: 'admin'
  },
  lastModifiedBy: {
    type: String,
    required: true,
    default: 'admin'
  }
}, {
  timestamps: true,
  collection: 'variable_presets'
});

// Indexes for performance
VariablePresetSchema.index({ agentType: 1, operation: 1 });
VariablePresetSchema.index({ isActive: 1, createdAt: -1 });

// Transform for JSON output
VariablePresetSchema.set('toJSON', {
  transform: function(doc, ret) {
    const result = {
      id: ret._id,
      name: ret.name,
      description: ret.description,
      agentType: ret.agentType,
      operation: ret.operation,
      variables: ret.variables instanceof Map ? Object.fromEntries(ret.variables) : ret.variables,
      isActive: ret.isActive,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
      createdBy: ret.createdBy,
      lastModifiedBy: ret.lastModifiedBy
    };
    
    return result;
  }
});

// Static methods for admin management
VariablePresetSchema.statics.findActiveByAgentOperation = async function(agentType?: AgentType, operation?: PromptOperation) {
  const query: Record<string, unknown> = { isActive: true };
  if (agentType) query.agentType = agentType;
  if (operation) query.operation = operation;
  
  return this.find(query).sort({ createdAt: -1 }).lean();
};

VariablePresetSchema.statics.findGlobalPresets = async function() {
  return this.find({ 
    isActive: true,
    $or: [
      { agentType: { $exists: false } },
      { operation: { $exists: false } }
    ]
  }).sort({ createdAt: -1 }).lean();
};

VariablePresetSchema.statics.createPreset = async function(data: {
  name: string;
  description: string;
  agentType?: AgentType;
  operation?: PromptOperation;
  variables: Record<string, unknown>;
  createdBy: string;
}) {
  return this.create({
    ...data,
    lastModifiedBy: data.createdBy
  });
};

VariablePresetSchema.statics.updatePreset = async function(id: string, data: Partial<IVariablePreset>, updatedBy: string) {
  return this.findByIdAndUpdate(
    id,
    { 
      ...data, 
      lastModifiedBy: updatedBy,
      updatedAt: new Date()
    },
    { new: true, runValidators: true }
  );
};

VariablePresetSchema.statics.deactivatePreset = async function(id: string, updatedBy: string) {
  return this.findByIdAndUpdate(
    id,
    { 
      isActive: false,
      lastModifiedBy: updatedBy,
      updatedAt: new Date()
    },
    { new: true }
  );
};

export const VariablePreset = (mongoose.models.VariablePreset || 
  mongoose.model<IVariablePreset, IVariablePresetStatics>('VariablePreset', VariablePresetSchema)) as IVariablePresetStatics;