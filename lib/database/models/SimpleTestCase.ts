import mongoose, { Schema, model, Document } from 'mongoose';

export interface ISimpleTestCase extends Document {
  promptId: string;
  promptName: string;
  version: string;
  variables: Record<string, unknown>;
  testParameters: Record<string, unknown>;
  generatedYaml: string;
  createdAt: Date;
}

const SimpleTestCaseSchema = new Schema<ISimpleTestCase>({
  promptId: {
    type: String,
    required: true
  },
  promptName: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: String,
    required: true,
    trim: true
  },
  variables: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  testParameters: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  generatedYaml: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SimpleTestCaseSchema.index({ promptId: 1 });
SimpleTestCaseSchema.index({ createdAt: -1 });

SimpleTestCaseSchema.statics.create = function(data: Partial<ISimpleTestCase>) {
  return new this(data).save();
};

SimpleTestCaseSchema.statics.findByPromptId = function(promptId: string) {
  return this.find({ promptId }).sort({ createdAt: -1 });
};

SimpleTestCaseSchema.statics.findById = function(id: string) {
  return this.findOne({ _id: id });
};

SimpleTestCaseSchema.statics.deleteById = function(id: string) {
  return this.findByIdAndDelete(id);
};

export const SimpleTestCase = mongoose.models.SimpleTestCase || model<ISimpleTestCase>('SimpleTestCase', SimpleTestCaseSchema);

export default SimpleTestCase;