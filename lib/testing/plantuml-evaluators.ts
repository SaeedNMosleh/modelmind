import { PlantUMLValidationResult } from './types';

export interface PlantUMLEvaluatorResult {
  pass: boolean;
  score: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export class PlantUMLEvaluators {
  static isValidPlantUML(output: string): PlantUMLEvaluatorResult {
    const trimmed = output.trim();
    
    const hasStartUML = /@startuml/i.test(trimmed);
    const hasEndUML = /@enduml/i.test(trimmed);
    
    if (!hasStartUML || !hasEndUML) {
      return {
        pass: false,
        score: 0,
        reason: 'Missing @startuml or @enduml tags',
        metadata: { hasStartUML, hasEndUML }
      };
    }

    const startIndex = trimmed.search(/@startuml/i);
    const endIndex = trimmed.search(/@enduml/i);
    
    if (startIndex >= endIndex) {
      return {
        pass: false,
        score: 0.3,
        reason: '@enduml appears before @startuml',
        metadata: { startIndex, endIndex }
      };
    }

    const content = trimmed.substring(startIndex, endIndex + 7);
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length < 3) {
      return {
        pass: false,
        score: 0.5,
        reason: 'Diagram appears to be empty or too minimal',
        metadata: { lineCount: lines.length }
      };
    }

    return {
      pass: true,
      score: 1.0,
      reason: 'Valid PlantUML syntax detected',
      metadata: { 
        lineCount: lines.length,
        hasStartUML,
        hasEndUML
      }
    };
  }

  static diagramTypeValidator(expectedType: string) {
    return (output: string): PlantUMLEvaluatorResult => {
      const validation = this.isValidPlantUML(output);
      if (!validation.pass) {
        return validation;
      }

      const diagramType = this.detectDiagramType(output);
      
      if (diagramType.toLowerCase() === expectedType.toLowerCase()) {
        return {
          pass: true,
          score: 1.0,
          reason: `Correct diagram type: ${diagramType}`,
          metadata: { detectedType: diagramType, expectedType }
        };
      }

      const partialMatch = diagramType.includes(expectedType.toLowerCase()) || 
                          expectedType.toLowerCase().includes(diagramType.toLowerCase());

      return {
        pass: partialMatch,
        score: partialMatch ? 0.7 : 0.2,
        reason: partialMatch 
          ? `Partial match for diagram type. Expected: ${expectedType}, Found: ${diagramType}`
          : `Incorrect diagram type. Expected: ${expectedType}, Found: ${diagramType}`,
        metadata: { detectedType: diagramType, expectedType, partialMatch }
      };
    };
  }

  static qualityScorer(output: string): PlantUMLEvaluatorResult {
    const validation = this.isValidPlantUML(output);
    if (!validation.pass) {
      return { ...validation, score: Math.min(validation.score, 0.3) };
    }

    let score = 0.5; // Base score for valid PlantUML
    const issues: string[] = [];
    const positives: string[] = [];

    const content = this.extractDiagramContent(output);
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    // Check for comments and documentation
    const commentLines = lines.filter(line => line.trim().startsWith("'") || line.trim().startsWith('note'));
    if (commentLines.length > 0) {
      score += 0.1;
      positives.push('Contains documentation/comments');
    }

    // Check for proper indentation
    const properlyIndented = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('@') || trimmed === '') return true;
      return /^(\s{2,}|\t)/.test(line) || !line.startsWith(' ');
    });
    
    if (properlyIndented.length >= lines.length * 0.8) {
      score += 0.1;
      positives.push('Good indentation');
    } else {
      issues.push('Inconsistent indentation');
    }

    // Check for naming conventions
    const hasGoodNaming = /[A-Z][a-zA-Z]*/.test(content);
    if (hasGoodNaming) {
      score += 0.1;
      positives.push('Good naming conventions');
    } else {
      issues.push('Poor naming conventions');
    }

    // Check diagram complexity (not too simple, not too complex)
    if (lines.length < 5) {
      score -= 0.1;
      issues.push('Diagram too simple');
    } else if (lines.length > 50) {
      score -= 0.1;
      issues.push('Diagram might be too complex');
    } else {
      score += 0.1;
      positives.push('Appropriate complexity');
    }

    // Check for relationships/connections
    const hasRelationships = /(-+>|<-+|\*-+|\|-+|o-+)/.test(content);
    if (hasRelationships) {
      score += 0.1;
      positives.push('Contains relationships');
    } else {
      issues.push('No relationships found');
    }

    score = Math.max(0, Math.min(1, score));

    return {
      pass: score >= 0.6,
      score,
      reason: score >= 0.6 
        ? `Good quality diagram (${positives.join(', ')})`
        : `Quality issues found: ${issues.join(', ')}`,
      metadata: {
        lineCount: lines.length,
        commentLines: commentLines.length,
        issues,
        positives,
        hasRelationships
      }
    };
  }

  static complexityAnalyzer(output: string): PlantUMLEvaluatorResult {
    const validation = this.isValidPlantUML(output);
    if (!validation.pass) {
      return validation;
    }

    const content = this.extractDiagramContent(output);
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    let complexity = 0;
    const factors: string[] = [];

    // Count entities (classes, actors, etc.)
    const entityMatches = content.match(/(class|interface|enum|actor|participant|entity)\s+\w+/gi);
    const entityCount = entityMatches?.length || 0;
    complexity += entityCount * 2;
    factors.push(`${entityCount} entities`);

    // Count relationships
    const relationshipMatches = content.match(/(-+>|<-+|\*-+|\|-+|o-+)/g);
    const relationshipCount = relationshipMatches?.length || 0;
    complexity += relationshipCount * 1.5;
    factors.push(`${relationshipCount} relationships`);

    // Count methods/attributes
    const methodMatches = content.match(/[+\-#~]\s*\w+\s*\(/g);
    const methodCount = methodMatches?.length || 0;
    complexity += methodCount * 0.5;
    factors.push(`${methodCount} methods`);

    // Count nested structures
    const nestedMatches = content.match(/\{[\s\S]*?\}/g);
    const nestedCount = nestedMatches?.length || 0;
    complexity += nestedCount * 3;
    factors.push(`${nestedCount} nested structures`);

    let complexityLevel: 'low' | 'medium' | 'high';
    let score: number;

    if (complexity < 10) {
      complexityLevel = 'low';
      score = 0.8; // Simple is often good
    } else if (complexity < 25) {
      complexityLevel = 'medium';
      score = 1.0; // Optimal complexity
    } else {
      complexityLevel = 'high';
      score = 0.6; // High complexity might be hard to read
    }

    return {
      pass: true,
      score,
      reason: `Diagram complexity: ${complexityLevel} (score: ${complexity})`,
      metadata: {
        complexityScore: complexity,
        complexityLevel,
        factors,
        entityCount,
        relationshipCount,
        methodCount,
        nestedCount
      }
    };
  }

  static componentExtractor(output: string): PlantUMLEvaluatorResult {
    const validation = this.isValidPlantUML(output);
    if (!validation.pass) {
      return validation;
    }

    const content = this.extractDiagramContent(output);
    const components = this.extractComponents(content);

    const hasComponents = Object.values(components).some(arr => arr.length > 0);
    
    if (!hasComponents) {
      return {
        pass: false,
        score: 0.2,
        reason: 'No valid components found in diagram',
        metadata: components
      };
    }

    const totalComponents = Object.values(components).reduce((sum, arr) => sum + arr.length, 0);
    const score = Math.min(1.0, 0.5 + (totalComponents * 0.1));

    return {
      pass: true,
      score,
      reason: `Found ${totalComponents} components in diagram`,
      metadata: {
        ...components,
        totalComponents
      }
    };
  }

  private static detectDiagramType(output: string): string {
    const content = output.toLowerCase();
    
    if (content.includes('participant') || content.includes('actor')) {
      return 'sequence';
    }
    if (content.includes('class') || content.includes('interface')) {
      return 'class';
    }
    if (content.includes('start') || content.includes('stop') || content.includes('if (')) {
      return 'activity';
    }
    if (content.includes('state') || content.includes('[*]')) {
      return 'state';
    }
    if (content.includes('component') || content.includes('[') && content.includes(']')) {
      return 'component';
    }
    if (content.includes('usecase') || content.includes('actor')) {
      return 'use-case';
    }
    
    return 'unknown';
  }

  private static extractDiagramContent(output: string): string {
    const startIndex = output.search(/@startuml/i);
    const endIndex = output.search(/@enduml/i);
    
    if (startIndex === -1 || endIndex === -1) {
      return output;
    }
    
    return output.substring(startIndex + 9, endIndex).trim();
  }

  private static extractComponents(content: string): {
    classes: string[];
    interfaces: string[];
    actors: string[];
    participants: string[];
    relationships: string[];
    methods: string[];
    attributes: string[];
    notes: string[];
  } {
    return {
      classes: this.extractMatches(content, /class\s+(\w+)/gi),
      interfaces: this.extractMatches(content, /interface\s+(\w+)/gi),
      actors: this.extractMatches(content, /actor\s+(\w+)/gi),
      participants: this.extractMatches(content, /participant\s+(\w+)/gi),
      relationships: this.extractMatches(content, /(\w+)\s*(-+>|<-+|\*-+|\|-+|o-+)\s*(\w+)/g),
      methods: this.extractMatches(content, /[+\-#~]\s*(\w+\s*\([^)]*\))/g),
      attributes: this.extractMatches(content, /[+\-#~]\s*(\w+\s*:\s*\w+)/g),
      notes: this.extractMatches(content, /note\s+(left|right|top|bottom|over)\s*:\s*(.+)/gi)
    };
  }

  private static extractMatches(content: string, regex: RegExp): string[] {
    const matches = content.match(regex);
    return matches ? matches.map(match => match.trim()) : [];
  }
}

// Custom evaluator functions for PromptFoo
export const plantUMLEvaluators = {
  'is-valid-plantuml': async (output: string) => {
    return PlantUMLEvaluators.isValidPlantUML(output);
  },
  
  'diagram-type': (expectedType: string) => async (output: string) => {
    return PlantUMLEvaluators.diagramTypeValidator(expectedType)(output);
  },
  
  'quality-score': async (output: string) => {
    return PlantUMLEvaluators.qualityScorer(output);
  },
  
  'complexity-analysis': async (output: string) => {
    return PlantUMLEvaluators.complexityAnalyzer(output);
  },
  
  'component-extraction': async (output: string) => {
    return PlantUMLEvaluators.componentExtractor(output);
  }
};