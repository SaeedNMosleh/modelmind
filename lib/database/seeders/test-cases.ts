import { connectToDatabase } from '../connection';
import { Prompt } from '../models/prompt';
import { TestCase } from '../models/testCase';
import { DiagramType, AgentType } from '../types';
import pino from 'pino';

const logger = pino();

/**
 * Sample test cases for different prompt types
 */
const testCaseTemplates = {
  // Generator test cases
  generator: [
    {
      name: 'Simple sequence diagram',
      input: 'Create a sequence diagram for user login process',
      expectedOutputs: [
        'contains @startuml and @enduml',
        'contains participant',
        'contains arrows (-> or -->)',
        'models login flow'
      ],
      diagramType: DiagramType.SEQUENCE,
      complexity: 'simple'
    },
    {
      name: 'Complex class diagram',
      input: 'Design a class diagram for an e-commerce system with users, products, orders, and payments',
      expectedOutputs: [
        'contains class definitions',
        'shows relationships between classes',
        'includes attributes and methods',
        'proper visibility modifiers'
      ],
      diagramType: DiagramType.CLASS,
      complexity: 'complex'
    },
    {
      name: 'Activity diagram for workflow',
      input: 'Model the order processing workflow from order placement to delivery',
      expectedOutputs: [
        'contains start and end nodes',
        'includes decision points',
        'shows process flow',
        'models business workflow'
      ],
      diagramType: DiagramType.ACTIVITY,
      complexity: 'medium'
    },
    {
      name: 'State diagram for system behavior',
      input: 'Create a state diagram for a vending machine with coin insertion, product selection, and dispensing',
      expectedOutputs: [
        'defines system states',
        'shows state transitions',
        'includes triggers and guards',
        'models state behavior'
      ],
      diagramType: DiagramType.STATE,
      complexity: 'medium'
    }
  ],

  // Modifier test cases
  modifier: [
    {
      name: 'Add new participant to sequence',
      input: 'Add a database component to this sequence diagram',
      currentDiagram: `@startuml
participant User
participant WebApp
User -> WebApp: login request
WebApp -> User: login response
@enduml`,
      expectedOutputs: [
        'adds Database participant',
        'includes database interactions',
        'preserves existing flow',
        'maintains proper syntax'
      ],
      diagramType: DiagramType.SEQUENCE,
      complexity: 'simple'
    },
    {
      name: 'Modify class relationships',
      input: 'Change the relationship between User and Order from association to composition',
      currentDiagram: `@startuml
class User {
  +name: string
  +email: string
}
class Order {
  +id: number
  +total: decimal
}
User -- Order
@enduml`,
      expectedOutputs: [
        'changes association to composition (--*)',
        'preserves class definitions',
        'maintains diagram structure',
        'correct PlantUML syntax'
      ],
      diagramType: DiagramType.CLASS,
      complexity: 'simple'
    },
    {
      name: 'Add parallel activities',
      input: 'Add parallel processing for inventory check and payment processing',
      currentDiagram: `@startuml
start
:Receive Order;
:Process Payment;
:Ship Product;
stop
@enduml`,
      expectedOutputs: [
        'adds fork and join',
        'shows parallel activities',
        'maintains workflow logic',
        'proper activity syntax'
      ],
      diagramType: DiagramType.ACTIVITY,
      complexity: 'medium'
    }
  ],

  // Analyzer test cases
  analyzer: [
    {
      name: 'Quality assessment of sequence diagram',
      input: 'Analyze the quality and best practices of this sequence diagram',
      currentDiagram: `@startuml
User -> WebApp: login
WebApp -> Database: check credentials
Database -> WebApp: return result
WebApp -> User: response
@enduml`,
      expectedOutputs: [
        'assesses diagram quality',
        'identifies best practices followed',
        'suggests improvements',
        'evaluates clarity and completeness'
      ],
      diagramType: DiagramType.SEQUENCE,
      complexity: 'simple'
    },
    {
      name: 'Component analysis of class diagram',
      input: 'List and explain all components in this class diagram',
      currentDiagram: `@startuml
class User {
  +id: number
  +name: string
  +email: string
  +login(): boolean
}
class Order {
  +id: number
  +total: decimal
  +items: Item[]
  +calculate(): decimal
}
class Item {
  +name: string
  +price: decimal
}
User ||--o{ Order
Order ||--o{ Item
@enduml`,
      expectedOutputs: [
        'lists all classes',
        'explains class attributes',
        'describes relationships',
        'identifies design patterns'
      ],
      diagramType: DiagramType.CLASS,
      complexity: 'medium'
    },
    {
      name: 'Complexity analysis',
      input: 'Evaluate the complexity of this activity diagram',
      currentDiagram: `@startuml
start
if (User authenticated?) then (yes)
  :Load dashboard;
  fork
    :Load user data;
  fork again
    :Load notifications;
  fork again
    :Load recent activity;
  end fork
  :Display dashboard;
else (no)
  :Show login form;
  :Authenticate user;
  if (Authentication successful?) then (yes)
    :Redirect to dashboard;
  else (no)
    :Show error message;
  endif
endif
stop
@enduml`,
      expectedOutputs: [
        'evaluates complexity metrics',
        'identifies decision points',
        'analyzes parallel flows',
        'suggests simplification'
      ],
      diagramType: DiagramType.ACTIVITY,
      complexity: 'complex'
    }
  ],

  // Classifier test cases
  classifier: [
    {
      name: 'Generate intent classification',
      input: 'I need a sequence diagram showing how users log into the system',
      expectedOutputs: [
        'classifies as GENERATE intent',
        'high confidence score',
        'identifies sequence diagram type',
        'extracts generation requirements'
      ],
      complexity: 'simple'
    },
    {
      name: 'Modify intent classification',
      input: 'Can you add error handling to this diagram?',
      hasCurrentDiagram: true,
      expectedOutputs: [
        'classifies as MODIFY intent',
        'high confidence score',
        'identifies modification request',
        'extracts modification parameters'
      ],
      complexity: 'simple'
    },
    {
      name: 'Analyze intent classification',
      input: 'What are the strengths and weaknesses of this class diagram?',
      hasCurrentDiagram: true,
      expectedOutputs: [
        'classifies as ANALYZE intent',
        'high confidence score',
        'identifies analysis type',
        'extracts analysis parameters'
      ],
      complexity: 'simple'
    },
    {
      name: 'Ambiguous intent classification',
      input: 'This diagram looks interesting',
      hasCurrentDiagram: true,
      expectedOutputs: [
        'classifies as UNKNOWN intent',
        'low confidence score',
        'requests clarification',
        'handles ambiguous input'
      ],
      complexity: 'simple'
    }
  ]
};

/**
 * Create test cases for a specific prompt
 */
async function createTestCasesForPrompt(
  promptId: string,
  agentType: AgentType,
  diagramType?: DiagramType
): Promise<any[]> {
  const testCases: any[] = [];
  
  // Get appropriate test case templates based on agent type
  let templates: any[] = [];
  switch (agentType) {
    case AgentType.GENERATOR:
      templates = testCaseTemplates.generator.filter(tc => 
        !diagramType || tc.diagramType === diagramType
      );
      break;
    case AgentType.MODIFIER:
      templates = testCaseTemplates.modifier.filter(tc => 
        !diagramType || tc.diagramType === diagramType
      );
      break;
    case AgentType.ANALYZER:
      templates = testCaseTemplates.analyzer.filter(tc => 
        !diagramType || tc.diagramType === diagramType
      );
      break;
    case AgentType.CLASSIFIER:
      templates = testCaseTemplates.classifier;
      break;
  }

  // Create test cases from templates
  for (const template of templates) {
    const testCase = {
      promptId,
      name: template.name,
      description: `Test case for ${agentType.toLowerCase()} - ${template.name}`,
      input: {
        userInput: template.input,
        ...(template.currentDiagram && { currentDiagram: template.currentDiagram }),
        ...(template.hasCurrentDiagram && { currentDiagram: 'mock_diagram' }),
        context: {
          diagramType: template.diagramType || diagramType,
          complexity: template.complexity
        }
      },
      expectedOutput: {
        type: 'structured',
        criteria: template.expectedOutputs
      },
      metadata: {
        complexity: template.complexity,
        diagramType: template.diagramType || diagramType,
        agentType,
        category: 'functional',
        priority: template.complexity === 'complex' ? 'high' : 'medium'
      }
    };
    
    testCases.push(testCase);
  }

  return testCases;
}

/**
 * Create edge case test cases
 */
function createEdgeCaseTests(promptId: string, agentType: AgentType): any[] {
  const edgeCases = [
    {
      promptId,
      name: 'Empty input handling',
      description: 'Test handling of empty user input',
      input: {
        userInput: '',
        context: {}
      },
      expectedOutput: {
        type: 'error_handling',
        criteria: ['handles empty input gracefully', 'provides helpful error message']
      },
      metadata: {
        category: 'edge_case',
        priority: 'high',
        agentType
      }
    },
    {
      promptId,
      name: 'Very long input handling',
      description: 'Test handling of extremely long user input',
      input: {
        userInput: 'A'.repeat(10000),
        context: {}
      },
      expectedOutput: {
        type: 'error_handling',
        criteria: ['handles long input appropriately', 'maintains performance']
      },
      metadata: {
        category: 'edge_case',
        priority: 'medium',
        agentType
      }
    },
    {
      promptId,
      name: 'Special characters in input',
      description: 'Test handling of special characters and symbols',
      input: {
        userInput: 'Create diagram with symbols: @#$%^&*(){}[]|\\:";\'<>?,./',
        context: {}
      },
      expectedOutput: {
        type: 'robustness',
        criteria: ['handles special characters', 'produces valid output']
      },
      metadata: {
        category: 'edge_case',
        priority: 'medium',
        agentType
      }
    }
  ];

  return edgeCases;
}

/**
 * Seed test cases for all prompts
 */
export async function seedTestCases(): Promise<void> {
  try {
    await connectToDatabase();
    logger.info('Connected to database for test case seeding');

    // Get all prompts
    const prompts = await Prompt.find({ isActive: true });
    logger.info(`Found ${prompts.length} active prompts to create test cases for`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const prompt of prompts) {
      try {
        // Check if test cases already exist for this prompt
        const existingCount = await TestCase.countDocuments({ promptId: prompt._id });
        if (existingCount > 0) {
          logger.debug(`Skipping test cases for ${prompt.name} - already exists`);
          totalSkipped++;
          continue;
        }

        // Create functional test cases
        const functionalTests = await createTestCasesForPrompt(
          prompt._id.toString(),
          prompt.agentType,
          prompt.diagramTypes[0] // Use first diagram type if available
        );

        // Create edge case test cases
        const edgeTests = createEdgeCaseTests(prompt._id.toString(), prompt.agentType);

        // Combine all test cases
        const allTests = [...functionalTests, ...edgeTests];

        // Insert test cases
        if (allTests.length > 0) {
          await TestCase.insertMany(allTests);
          logger.info(`Created ${allTests.length} test cases for prompt: ${prompt.name}`);
          totalCreated += allTests.length;
        }

      } catch (error) {
        logger.error(`Error creating test cases for prompt ${prompt.name}:`, error);
      }
    }

    logger.info('Test case seeding completed', {
      totalCreated,
      totalSkipped,
      totalPrompts: prompts.length
    });

  } catch (error) {
    logger.error('Error seeding test cases:', error);
    throw error;
  }
}

/**
 * Seed performance test cases
 */
export async function seedPerformanceTestCases(): Promise<void> {
  try {
    const generatorPrompts = await Prompt.find({ 
      agentType: AgentType.GENERATOR,
      isActive: true 
    });

    const performanceTests = [];

    for (const prompt of generatorPrompts) {
      // Large diagram generation test
      performanceTests.push({
        promptId: prompt._id,
        name: 'Large diagram generation performance',
        description: 'Test performance with complex diagram requirements',
        input: {
          userInput: `Create a comprehensive class diagram for a large e-commerce system including:
            - User management (customers, admins, vendors)
            - Product catalog (categories, products, variants, inventory)
            - Order processing (cart, orders, payments, shipping)
            - Reviews and ratings system
            - Notification system
            - Reporting and analytics
            Include all relationships, attributes, and methods.`,
          context: {
            complexity: 'very_complex',
            expectedElements: 20
          }
        },
        expectedOutput: {
          type: 'performance',
          criteria: [
            'completes within 30 seconds',
            'generates comprehensive diagram',
            'includes all requested elements',
            'maintains proper structure'
          ]
        },
        metadata: {
          category: 'performance',
          priority: 'high',
          agentType: prompt.agentType,
          timeout: 30000
        }
      });
    }

    await TestCase.insertMany(performanceTests);
    logger.info(`Created ${performanceTests.length} performance test cases`);

  } catch (error) {
    logger.error('Error seeding performance test cases:', error);
    throw error;
  }
}

/**
 * Get test case statistics
 */
export async function getTestCaseStats(): Promise<{
  totalTestCases: number;
  testCasesByAgent: Record<string, number>;
  testCasesByCategory: Record<string, number>;
  testCasesByComplexity: Record<string, number>;
}> {
  try {
    const totalTestCases = await TestCase.countDocuments();
    
    const testCasesByAgent = await TestCase.aggregate([
      { $lookup: { from: 'prompts', localField: 'promptId', foreignField: '_id', as: 'prompt' } },
      { $unwind: '$prompt' },
      { $group: { _id: '$prompt.agentType', count: { $sum: 1 } } }
    ]).then(results => 
      results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {})
    );

    const testCasesByCategory = await TestCase.aggregate([
      { $group: { _id: '$metadata.category', count: { $sum: 1 } } }
    ]).then(results => 
      results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {})
    );

    const testCasesByComplexity = await TestCase.aggregate([
      { $group: { _id: '$metadata.complexity', count: { $sum: 1 } } }
    ]).then(results => 
      results.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {})
    );

    return {
      totalTestCases,
      testCasesByAgent,
      testCasesByCategory,
      testCasesByComplexity
    };
  } catch (error) {
    logger.error('Error getting test case stats:', error);
    throw error;
  }
}

/**
 * Clean up test cases for inactive prompts
 */
export async function cleanupTestCases(): Promise<void> {
  try {
    // Get inactive prompt IDs
    const inactivePrompts = await Prompt.find({ isActive: false }, '_id');
    const inactivePromptIds = inactivePrompts.map(p => p._id);

    // Delete test cases for inactive prompts
    const result = await TestCase.deleteMany({
      promptId: { $in: inactivePromptIds }
    });

    logger.info(`Deleted ${result.deletedCount} test cases for inactive prompts`);
  } catch (error) {
    logger.error('Error cleaning up test cases:', error);
    throw error;
  }
}