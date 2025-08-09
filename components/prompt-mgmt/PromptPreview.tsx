'use client';

import React, { useState, useMemo } from 'react';
import { 
  Eye, 
  // Code, - Unused
  Play, 
  Copy, 
  Check, 
  AlertCircle,
  FileText,
  Expand,
  // Compress - Use Compass instead
  Compass
} from 'lucide-react';
import { PromptMgmtPrompt, PromptMgmtVersion } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; - Unused
// import { Separator } from '@/components/ui/separator'; - Unused
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extractTemplateVariables, formatTimestamp } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

interface PromptPreviewProps {
  prompt: PromptMgmtPrompt;
  version?: PromptMgmtVersion;
  variables?: Record<string, unknown>;
  onVariablesChange?: (variables: Record<string, unknown>) => void;
  showMetadata?: boolean;
  showVariables?: boolean;
  allowTesting?: boolean;
  showMissingVariableWarning?: boolean;
  allowVariableEditing?: boolean;
  className?: string;
}

export function PromptPreview({
  prompt,
  version,
  variables = {},
  onVariablesChange,
  showMetadata = false,
  showVariables = false,
  allowTesting = false,
  showMissingVariableWarning = true,
  allowVariableEditing = false,
  className
}: PromptPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [localVariables, setLocalVariables] = useState<Record<string, unknown>>(variables);
  
  // Use the specified version or the current one
  const activeVersion = version || prompt.versions.find(v => v.version === prompt.primaryVersion);
  const template = activeVersion?.template || '';
  
  // Extract variables from template
  const templateVariables = useMemo(() => {
    return extractTemplateVariables(template);
  }, [template]);
  
  // Use local variables when editing is allowed, otherwise use prop variables
  const currentVariables = allowVariableEditing ? localVariables : variables;
  
  // Render template with variables (HTML version for styling)
  const renderedTemplateHtml = useMemo(() => {
    let rendered = template;
    
    // Replace variables with their values or default values, wrapped in styled spans
    templateVariables.forEach((variable) => {
      const value = currentVariables[variable.name];
      const placeholder = `{${variable.name}}`;
      
      let displayValue: string;
      let isUserProvided = false;
      
      if (value !== undefined && value !== null && value !== '') {
        displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        isUserProvided = true;
      } else {
        // Use default value or a meaningful placeholder
        if (variable.defaultValue !== undefined) {
          displayValue = typeof variable.defaultValue === 'object' 
            ? JSON.stringify(variable.defaultValue, null, 2) 
            : String(variable.defaultValue);
        } else {
          // Generate default based on variable name and type
          switch (variable.type) {
            case 'string':
              displayValue = `[${variable.name} example]`;
              break;
            case 'number':
              displayValue = '42';
              break;
            case 'boolean':
              displayValue = 'true';
              break;
            case 'array':
              displayValue = '["item1", "item2"]';
              break;
            case 'object':
              displayValue = '{"key": "value"}';
              break;
            default:
              displayValue = `[${variable.name}]`;
          }
        }
      }
      
      // Create a unique identifier for this variable replacement
      const wrappedValue = `<span class="variable-value ${isUserProvided ? 'user-provided' : 'default-value'}" data-variable="${variable.name}">${displayValue}</span>`;
      
      rendered = rendered.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), wrappedValue);
    });
    
    return rendered;
  }, [template, templateVariables, currentVariables]);
  
  // Plain text version for copying
  const renderedTemplate = useMemo(() => {
    let rendered = template;
    
    templateVariables.forEach(variable => {
      const value = currentVariables[variable.name];
      const placeholder = `{${variable.name}}`;
      
      let displayValue: string;
      if (value !== undefined && value !== null && value !== '') {
        displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      } else {
        if (variable.defaultValue !== undefined) {
          displayValue = typeof variable.defaultValue === 'object' 
            ? JSON.stringify(variable.defaultValue, null, 2) 
            : String(variable.defaultValue);
        } else {
          switch (variable.type) {
            case 'string':
              displayValue = `[${variable.name} example]`;
              break;
            case 'number':
              displayValue = '42';
              break;
            case 'boolean':
              displayValue = 'true';
              break;
            case 'array':
              displayValue = '["item1", "item2"]';
              break;
            case 'object':
              displayValue = '{"key": "value"}';
              break;
            default:
              displayValue = `[${variable.name}]`;
          }
        }
      }
      
      rendered = rendered.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), displayValue);
    });
    
    return rendered;
  }, [template, templateVariables, currentVariables]);
  
  // Handle variable changes when editing is allowed
  const handleVariableChange = (name: string, value: unknown) => {
    const updated = { ...localVariables, [name]: value };
    setLocalVariables(updated);
    onVariablesChange?.(updated);
  };
  
  // Handle clear variables
  const handleClearVariables = () => {
    const cleared = {};
    setLocalVariables(cleared);
    onVariablesChange?.(cleared);
  };
  
  // Copy to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };
  
  // Missing variables check
  const missingVariables = templateVariables.filter(
    variable => variable.required && (currentVariables[variable.name] === undefined || currentVariables[variable.name] === '')
  );
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Missing Variables Warning */}
      {showMissingVariableWarning && missingVariables.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Missing required variables: {missingVariables.map(v => v.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Template Preview</CardTitle>
              {activeVersion && (
                <Badge variant="outline">v{activeVersion.version}</Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="show-raw" className="text-sm">Raw</Label>
                <Switch
                  id="show-raw"
                  checked={showRaw}
                  onCheckedChange={setShowRaw}
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Compass className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(showRaw ? template : renderedTemplate)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {showMetadata && activeVersion && (
            <CardDescription className="flex items-center space-x-4 text-sm">
              {activeVersion.changelog && (
                <span>Changes: {activeVersion.changelog}</span>
              )}
              <span>Created: {formatTimestamp(activeVersion.createdAt)}</span>
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent>
          <div className={cn(
            'border rounded-lg p-4 bg-gray-900 text-gray-100 font-mono text-sm whitespace-pre-wrap relative',
            isExpanded ? 'max-h-none' : 'max-h-96 overflow-y-auto'
          )}>
            {showRaw ? (
              template
            ) : (
              <div 
                dangerouslySetInnerHTML={{ __html: renderedTemplateHtml }}
                className="variable-preview"
              />
            )}
          </div>
          
          <style dangerouslySetInnerHTML={{
            __html: `
              .variable-preview .variable-value {
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
                display: inline;
                margin: 0 1px;
                transition: all 0.2s ease;
              }
              
              .variable-preview .variable-value.user-provided {
                background-color: rgba(34, 197, 94, 0.25);
                color: #10b981;
                border: 1px solid rgba(34, 197, 94, 0.4);
                box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.1);
              }
              
              .variable-preview .variable-value.default-value {
                background-color: rgba(59, 130, 246, 0.25);
                color: #3b82f6;
                border: 1px solid rgba(59, 130, 246, 0.4);
                box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
              }
              
              .variable-preview .variable-value:hover {
                transform: translateY(-1px);
                filter: brightness(1.15);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              }
            `
          }} />
          
          {!showRaw && templateVariables.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="flex items-center space-x-4 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-green-500/25 border border-green-500/40"></div>
                  <span>User values</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-blue-500/25 border border-blue-500/40"></div>
                  <span>Default values</span>
                </div>
              </div>
            </div>
          )}
          
          {templateVariables.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Variables Used</span>
                <Badge variant="outline" className="text-xs">
                  {templateVariables.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {templateVariables.map(variable => {
                  const hasValue = variables[variable.name] !== undefined && 
                                   variables[variable.name] !== '';
                  return (
                    <Badge
                      key={variable.name}
                      variant={hasValue ? "default" : "outline"}
                      className={cn(
                        "text-xs",
                        !hasValue && variable.required && "border-red-300 text-red-700"
                      )}
                    >
                      {variable.name}
                      {variable.required && !hasValue && ' *'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Variables Display/Editor */}
      {showVariables && templateVariables.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Template Variables</span>
              </CardTitle>
              {allowVariableEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearVariables}
                >
                  Clear Variables
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {templateVariables.map(variable => (
                <div key={`template-var-${variable.name}`} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`template-var-${variable.name}`} className="text-sm font-medium">
                      {variable.name}
                    </Label>
                    {variable.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {variable.type}
                    </Badge>
                  </div>
                  
                  {variable.description && (
                    <p className="text-xs text-gray-500">{variable.description}</p>
                  )}
                  
                  {allowVariableEditing ? (
                    // Editable inputs
                    variable.type === 'boolean' ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`template-var-${variable.name}`}
                          checked={Boolean(currentVariables[variable.name])}
                          onCheckedChange={(checked) => handleVariableChange(variable.name, checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {currentVariables[variable.name] ? 'True' : 'False'}
                        </span>
                      </div>
                    ) : variable.type === 'object' || variable.type === 'array' ? (
                      <Textarea
                        id={`template-var-${variable.name}`}
                        value={
                          currentVariables[variable.name] 
                            ? JSON.stringify(currentVariables[variable.name], null, 2)
                            : ''
                        }
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            handleVariableChange(variable.name, parsed);
                          } catch {
                            // Invalid JSON, keep as string for now
                            handleVariableChange(variable.name, e.target.value);
                          }
                        }}
                        onInput={(e) => {
                          // Auto-resize textarea
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        placeholder={
                          variable.type === 'array' 
                            ? '["item1", "item2"]' 
                            : '{"key": "value"}'
                        }
                        rows={3}
                        className="text-sm font-mono resize-none overflow-hidden"
                        style={{ minHeight: '60px' }}
                      />
                    ) : variable.type === 'string' ? (
                      <Textarea
                        id={`template-var-${variable.name}`}
                        value={String(currentVariables[variable.name] || '')}
                        onChange={(e) => {
                          handleVariableChange(variable.name, e.target.value);
                        }}
                        onInput={(e) => {
                          // Auto-resize textarea
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        placeholder={`Enter ${variable.name}...`}
                        rows={1}
                        className="text-sm resize-none overflow-hidden"
                        style={{ minHeight: '40px' }}
                      />
                    ) : (
                      <Input
                        id={`template-var-${variable.name}`}
                        type={variable.type === 'number' ? 'number' : 'text'}
                        value={String(currentVariables[variable.name] || '')}
                        onChange={(e) => {
                          const value = variable.type === 'number' 
                            ? parseFloat(e.target.value) || 0
                            : e.target.value;
                          handleVariableChange(variable.name, value);
                        }}
                        placeholder={`Enter ${variable.name}`}
                        className="text-sm"
                      />
                    )
                  ) : (
                    // Read-only display
                    <div className="flex items-start justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="space-y-1">
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">
                          {variable.name}
                        </code>
                      </div>
                      <div className="text-sm text-gray-500">
                        {currentVariables[variable.name] !== undefined ? (
                          <span className="text-green-600">✓ Set</span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Testing Actions */}
      {allowTesting && (
        <div className="flex items-center space-x-2">
          <Button 
            variant="default"
            disabled={missingVariables.length > 0}
            onClick={() => {
              // Show warning if there are missing variables
              if (missingVariables.length > 0) {
                alert(`Please provide values for required variables: ${missingVariables.map(v => v.name).join(', ')}`);
                return;
              }
              // Handle test execution
              console.log('Testing with variables:', currentVariables);
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Test Template
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleClearVariables}
          >
            Clear Variables
          </Button>
        </div>
      )}
    </div>
  );
}