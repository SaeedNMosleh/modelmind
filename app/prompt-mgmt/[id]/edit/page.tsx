'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Eye, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Settings,
  Loader2
} from 'lucide-react';
import { PromptMgmtPrompt, PromptFormData, TemplateValidationResult } from '@/lib/prompt-mgmt/types';
import { AgentType, DiagramType, PromptOperation, PromptEnvironment } from '@/lib/database/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import { validateTemplate, extractTemplateVariables } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

export default function PromptEditPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;
  const isNew = promptId === 'new';
  
  const [prompt, setPrompt] = useState<PromptMgmtPrompt | null>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    agentType: AgentType.GENERATOR,
    diagramType: [],
    operation: PromptOperation.GENERATE,
    environments: [PromptEnvironment.DEVELOPMENT],
    tags: [],
    template: '',
    changelog: '',
    metadata: {}
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [previewVariables, setPreviewVariables] = useState<Record<string, any>>({});
  const [autoSave, setAutoSave] = useState(true);
  
  // Fetch existing prompt for editing
  useEffect(() => {
    if (!isNew) {
      const fetchPrompt = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/prompt-mgmt/${promptId}`);
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch prompt');
          }
          
          const currentVersion = data.data.versions.find(
            (v: any) => v.version === data.data.currentVersion
          );
          
          setPrompt(data.data);
          setFormData({
            name: data.data.name,
            agentType: data.data.agentType,
            diagramType: data.data.diagramType,
            operation: data.data.operation,
            environments: data.data.environments,
            tags: data.data.tags,
            template: currentVersion?.template || '',
            changelog: '',
            metadata: data.data.metadata || {}
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      };
      
      fetchPrompt();
    }
  }, [promptId, isNew]);
  
  // Template validation
  useEffect(() => {
    if (formData.template) {
      const result = validateTemplate(formData.template);
      setValidationResult(result);
      
      // Update preview variables based on extracted variables
      const newVariables: Record<string, any> = {};
      result.variables.forEach(variable => {
        if (!previewVariables[variable.name]) {
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
      setPreviewVariables(newVariables);
    }
  }, [formData.template]);
  
  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !isDirty || isNew) return;
    
    const timer = setTimeout(() => {
      handleSave(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [formData, isDirty, autoSave, isNew]);
  
  const updateFormData = (updates: Partial<PromptFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };
  
  const handleSave = async (isAutoSave = false) => {
    if (!validationResult?.isValid && !isAutoSave) {
      alert('Please fix template validation errors before saving');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const url = isNew ? '/api/prompt-mgmt' : `/api/prompt-mgmt/${promptId}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const payload = {
        ...formData,
        // For updates, we create a new version
        ...(!isNew && { 
          version: 'auto', // Let backend auto-increment
          changelog: formData.changelog || 'Updated template'
        })
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || `Failed to ${isNew ? 'create' : 'update'} prompt`);
      }
      
      setIsDirty(false);
      
      if (!isAutoSave) {
        if (isNew) {
          router.push(`/prompt-mgmt/${result.data._id}`);
        } else {
          // Refresh the data
          setPrompt(result.data);
          setFormData(prev => ({ ...prev, changelog: '' }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };
  
  const handleTest = async () => {
    if (!validationResult?.isValid) {
      alert('Please fix template validation errors before testing');
      return;
    }
    
    // For new prompts, we need to save first
    if (isNew) {
      await handleSave();
      return;
    }
    
    try {
      const testPayload = {
        template: formData.template,
        variables: previewVariables
      };
      
      const response = await fetch(`/api/prompt-mgmt/${promptId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      
      const result = await response.json();
      if (result.success) {
        // Open test results in new tab
        window.open(`/prompt-mgmt/${promptId}/test?jobId=${result.data.executionId}`, '_blank');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };
  
  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean);
    updateFormData({ tags });
  };
  
  const handleDiagramTypeToggle = (type: DiagramType) => {
    const current = formData.diagramType;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateFormData({ diagramType: updated });
  };
  
  const handleEnvironmentToggle = (env: PromptEnvironment) => {
    const current = formData.environments;
    const updated = current.includes(env)
      ? current.filter(e => e !== env)
      : [...current, env];
    updateFormData({ environments: updated });
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={isNew ? "/prompt-mgmt" : `/prompt-mgmt/${promptId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isNew ? 'Back to Prompts' : 'Back to Details'}
            </Link>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? 'Create New Prompt' : `Edit: ${prompt?.name}`}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isDirty && <span className="text-orange-600">• Unsaved changes</span>}
              {validationResult && !validationResult.isValid && (
                <span className="text-red-600">• Validation errors</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-save" className="text-sm">Auto-save</Label>
            <Switch
              id="auto-save"
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={saving || (validationResult && !validationResult.isValid)}
          >
            <Play className="h-4 w-4 mr-2" />
            Test
          </Button>
          
          <Button 
            onClick={() => handleSave(false)}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save'}
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
                  _id: promptId as any,
                  versions: [{
                    version: '1.0.0',
                    template: formData.template,
                    createdAt: new Date(),
                    changelog: formData.changelog || 'Current edit'
                  }],
                  currentVersion: '1.0.0',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  isProduction: false
                } as any}
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
                onVariableUpdate={(variableId, updates) => {
                  // Handle variable metadata updates
                }}
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
                <Label htmlFor="name">Name</Label>
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
                        <span className="capitalize">{type}</span>
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
                    {Object.values(PromptOperation).map(op => (
                      <SelectItem key={op} value={op}>
                        <span className="capitalize">{op.replace('_', ' ')}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Diagram Types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.values(DiagramType).map(type => (
                    <Badge
                      key={type}
                      variant={formData.diagramType.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleDiagramTypeToggle(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Environments</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.values(PromptEnvironment).map(env => (
                    <Badge
                      key={env}
                      variant={formData.environments.includes(env) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleEnvironmentToggle(env)}
                    >
                      {env}
                    </Badge>
                  ))}
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
              
              {!isNew && (
                <div>
                  <Label htmlFor="changelog">Change Notes</Label>
                  <Textarea
                    id="changelog"
                    value={formData.changelog}
                    onChange={(e) => updateFormData({ changelog: e.target.value })}
                    placeholder="Describe your changes..."
                    rows={3}
                  />
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
}