import { createEnhancedLogger } from "@/lib/utils/consola-logger";
import { connectToDatabase } from '../database/connection';
import { 
  Prompt, 
  PromptValidationSchema, 
  PromptVersionValidationSchema 
} from '../database/models/prompt';
import { 
  TestCase, 
  TestCaseValidationSchema 
} from '../database/models/testCase';
import { AgentType, PromptOperation } from '../database/types';
// PromptEnvironment removed - using isProduction boolean
import { 
  isValidAgentOperation, 
  canSelectDiagramTypes 
} from '../prompt-mgmt/agent-operation-config';

const logger = createEnhancedLogger('validation-utils');

export interface ValidationIssue {
  type: 'error' | 'warning';
  collection: string;
  documentId?: string;
  field?: string;
  issue: string;
  details?: unknown;
}

export interface ValidationReport {
  timestamp: Date;
  isValid: boolean;
  totalIssues: number;
  errors: number;
  warnings: number;
  collections: {
    prompts: { total: number; valid: number; issues: ValidationIssue[] };
    testCases: { total: number; valid: number; issues: ValidationIssue[] };
  };
  issues: ValidationIssue[];
  summary: string[];
}

export class ValidationManager {
  private issues: ValidationIssue[] = [];

  async validateAllPrompts(): Promise<ValidationReport> {
    this.issues = [];
    
    await connectToDatabase();
    logger.info('Starting validation of all prompts and test cases...');

    // Validate prompts
    const promptResults = await this.validatePrompts();
    
    // Validate test cases
    const testCaseResults = await this.validateTestCases();

    // Generate report
    const report = this.generateReport(promptResults, testCaseResults);
    
    logger.info(`Validation completed. Found ${report.totalIssues} issues (${report.errors} errors, ${report.warnings} warnings)`);
    
    return report;
  }

  private async validatePrompts(): Promise<{ total: number; valid: number; issues: ValidationIssue[] }> {
    const prompts = await Prompt.find({});
    let validCount = 0;
    const issues: ValidationIssue[] = [];

    for (const prompt of prompts) {
      let promptValid = true;

      try {
        // Validate basic prompt structure
        const basicValidation = PromptValidationSchema.safeParse({
          name: prompt.name,
          agentType: prompt.agentType,
          diagramType: prompt.diagramType,
          operation: prompt.operation,
          isProduction: prompt.isProduction,
          tags: prompt.tags,
          metadata: prompt.metadata
        });

        if (!basicValidation.success) {
          promptValid = false;
          issues.push({
            type: 'error',
            collection: 'prompts', 
            documentId: prompt._id.toString(),
            issue: 'Schema validation failed',
            details: basicValidation.error.issues
          });
        }

        // Validate versions
        if (!prompt.versions || prompt.versions.length === 0) {
          promptValid = false;
          issues.push({
            type: 'error',
            collection: 'prompts',
            documentId: prompt._id.toString(),
            field: 'versions',
            issue: 'No versions found'
          });
        } else {
          // Validate that primaryVersion exists and is set
          if (!prompt.primaryVersion) {
            promptValid = false;
            issues.push({
              type: 'error',
              collection: 'prompts',
              documentId: prompt._id.toString(),
              field: 'primaryVersion',
              issue: 'Primary version is not set'
            });
          } else {
            // Validate primary version exists in versions array
            const primaryVersion = prompt.versions.find(v => v.version === prompt.primaryVersion);
            if (!primaryVersion) {
              promptValid = false;
              issues.push({
                type: 'error',
                collection: 'prompts',
                documentId: prompt._id.toString(),
                field: 'primaryVersion',
                issue: `Primary version ${prompt.primaryVersion} not found in versions array`
              });
            }
          }

          // Validate each version
          for (const version of prompt.versions) {
            const versionValidation = PromptVersionValidationSchema.safeParse(version);
            if (!versionValidation.success) {
              promptValid = false;
              issues.push({
                type: 'error',
                collection: 'prompts',
                documentId: prompt._id.toString(),
                field: `versions.${version.version}`,
                issue: 'Version validation failed',
                details: versionValidation.error.issues
              });
            }

            // Check for placeholder variables in template
            this.validateTemplateVariables(prompt._id.toString(), version.version, version.template, issues);
          }
        }

        // Validate prompt name uniqueness
        const duplicateCount = await Prompt.countDocuments({ 
          name: prompt.name, 
          _id: { $ne: prompt._id } 
        });
        
        if (duplicateCount > 0) {
          issues.push({
            type: 'warning',
            collection: 'prompts',
            documentId: prompt._id.toString(),
            field: 'name',
            issue: `Duplicate prompt name "${prompt.name}" found ${duplicateCount} times`
          });
        }

        // Validate agent-operation compatibility
        this.validateAgentOperationLogic(prompt, issues);

        // Validate PromptFoo compatibility
        this.validatePromptFooCompatibility(prompt, issues);

        if (promptValid) validCount++;

      } catch (error) {
        issues.push({
          type: 'error',
          collection: 'prompts',
          documentId: prompt._id.toString(),
          issue: 'Validation error',
          details: (error as Error).message
        });
      }
    }

    return { total: prompts.length, valid: validCount, issues };
  }

  private async validateTestCases(): Promise<{ total: number; valid: number; issues: ValidationIssue[] }> {
    const testCases = await TestCase.find({});
    let validCount = 0;
    const issues: ValidationIssue[] = [];

    for (const testCase of testCases) {
      let testCaseValid = true;

      try {
        // Validate test case schema
        const validation = TestCaseValidationSchema.safeParse({
          promptId: testCase.promptId.toString(),
          name: testCase.name,
          description: testCase.description,
          vars: testCase.vars,
          assert: testCase.assert,
          tags: testCase.tags,
          isActive: testCase.isActive,
          metadata: testCase.metadata
        });

        if (!validation.success) {
          testCaseValid = false;
          issues.push({
            type: 'error',
            collection: 'testCases',
            documentId: testCase._id.toString(),
            issue: 'Schema validation failed',
            details: validation.error.issues
          });
        }

        // Validate prompt exists
        const promptExists = await Prompt.findById(testCase.promptId);
        if (!promptExists) {
          testCaseValid = false;
          issues.push({
            type: 'error',
            collection: 'testCases',
            documentId: testCase._id.toString(),
            field: 'promptId',
            issue: `Referenced prompt ${testCase.promptId} not found`
          });
        }

        // Validate PromptFoo format
        try {
          const promptFooFormat = testCase.toPromptFooFormat();
          if (!promptFooFormat.assert || promptFooFormat.assert.length === 0) {
            issues.push({
              type: 'warning',
              collection: 'testCases',
              documentId: testCase._id.toString(),
              field: 'assert',
              issue: 'No assertions defined for test case'
            });
          }
        } catch (error) {
          issues.push({
            type: 'error',
            collection: 'testCases',
            documentId: testCase._id.toString(),
            issue: 'Failed to convert to PromptFoo format',
            details: (error as Error).message
          });
        }

        if (testCaseValid) validCount++;

      } catch (error) {
        issues.push({
          type: 'error',
          collection: 'testCases',
          documentId: testCase._id.toString(),
          issue: 'Validation error',
          details: (error as Error).message
        });
      }
    }

    return { total: testCases.length, valid: validCount, issues };
  }

  private validateAgentOperationLogic(prompt: { 
    _id: string; 
    agentType: string;
    operation: string;
    diagramType: string[];
  }, issues: ValidationIssue[]): void {
    // Validate agent-operation compatibility
    if (!isValidAgentOperation(prompt.agentType as AgentType, prompt.operation as PromptOperation)) {
      issues.push({
        type: 'error',
        collection: 'prompts',
        documentId: prompt._id.toString(),
        field: 'operation',
        issue: `Operation "${prompt.operation}" is not valid for agent "${prompt.agentType}"`
      });
    }

    // Validate diagram type logic
    const supportsDiagramTypes = canSelectDiagramTypes(prompt.agentType as AgentType, prompt.operation as PromptOperation);
    
    if (!supportsDiagramTypes && prompt.diagramType.length > 0) {
      issues.push({
        type: 'error',
        collection: 'prompts',
        documentId: prompt._id.toString(),
        field: 'diagramType',
        issue: `Agent "${prompt.agentType}" with operation "${prompt.operation}" should not have diagram types (should be generic). Found: ${prompt.diagramType.join(', ')}`
      });
    } else if (supportsDiagramTypes && prompt.diagramType.length === 0) {
      issues.push({
        type: 'warning',
        collection: 'prompts',
        documentId: prompt._id.toString(),
        field: 'diagramType',
        issue: `Agent "${prompt.agentType}" with operation "${prompt.operation}" can support diagram-specific prompts but has no diagram types defined. Consider adding specific diagram types for better targeting.`
      });
    }
  }

  private validateTemplateVariables(promptId: string, version: string, template: string, issues: ValidationIssue[]): void {
    // Find all {variable} patterns
    const variablePattern = /\{([^}]+)\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      variables.add(match[1].trim());
    }

    if (variables.size === 0) {
      issues.push({
        type: 'warning',
        collection: 'prompts',
        documentId: promptId,
        field: `versions.${version}.template`,
        issue: 'Template contains no variables ({variable}). This may not work with PromptFoo.'
      });
    }

    // Check for common variable naming issues
    for (const variable of variables) {
      if (variable.includes(' ')) {
        issues.push({
          type: 'warning',
          collection: 'prompts',
          documentId: promptId,
          field: `versions.${version}.template`,
          issue: `Variable "${variable}" contains spaces, which may cause issues`
        });
      }

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
        issues.push({
          type: 'warning',
          collection: 'prompts',
          documentId: promptId,
          field: `versions.${version}.template`,
          issue: `Variable "${variable}" should follow identifier naming conventions`
        });
      }
    }
  }

  private validatePromptFooCompatibility(prompt: { 
    _id: string; 
    primaryVersion?: string;
    versions: Array<{
      version: string;
      template: string;
      variables: string[];
    }>;
    isProduction?: boolean;
  }, issues: ValidationIssue[]): void {
    // Check if prompt has appropriate metadata for PromptFoo
    const currentVersion = prompt.primaryVersion 
      ? prompt.versions.find((v) => v.version === prompt.primaryVersion)
      : prompt.versions[0]; // fallback to first version if no primary set
    if (!currentVersion) return;

    // Validate that template has proper structure
    const template = currentVersion.template;
    
    // Check for common PromptFoo issues
    if (template.includes('```')) {
      issues.push({
        type: 'warning',
        collection: 'prompts',
        documentId: prompt._id.toString(),
        field: 'template',
        issue: 'Template contains code blocks (```), ensure PromptFoo can handle this format'
      });
    }

    // Validate production status
    if (typeof prompt.isProduction !== 'boolean') {
      issues.push({
        type: 'error',
        collection: 'prompts',
        documentId: prompt._id.toString(),
        field: 'isProduction',
        issue: 'Production status must be a boolean value'
      });
    }
  }

  private generateReport(
    promptResults: { total: number; valid: number; issues: ValidationIssue[] },
    testCaseResults: { total: number; valid: number; issues: ValidationIssue[] }
  ): ValidationReport {
    const allIssues = [...promptResults.issues, ...testCaseResults.issues];
    const errors = allIssues.filter(i => i.type === 'error').length;
    const warnings = allIssues.filter(i => i.type === 'warning').length;

    const summary = [
      `Validated ${promptResults.total} prompts (${promptResults.valid} valid)`,
      `Validated ${testCaseResults.total} test cases (${testCaseResults.valid} valid)`,
      `Found ${allIssues.length} total issues (${errors} errors, ${warnings} warnings)`
    ];

    if (errors === 0) {
      summary.push('✅ All critical validations passed');
    } else {
      summary.push(`❌ ${errors} critical errors must be fixed`);
    }

    if (warnings > 0) {
      summary.push(`⚠️  ${warnings} warnings should be reviewed`);
    }

    return {
      timestamp: new Date(),
      isValid: errors === 0,
      totalIssues: allIssues.length,
      errors,
      warnings,
      collections: {
        prompts: promptResults,
        testCases: testCaseResults
      },
      issues: allIssues,
      summary
    };
  }

  async validateSemanticVersioning(versions: string[]): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

    for (const version of versions) {
      if (!semverRegex.test(version)) {
        issues.push({
          type: 'error',
          collection: 'validation',
          field: 'version',
          issue: `Invalid semantic version: ${version}. Must follow format X.Y.Z`
        });
      }
    }

    return issues;
  }

  formatReport(report: ValidationReport): string {
    const lines = [
      '='.repeat(60),
      'PROMPT VALIDATION REPORT',
      '='.repeat(60),
      `Generated: ${report.timestamp.toISOString()}`,
      `Status: ${report.isValid ? '✅ VALID' : '❌ INVALID'}`,
      '',
      'SUMMARY:',
      ...report.summary.map(s => `  ${s}`),
      '',
      'COLLECTIONS:',
      `  Prompts: ${report.collections.prompts.valid}/${report.collections.prompts.total} valid`,
      `  Test Cases: ${report.collections.testCases.valid}/${report.collections.testCases.total} valid`,
      ''
    ];

    if (report.issues.length > 0) {
      lines.push('ISSUES:');
      
      const errorIssues = report.issues.filter(i => i.type === 'error');
      const warningIssues = report.issues.filter(i => i.type === 'warning');

      if (errorIssues.length > 0) {
        lines.push('', '❌ ERRORS:');
        errorIssues.forEach(issue => {
          lines.push(`  [${issue.collection}] ${issue.documentId ? `${issue.documentId}: ` : ''}${issue.issue}`);
          if (issue.field) lines.push(`    Field: ${issue.field}`);
          if (issue.details) lines.push(`    Details: ${JSON.stringify(issue.details, null, 2).split('\n').map(l => `    ${l}`).join('\n')}`);
        });
      }

      if (warningIssues.length > 0) {
        lines.push('', '⚠️  WARNINGS:');
        warningIssues.forEach(issue => {
          lines.push(`  [${issue.collection}] ${issue.documentId ? `${issue.documentId}: ` : ''}${issue.issue}`);
          if (issue.field) lines.push(`    Field: ${issue.field}`);
        });
      }
    }

    lines.push('', '='.repeat(60));
    return lines.join('\n');
  }
}

export const validationManager = new ValidationManager();