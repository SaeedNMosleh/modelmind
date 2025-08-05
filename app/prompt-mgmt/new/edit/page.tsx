'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Settings,
  Loader2,
  Sparkles
} from 'lucide-react';
import { PromptFormData, TemplateValidationResult, PromptMgmtPrompt } from '@/lib/prompt-mgmt/types';
import { AgentType, DiagramType, PromptOperation, PromptEnvironment } from '@/lib/database/types';
import { 
  validatePromptFormData, 
  PROMPT_DEFAULTS, 
  getDefaultOperation,
  shouldShowDiagramTypes,
  allowsMultipleDiagramTypes, 
  getValidOperations,
  getAgentDescription
} from '@/lib/prompt-mgmt/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MonacoEditor } from '@/components/prompt-mgmt/MonacoEditor';
import { PromptPreview } from '@/components/prompt-mgmt/PromptPreview';
import { VariableEditor } from '@/components/prompt-mgmt/VariableEditor';
import { validateTemplate } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

export default function NewPromptEditPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    agentType: PROMPT_DEFAULTS.agentType,
    diagramType: [...PROMPT_DEFAULTS.diagramType],
    operation: PROMPT_DEFAULTS.operation,
    environments: [...PROMPT_DEFAULTS.environments],
    tags: [...PROMPT_DEFAULTS.tags],
    template: '',
    changelog: 'Initial version',
    metadata: {}
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);
  // Use useMemo for form validation to prevent unnecessary recalculations
  // Fix exhaustive-deps: use full formData as dependency
  const formValidation = useMemo(() => 
    validatePromptFormData(formData), 
    [formData]
  );
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [previewVariables, setPreviewVariables] = useState<Record<string, unknown>>({});
  
  // Load template data from localStorage if available
  useEffect(() => {
    const templateData = localStorage.getItem('promptTemplate');
    if (templateData) {
      try {
        const template = JSON.parse(templateData);
        setFormData(prev => ({
          ...prev,
          name: template.name || '',
          agentType: template.agentType || AgentType.GENERATOR,
          operation: template.operation || PromptOperation.GENERATION,
          diagramType: template.diagramType || [],
          tags: template.tags || [],
          template: template.template || ''
        }));
        setIsDirty(true);
        localStorage.removeItem('promptTemplate'); // Clean up
      } catch (error) {
        console.error('Failed to load template data:', error);
      }
    }
  }, []);
  
  // Template validation
  // Fix exhaustive-deps: add previewVariables to dependency array
  useEffect(() => {
    if (formData.template) {
      const result = validateTemplate(formData.template);
      setValidationResult(result);
      
      // Update preview variables based on extracted variables (only if variables changed)
      const newVariables: Record<string, unknown> = {};
      let hasChanges = false;
      
      result.variables.forEach(variable => {
        if (!previewVariables[variable.name]) {
          hasChanges = true;
          newVariables[variable.name] = variable.defaultValue || 
            (variable.type === 'string' ? `Example ${variable.name}` :
             variable.type === 'number' ? 42 :
             variable.type === 'boolean' ? true :
             variable.type === 'array' ? ['item1', 'item2'] :
             { key: 'value' });
        } else {
          newVariables[variable.name] = previewVariables[variable.name];
        }
      });
      
      // Only update if there are actual changes
      if (hasChanges || Object.keys(newVariables).length !== Object.keys(previewVariables).length) {
        setPreviewVariables(newVariables);
      }
    }
  }, [formData.template, previewVariables]);
  
  const updateFormData = (updates: Partial<PromptFormData>) => {
    setFormData(prev => {
      // Check if we actually need to update
      const hasChanges = Object.keys(updates).some(key => {
        const updateKey = key as keyof PromptFormData;
        return JSON.stringify(prev[updateKey]) !== JSON.stringify(updates[updateKey]);
      });
      
      if (!hasChanges) {
        return prev; // No changes, return the same object to prevent re-render
      }
      
      const newData = { ...prev, ...updates };
      
      // Auto-update operation when agent type changes
      if (updates.agentType && updates.agentType !== prev.agentType) {
        newData.operation = getDefaultOperation(updates.agentType);
        
        // Clear diagram types for classifier
        if (updates.agentType === AgentType.CLASSIFIER) {
          newData.diagramType = [];
        } else if (!shouldShowDiagramTypes(updates.agentType)) {
          newData.diagramType = [];
        } else if (newData.diagramType.length === 0) {
          // Set default diagram type for agents that need it
          newData.diagramType = [DiagramType.SEQUENCE];
        } else if (!allowsMultipleDiagramTypes(updates.agentType) && newData.diagramType.length > 1) {
          // Limit to single diagram type for agents that don't support multiple
          newData.diagramType = [newData.diagramType[0]];
        }
      }
      
      return newData;
    });
    setIsDirty(true);
  };

  
  const handleSave = async () => {
    // Validate form data
    if (!formValidation.isValid) {
      setError(formValidation.errors[0] || 'Please fix validation errors');
      return;
    }
    
    if (validationResult && !validationResult.isValid) {
      setError('Please fix template validation errors before saving');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/prompt-mgmt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create prompt');
      }
      
      // Navigate to the created prompt
      router.push(`/prompt-mgmt/${result.data._id}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };
  
  const handleTest = async () => {
    if (!validationResult?.isValid) {
      setError('Please fix template validation errors before testing');
      return;
    }
    
    if (!formData.template.trim()) {
      setError('Please enter a template to test');
      return;
    }
    
    // For testing, we can create a temporary prompt execution
    try {
      const testPayload = {
        template: formData.template,
        variables: previewVariables,
        metadata: {
          agentType: formData.agentType,
          operation: formData.operation,
          test: true
        }
      };
      
      // This would need a test endpoint that doesn't require saving
      console.log('Test payload:', testPayload);
      alert('Test functionality would be implemented here. Check console for test payload.');
      
    } catch (error) {
      console.error('Failed to test prompt:', error);
      setError('Failed to start test');
    }
  };
  
  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean);
    updateFormData({ tags });
  };
  
  const handleDiagramTypeToggle = (type: DiagramType) => {
    const current = formData.diagramType;
    
    if (allowsMultipleDiagramTypes(formData.agentType)) {
      // Multi-select behavior
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      updateFormData({ diagramType: updated });
    } else {
      // Single-select behavior
      const updated = current.includes(type) ? [] : [type];
      updateFormData({ diagramType: updated });
    }
  };
  
  const handleEnvironmentToggle = (env: PromptEnvironment) => {
    // Environments are mutually exclusive
    updateFormData({ environments: [env] });
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/prompt-mgmt/new">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span>Create New Prompt</span>
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isDirty && <span className="text-orange-600">• Unsaved changes</span>}
              {validationResult && !validationResult.isValid && (
                <span className="text-red-600">• Template validation errors</span>
              )}
              {!formValidation.isValid && (
                <span className="text-red-600">• Form validation errors</span>
              )}
              {formValidation.warnings.length > 0 && (
                <span className="text-yellow-600">• {formValidation.warnings.length} warning{formValidation.warnings.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={saving || Boolean(validationResult && !validationResult.isValid)}
          >
            <Play className="h-4 w-4 mr-2" />
            Test
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={saving || !isDirty || !formValidation.isValid || Boolean(validationResult && !validationResult.isValid)}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Creating...' : 'Create Prompt'}
          </Button>
        </div>
      </div>
      
      {/* Error Alert */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Form Validation Errors */}
      {!formValidation.isValid && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="space-y-1">
              {formValidation.errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Form Validation Warnings */}
      {formValidation.warnings.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            <div className="space-y-1">
              {formValidation.warnings.map((warning, index) => (
                <div key={index}>• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Editor */}
        <div className="col-span-12 lg:col-span-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="template">Template Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
            </TabsList>
            
            <TabsContent value="template" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Template Editor</span>
                    </CardTitle>
                    
                    {validationResult && (
                      <div className="flex items-center space-x-2">
                        {validationResult.isValid ? (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Valid</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">
                              {validationResult.errors.length} error{validationResult.errors.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <CardDescription>
                    Write your prompt template using variables in curly braces: {`{variableName}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MonacoEditor
                    value={formData.template}
                    onChange={(value) => updateFormData({ template: value })}
                    validationResult={validationResult}
                    height="400px"
                    language="text"
                    options={{
                      wordWrap: 'on',
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      folding: true,
                      bracketMatching: 'always'
                    }}
                  />
                  
                  {/* Validation Results */}
                  {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                    <div className="mt-4 space-y-2">
                      {validationResult.errors.map((error, index) => (
                        <Alert key={index} className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">
                            <strong>Error:</strong> {error.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                      
                      {validationResult.warnings.map((warning, index) => (
                        <Alert key={index} className="border-yellow-200 bg-yellow-50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-700">
                            <strong>Warning:</strong> {warning.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <PromptPreview
                prompt={{
                  ...formData,
                  _id: 'new',
                  versions: [{
                    version: '1.0.0',
                    template: formData.template,
                    createdAt: new Date(),
                    changelog: formData.changelog || 'Initial version',
                    isActive: true
                  }],
                  currentVersion: '1.0.0',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  isProduction: false
                } as unknown as PromptMgmtPrompt}
                variables={previewVariables}
                onVariablesChange={setPreviewVariables}
                showVariableEditor
              />
            </TabsContent>
            
            <TabsContent value="variables" className="space-y-4">
              <VariableEditor
                variables={validationResult?.variables || []}
                values={previewVariables}
                onChange={setPreviewVariables}
                onVariableUpdate={() => {}}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Metadata */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Prompt Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Enter prompt name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="agentType">Agent Type</Label>
                <Select 
                  value={formData.agentType} 
                  onValueChange={(value: AgentType) => updateFormData({ agentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AgentType).map(type => (
                      <SelectItem key={type} value={type}>
                        <div>
                          <div className="capitalize font-medium">{type}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getAgentDescription(type)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="operation">Operation</Label>
                <Select 
                  value={formData.operation} 
                  onValueChange={(value: PromptOperation) => updateFormData({ operation: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidOperations(formData.agentType).map(op => (
                      <SelectItem key={op} value={op}>
                        <span className="capitalize">{op.replace(/[_-]/g, ' ')}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500 mt-1">
                  Available operations for {formData.agentType} agent
                </div>
              </div>
              
              {shouldShowDiagramTypes(formData.agentType) && (
                <div>
                  <Label>Diagram Types</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.values(DiagramType).map(type => (
                      <Badge
                        key={type}
                        variant={formData.diagramType.includes(type) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer",
                          !allowsMultipleDiagramTypes(formData.agentType) && 
                          formData.diagramType.length > 0 && 
                          !formData.diagramType.includes(type) && 
                          "opacity-50"
                        )}
                        onClick={() => handleDiagramTypeToggle(type)}
                      >
                        {type.replace(/-/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {allowsMultipleDiagramTypes(formData.agentType) 
                      ? "Select one or more diagram types" 
                      : "Select one diagram type"}
                  </div>
                </div>
              )}
              
              {formData.agentType === AgentType.CLASSIFIER && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <strong>Note:</strong> Classifier agents work with intent classification and do not require specific diagram types.
                </div>
              )}
              
              <div>
                <Label>Environment</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.values(PromptEnvironment).map(env => (
                    <Badge
                      key={env}
                      variant={formData.environments.includes(env) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleEnvironmentToggle(env)}
                    >
                      {env.charAt(0).toUpperCase() + env.slice(1)}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Select deployment environment (mutually exclusive)
                </div>
              </div>
              
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagInput(e.target.value)}
                  placeholder="Enter tags separated by commas"
                />
              </div>
              
              <div>
                <Label htmlFor="changelog">Initial Notes</Label>
                <Textarea
                  id="changelog"
                  value={formData.changelog}
                  onChange={(e) => updateFormData({ changelog: e.target.value })}
                  placeholder="Describe the purpose of this prompt..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Template Statistics */}
          {validationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Template Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Characters</span>
                  <span className="text-sm font-medium">{formData.template.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Lines</span>
                  <span className="text-sm font-medium">
                    {formData.template.split('\n').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Variables</span>
                  <span className="text-sm font-medium">
                    {validationResult.variables.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Validation</span>
                  <span className={cn(
                    "text-sm font-medium",
                    validationResult.isValid ? "text-green-600" : "text-red-600"
                  )}>
                    {validationResult.isValid ? "Valid" : "Invalid"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Use descriptive variable names like {`{requirements}`} or {`{context}`}</p>
              <p>• Test your prompt with different variable values</p>
              <p>• Add clear instructions for the AI model</p>
              <p>• Consider edge cases and error handling</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}