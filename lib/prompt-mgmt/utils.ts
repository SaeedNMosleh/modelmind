import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  PromptMgmtPrompt, 
  PromptFilters, 
  TemplateVariable, 
  TemplateValidationResult,
  DiffResult,
  DiffChunk,
  ValidationError
} from './types';
import { AgentType } from '../database/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Template variable extraction
export function extractTemplateVariables(template: string): TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  // Match single braces that are NOT preceded or followed by another brace
  const variableRegex = /(?<!\{)\{([^{}]+)\}(?!\})/g;
  const matches = template.matchAll(variableRegex);
  
  const seen = new Set<string>();
  
  for (const match of matches) {
    const varName = match[1].trim();
    
    if (!seen.has(varName)) {
      seen.add(varName);
      
      // Try to infer type from context or common naming patterns
      const type = inferVariableType(varName);
      
      variables.push({
        name: varName,
        type,
        required: true, // Assume required by default
        description: generateVariableDescription(varName)
      });
    }
  }
  
  return variables;
}

function inferVariableType(varName: string): TemplateVariable['type'] {
  const lowerName = varName.toLowerCase();
  
  // Check for common patterns
  if (lowerName.includes('count') || lowerName.includes('number') || lowerName.includes('index')) {
    return 'number';
  }
  
  if (lowerName.includes('is') || lowerName.includes('has') || lowerName.includes('enabled')) {
    return 'boolean';
  }
  
  if (lowerName.includes('list') || lowerName.includes('array') || lowerName.includes('items')) {
    return 'array';
  }
  
  if (lowerName.includes('config') || lowerName.includes('options') || lowerName.includes('metadata')) {
    return 'object';
  }
  
  return 'string'; // Default to string
}

function generateVariableDescription(varName: string): string {
  // Convert camelCase to readable description
  const readable = varName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  return `${readable} parameter`;
}

// Template validation
export function validateTemplate(template: string): TemplateValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Check for basic syntax issues
  const openBraces = (template.match(/\{/g) || []).length;
  const closeBraces = (template.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Mismatched braces in template',
      severity: 'error',
      code: 'BRACE_MISMATCH'
    });
  }
  
  // Check for empty variables
  const emptyVars = template.match(/\{\s*\}/g);
  if (emptyVars) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Empty variable placeholders found',
      severity: 'error',
      code: 'EMPTY_VARIABLE'
    });
  }
  
  // Check for potentially dangerous content
  const dangerousPatterns = [
    { pattern: /eval\s*\(/gi, message: 'eval() usage detected - security risk' },
    { pattern: /function\s*\(/gi, message: 'Function definitions detected - consider if intentional' },
    { pattern: /script\s*>/gi, message: 'Script tags detected - potential XSS risk' }
  ];
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(template)) {
      warnings.push({
        line: 1,
        column: 1,
        message,
        severity: 'warning',
        code: 'SECURITY_WARNING'
      });
    }
  }
  
  // Extract variables
  const variables = extractTemplateVariables(template);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    variables
  };
}

// Filtering and searching utilities
export function filterPrompts(prompts: PromptMgmtPrompt[], filters: PromptFilters): PromptMgmtPrompt[] {
  return prompts.filter(prompt => {
    // Agent type filter
    if (filters.agentType && filters.agentType.length > 0) {
      if (!filters.agentType.includes(prompt.agentType)) {
        return false;
      }
    }
    
    // Diagram type filter
    if (filters.diagramType && filters.diagramType.length > 0) {
      const hasMatchingDiagramType = filters.diagramType.some(type => 
        prompt.diagramType.includes(type)
      );
      if (!hasMatchingDiagramType) {
        return false;
      }
    }
    
    // Operation filter
    if (filters.operation && filters.operation.length > 0) {
      if (!filters.operation.includes(prompt.operation)) {
        return false;
      }
    }
    
    // Environment filter
    if (filters.environment && filters.environment.length > 0) {
      const hasMatchingEnv = filters.environment.some(env => 
        prompt.environments.includes(env)
      );
      if (!hasMatchingEnv) {
        return false;
      }
    }
    
    // Production status filter
    if (filters.isProduction !== undefined) {
      if (prompt.isProduction !== filters.isProduction) {
        return false;
      }
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        prompt.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableContent = [
        prompt.name,
        prompt.agentType,
        prompt.operation,
        ...prompt.tags,
        ...prompt.versions.map(v => v.template)
      ].join(' ').toLowerCase();
      
      if (!searchableContent.includes(searchLower)) {
        return false;
      }
    }
    
    // Date range filter
    if (filters.dateRange) {
      const promptDate = new Date(prompt.updatedAt);
      if (promptDate < filters.dateRange.from || promptDate > filters.dateRange.to) {
        return false;
      }
    }
    
    return true;
  });
}

// Sorting utilities
export function sortPrompts(prompts: PromptMgmtPrompt[], sort: { field: string; direction: 'asc' | 'desc' }): PromptMgmtPrompt[] {
  return [...prompts].sort((a, b) => {
    let aVal: string | number | Date | undefined;
    let bVal: string | number | Date | undefined;
    
    switch (sort.field) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'agentType':
        aVal = a.agentType;
        bVal = b.agentType;
        break;
      case 'updatedAt':
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
      case 'testScore':
        aVal = a._testSummary?.avgScore || 0;
        bVal = b._testSummary?.avgScore || 0;
        break;
      case 'usage':
        aVal = a._stats?.totalTests || 0;
        bVal = b._stats?.totalTests || 0;
        break;
      default:
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
    }
    
    if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Version comparison utilities
export function generateDiff(oldContent: string, newContent: string): DiffResult {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Simple line-by-line diff (for production, consider using a library like diff)
  const chunks: DiffChunk[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Remaining lines are additions
      chunks.push({
        type: 'added',
        newStart: newIndex,
        newLines: newLines.length - newIndex,
        content: newLines.slice(newIndex).join('\n')
      });
      break;
    } else if (newIndex >= newLines.length) {
      // Remaining lines are deletions
      chunks.push({
        type: 'removed',
        oldStart: oldIndex,
        oldLines: oldLines.length - oldIndex,
        content: oldLines.slice(oldIndex).join('\n')
      });
      break;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines are the same
      let unchangedCount = 0;
      while (
        oldIndex + unchangedCount < oldLines.length &&
        newIndex + unchangedCount < newLines.length &&
        oldLines[oldIndex + unchangedCount] === newLines[newIndex + unchangedCount]
      ) {
        unchangedCount++;
      }
      
      chunks.push({
        type: 'unchanged',
        oldStart: oldIndex,
        oldLines: unchangedCount,
        newStart: newIndex,
        newLines: unchangedCount,
        content: oldLines.slice(oldIndex, oldIndex + unchangedCount).join('\n')
      });
      
      oldIndex += unchangedCount;
      newIndex += unchangedCount;
    } else {
      // Lines are different
      chunks.push({
        type: 'modified',
        oldStart: oldIndex,
        oldLines: 1,
        newStart: newIndex,
        newLines: 1,
        content: `- ${oldLines[oldIndex]}\n+ ${newLines[newIndex]}`
      });
      
      oldIndex++;
      newIndex++;
    }
  }
  
  // Calculate summary
  const summary = {
    additions: chunks.filter(c => c.type === 'added').reduce((sum, c) => sum + (c.newLines || 0), 0),
    deletions: chunks.filter(c => c.type === 'removed').reduce((sum, c) => sum + (c.oldLines || 0), 0),
    modifications: chunks.filter(c => c.type === 'modified').length,
    totalChanges: chunks.filter(c => c.type !== 'unchanged').length
  };
  
  return {
    template: chunks,
    metadata: [], // TODO: Add metadata diff if needed
    summary
  };
}

// Formatting utilities
export function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Status utilities
export function getPromptStatusColor(prompt: PromptMgmtPrompt): string {
  if (!prompt.isProduction) return 'bg-gray-100 text-gray-800';
  
  const passRate = prompt._testSummary?.passed || 0;
  const total = prompt._testSummary?.total || 0;
  
  if (total === 0) return 'bg-yellow-100 text-yellow-800';
  
  const rate = passRate / total;
  if (rate >= 0.9) return 'bg-green-100 text-green-800';
  if (rate >= 0.7) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export function getAgentTypeIcon(agentType: AgentType): string {
  const icons = {
    [AgentType.GENERATOR]: '🔧',
    [AgentType.MODIFIER]: '✏️',
    [AgentType.ANALYZER]: '🔍',
    [AgentType.CLASSIFIER]: '🏷️'
  };
  
  return icons[agentType] || '📄';
}

// Validation utilities
export function validatePromptName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  if (name.length < 3) return 'Name must be at least 3 characters';
  if (name.length > 100) return 'Name must be less than 100 characters';
  if (!/^[a-zA-Z0-9\-_\s]+$/.test(name)) return 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
  return null;
}

export function validateSemanticVersion(version: string): string | null {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  
  if (!semverRegex.test(version)) {
    return 'Version must follow semantic versioning (e.g., 1.0.0)';
  }
  
  return null;
}

// Export utilities
export function exportPromptData(prompts: PromptMgmtPrompt[], format: 'json' | 'csv' | 'yaml'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(prompts, null, 2);
    
    case 'csv':
      const headers = ['Name', 'Agent Type', 'Operation', 'Production', 'Tags', 'Created', 'Updated'];
      const rows = prompts.map(p => [
        p.name,
        p.agentType,
        p.operation,
        p.isProduction ? 'Yes' : 'No',
        p.tags.join('; '),
        formatTimestamp(p.createdAt),
        formatTimestamp(p.updatedAt)
      ]);
      
      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    case 'yaml':
      // Simple YAML export (for production, use a proper YAML library)
      return prompts.map(p => 
        `name: "${p.name}"\n` +
        `agentType: "${p.agentType}"\n` +
        `operation: "${p.operation}"\n` +
        `isProduction: ${p.isProduction}\n` +
        `tags: [${p.tags.map(t => `"${t}"`).join(', ')}]\n` +
        `---\n`
      ).join('\n');
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'mod+s',
  TEST: 'mod+t',
  DUPLICATE: 'mod+d',
  DELETE: 'mod+delete',
  SEARCH: 'mod+k',
  NEW_PROMPT: 'mod+n',
  TOGGLE_SIDEBAR: 'mod+b',
  NEXT_TAB: 'ctrl+tab',
  PREV_TAB: 'ctrl+shift+tab'
} as const;