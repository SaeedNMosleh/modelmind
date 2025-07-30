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
  Settings,
  Expand,
  // Compress - Use Compass instead
  Compass
} from 'lucide-react';
import { PromptMgmtPrompt, PromptMgmtVersion } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; - Unused
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  showVariableEditor?: boolean;
  allowTesting?: boolean;
  className?: string;
}

export function PromptPreview({
  prompt,
  version,
  variables = {},
  onVariablesChange,
  showMetadata = false,
  showVariables = false,
  showVariableEditor = false,
  allowTesting = false,
  className
}: PromptPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [testVariables, setTestVariables] = useState<Record<string, unknown>>(variables);
  
  // Use the specified version or the current one
  const activeVersion = version || prompt.versions.find(v => v.version === prompt.currentVersion);
  const template = activeVersion?.template || '';
  
  // Extract variables from template
  const templateVariables = useMemo(() => {
    return extractTemplateVariables(template);
  }, [template]);
  
  // Render template with variables
  const renderedTemplate = useMemo(() => {
    let rendered = template;
    
    // Replace variables with their values
    templateVariables.forEach(variable => {
      const value = testVariables[variable.name] || variables[variable.name];
      if (value !== undefined) {
        const placeholder = `{${variable.name}}`;
        const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        rendered = rendered.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), displayValue);
      }
    });
    
    return rendered;
  }, [template, templateVariables, testVariables, variables]);
  
  // Handle variable changes
  const handleVariableChange = (name: string, value: unknown) => {
    const updated = { ...testVariables, [name]: value };
    setTestVariables(updated);
    onVariablesChange?.(updated);
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
    variable => variable.required && (testVariables[variable.name] === undefined || testVariables[variable.name] === '')
  );
  
  const VariableEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Template Variables</h3>
        <Badge variant="outline">
          {templateVariables.length} variable{templateVariables.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      {templateVariables.length === 0 ? (
        <p className="text-sm text-gray-500">No variables found in template</p>
      ) : (
        <div className="space-y-3">
          {templateVariables.map(variable => (
            <div key={variable.name} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor={`var-${variable.name}`} className="text-sm font-medium">
                  {variable.name}
                </Label>
                {variable.required && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    Required
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs px-1 py-0 capitalize">
                  {variable.type}
                </Badge>
              </div>
              
              {variable.description && (
                <p className="text-xs text-gray-500">{variable.description}</p>
              )}
              
              {variable.type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`var-${variable.name}`}
                    checked={Boolean(testVariables[variable.name])}
                    onCheckedChange={(checked) => handleVariableChange(variable.name, checked)}
                  />
                  <span className="text-sm">
                    {testVariables[variable.name] ? 'True' : 'False'}
                  </span>
                </div>
              ) : variable.type === 'object' || variable.type === 'array' ? (
                <Textarea
                  id={`var-${variable.name}`}
                  value={
                    testVariables[variable.name] 
                      ? JSON.stringify(testVariables[variable.name], null, 2)
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
                  placeholder={
                    variable.type === 'array' 
                      ? '["item1", "item2"]' 
                      : '{"key": "value"}'
                  }
                  rows={3}
                  className="text-sm font-mono"
                />
              ) : (
                <Input
                  id={`var-${variable.name}`}
                  type={variable.type === 'number' ? 'number' : 'text'}
                  value={String(testVariables[variable.name] || '')}
                  onChange={(e) => {
                    const value = variable.type === 'number' 
                      ? parseFloat(e.target.value) || 0
                      : e.target.value;
                    handleVariableChange(variable.name, value);
                  }}
                  placeholder={`Enter ${variable.name}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Missing Variables Warning */}
      {missingVariables.length > 0 && (
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
            'border rounded-lg p-4 bg-gray-50 font-mono text-sm whitespace-pre-wrap',
            isExpanded ? 'max-h-none' : 'max-h-96 overflow-y-auto'
          )}>
            {showRaw ? template : renderedTemplate}
          </div>
          
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
                  const hasValue = testVariables[variable.name] !== undefined && 
                                   testVariables[variable.name] !== '';
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
      
      {/* Variable Editor */}
      {showVariableEditor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Variable Editor</span>
            </CardTitle>
            <CardDescription>
              Set values for template variables to see the rendered output
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariableEditor />
          </CardContent>
        </Card>
      )}
      
      {/* Variables Display */}
      {showVariables && templateVariables.length > 0 && !showVariableEditor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Template Variables</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templateVariables.map(variable => (
                <div key={variable.name} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {variable.name}
                      </code>
                      <Badge variant="outline" className="text-xs capitalize">
                        {variable.type}
                      </Badge>
                      {variable.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {variable.description && (
                      <p className="text-sm text-gray-600">{variable.description}</p>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {testVariables[variable.name] !== undefined ? (
                      <span className="text-green-600">✓ Set</span>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </div>
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
              // Handle test execution
              console.log('Testing with variables:', testVariables);
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Test Template
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setTestVariables({})}
          >
            Clear Variables
          </Button>
        </div>
      )}
    </div>
  );
}