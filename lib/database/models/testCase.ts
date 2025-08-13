import mongoose, { Schema, model } from 'mongoose';
import { z } from 'zod';
import { ITestCase, IPromptFooAssertion } from '../types';

export const PromptFooAssertionValidationSchema = z.object({
  type: z.string().min(1, 'Assertion type is required'),
  value: z.any().optional(),
  threshold: z.number().optional(),
  provider: z.string().optional(),
  rubric: z.string().optional(),
  metric: z.string().optional()
});

export const TestCaseValidationSchema = z.object({
  promptId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid prompt ID'),
  name: z.string().min(1, 'Name cannot be empty').max(200, 'Name cannot exceed 200 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional().default(''),
  vars: z.record(z.string(), z.unknown()),
  assert: z.array(PromptFooAssertionValidationSchema).min(1, 'At least one assertion is required'),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const PromptFooAssertionSchema = new Schema<IPromptFooAssertion>({
  type: {
    type: String,
    required: true,
    enum: [
      'equals',
      'contains',
      'not-contains',
      'starts-with',
      'ends-with',
      'regex',
      'similar',
      'cost',
      'latency',
      'perplexity',
      'javascript',
      'python',
      'rouge-n',
      'bleu',
      'meteor',
      'answer-relevance',
      'context-recall',
      'context-precision',
      'context-relevance',
      'factual-consistency',
      'faithfulness',
      'toxicity',
      'bias',
      'pii',
      'sentiment',
      'moderation',
      'custom'
    ]
  },
  value: {
    type: Schema.Types.Mixed
  },
  threshold: {
    type: Number,
    min: [0, 'Threshold must be non-negative'],
    max: [1, 'Threshold must not exceed 1']
  },
  provider: {
    type: String,
    trim: true
  },
  rubric: {
    type: String,
    trim: true
  },
  metric: {
    type: String,
    trim: true
  }
}, {
  _id: false
});

const TestCaseSchema = new Schema<ITestCase>({
  promptId: {
    type: Schema.Types.ObjectId,
    ref: 'Prompt',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Name cannot be empty'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  vars: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  assert: {
    type: [PromptFooAssertionSchema],
    required: true,
    validate: {
      validator: function(assertions: IPromptFooAssertion[]) {
        return assertions.length > 0;
      },
      message: 'At least one assertion is required'
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
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

TestCaseSchema.index({ promptId: 1, isActive: 1 });
TestCaseSchema.index({ tags: 1 });
TestCaseSchema.index({ name: 'text', description: 'text' });
TestCaseSchema.index({ createdAt: -1 });

TestCaseSchema.methods.toPromptFooFormat = function() {
  return {
    vars: this.vars,
    assert: this.assert.map((assertion: IPromptFooAssertion) => ({
      type: assertion.type,
      ...(assertion.value !== undefined && { value: assertion.value }),
      ...(assertion.threshold !== undefined && { threshold: assertion.threshold }),
      ...(assertion.provider && { provider: assertion.provider }),
      ...(assertion.rubric && { rubric: assertion.rubric }),
      ...(assertion.metric && { metric: assertion.metric })
    })),
    ...(this.description && { description: this.description })
  };
};

TestCaseSchema.statics.createFromPromptFoo = function(
  promptId: string, 
  name: string, 
  promptFooTest: {
    description?: string;
    vars?: Record<string, unknown>;
    assert?: Array<{
      type: string;
      value?: unknown;
      threshold?: number;
      provider?: string;
      rubric?: string;
      metric?: string;
    }>;
    tags?: string[];
  }, 
  metadata?: Record<string, unknown>
) {
  const validation = TestCaseValidationSchema.safeParse({
    promptId,
    name,
    description: promptFooTest.description || '',
    vars: promptFooTest.vars || {},
    assert: promptFooTest.assert || [],
    tags: promptFooTest.tags || [],
    metadata
  });

  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  return new this(validation.data);
};

TestCaseSchema.methods.validateSchema = function(callback?: (error?: Error) => void) {
  const validation = TestCaseValidationSchema.safeParse({
    promptId: this.promptId.toString(),
    name: this.name,
    description: this.description,
    vars: this.vars,
    assert: this.assert,
    tags: this.tags,
    isActive: this.isActive,
    metadata: this.metadata
  });

  if (!validation.success) {
    const error = new Error(`Validation failed: ${validation.error.message}`);
    if (callback) return callback(error);
    throw error;
  }

  if (callback) callback();
  return true;
};

export const TestCase = mongoose.models.TestCase || model<ITestCase>('TestCase', TestCaseSchema);

export default TestCase;