'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Settings,
  Loader2
} from 'lucide-react';
import { PromptMgmtPrompt, PromptFormData, TemplateValidationResult, PromptMgmtVersion } from '@/lib/prompt-mgmt/types';
import { AgentType, PromptOperation } from '@/lib/database/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Separator } from '@/components/ui/separator';
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
import { validateTemplate, validateSemanticVersion } from '@/lib/prompt-mgmt/utils';
import { 
  getDiagramTypeDisplayConfig, 
  getProductionStatusLabel,
  validateFormField
} from '@/lib/prompt-mgmt/form-validation';
import { getValidOperations, getAvailableAgentTypes } from '@/lib/prompt-mgmt/agent-operation-config';
import { cn } from '@/lib/utils';

export default function PromptEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptId = params.id as string;
  const isNew = promptId === 'new';
  const editVersionParam = searchParams.get('version');
  
  const [prompt, setPrompt] = useState<PromptMgmtPrompt | null>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    agentType: AgentType.GENERATOR,
    diagramType: [],
    operation: PromptOperation.GENERATION,
    isProduction: false,
    environments: ['development'],
    tags: [],
    template: '',
    changelog: '',
    metadata: {}
  });
  
  // Additional state for version management
  const [newVersion, setNewVersion] = useState<string>('');
  const [originalVersion, setOriginalVersion] = useState<string>('');
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [previewVariables, setPreviewVariables] = useState<Record<string, unknown>>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState<PromptMgmtVersion | null>(null);
  const [versionValidation, setVersionValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });
  
  // Real-time validation and UI state
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});
  const [diagramTypeConfig, setDiagramTypeConfig] = useState<ReturnType<typeof getDiagramTypeDisplayConfig> | null>(null);
  
  // Set initial diagram type config for new prompts
  useEffect(() => {
    if (isNew && diagramTypeConfig === null) {
      setDiagramTypeConfig(getDiagramTypeDisplayConfig(formData.diagramType));
    }
  }, [isNew, formData.diagramType, diagramTypeConfig]);
  
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
          
          // Determine which version to edit
          let targetVersion: PromptMgmtVersion;
          if (editVersionParam) {
            // Editing a specific version
            targetVersion = data.data.versions.find(
              (v: PromptMgmtVersion) => v.version === editVersionParam
            ) || data.data.versions.find(
              (v: PromptMgmtVersion) => v.version === data.data.primaryVersion
            )!;
            setEditingVersion(editVersionParam);
          } else {
            // Check if there's an existing draft
            const existingDraft = data.data.versions.find((v: PromptMgmtVersion) => v.version.endsWith('-draft'));
            if (existingDraft) {
              targetVersion = existingDraft;
              setDraftVersion(existingDraft);
            } else {
              // Use primary version as base
              targetVersion = data.data.versions.find(
                (v: PromptMgmtVersion) => v.version === data.data.primaryVersion
              )!;
            }
          }
          
          setPrompt(data.data);
          setFormData({
            name: data.data.name,
            agentType: data.data.agentType,
            diagramType: data.data.diagramType,
            operation: data.data.operation,
            isProduction: data.data.isProduction,
            environments: data.data.environments || ['development'],
            tags: data.data.tags,
            template: targetVersion?.template || '',
            changelog: editVersionParam ? `Edit of version ${editVersionParam}` : '',
            metadata: data.data.metadata || {}
          });
          
          // Set diagram type display configuration
          setDiagramTypeConfig(getDiagramTypeDisplayConfig(data.data.diagramType));
          
          // Set version states
          const versionToEdit = targetVersion?.version || data.data.primaryVersion;
          
          if (!versionToEdit) {
            throw new Error('No version to edit found');
          }
          
          setEditingVersion(versionToEdit);
          setOriginalVersion(versionToEdit);
          setNewVersion(versionToEdit);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      };
      
      fetchPrompt();
    }
  }, [promptId, isNew, editVersionParam]);
  
  // Template validation
  useEffect(() => {
    if (formData.template) {
      const result = validateTemplate(formData.template);
      setValidationResult(result);
      
      // Update preview variables based on extracted variables
      setPreviewVariables(prevVariables => {
        const newVariables: Record<string, unknown> = {};
        result.variables.forEach(variable => {
          if (!prevVariables[variable.name]) {
            newVariables[variable.name] = variable.defaultValue || 
              (variable.type === 'string' ? `Example ${variable.name}` :
               variable.type === 'number' ? 42 :
               variable.type === 'boolean' ? true :
               variable.type === 'array' ? ['item1', 'item2'] :
               { key: 'value' });
          } else {
            newVariables[variable.name] = prevVariables[variable.name];
          }
        });
        return newVariables;
      });
    }
  }, [formData.template]);
  
  // Check if version has changed (determines save vs save-as-new)
  const hasVersionChanged = newVersion !== originalVersion;
  
  // Version validation
  useEffect(() => {
    if (!isNew && newVersion) {
      // Check if it's a draft version (skip validation)
      if (newVersion.endsWith('-draft')) {
        setVersionValidation({ isValid: true });
        return;
      }
      
      // Validate semantic versioning
      const versionError = validateSemanticVersion(newVersion);
      if (versionError) {
        setVersionValidation({ isValid: false, error: versionError });
        return;
      }
      
      // Check if version already exists (only for new versions)
      if (hasVersionChanged && prompt?.versions.some(v => v.version === newVersion)) {
        setVersionValidation({ isValid: false, error: 'Version already exists' });
        return;
      }
      
      setVersionValidation({ isValid: true });
    }
  }, [newVersion, hasVersionChanged, prompt?.versions, isNew]);
  
  // Save function
  const handleSave = useCallback(async () => {
    if (!validationResult?.isValid) {
      alert('Please fix template validation errors before saving');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const url = isNew ? '/api/prompt-mgmt' : `/api/prompt-mgmt/${promptId}`;
      const method = isNew ? 'POST' : 'PUT';
      
      let versionStrategy: string;
      let saveMode: 'overwrite' | 'new';
      
      // For manual save, check if version changed
      if (hasVersionChanged) {
        // Save as new version
        saveMode = 'new';
        versionStrategy = newVersion;
      } else {
        // Overwrite existing version
        saveMode = 'overwrite';
        versionStrategy = originalVersion;
      }
      
      // Validate that we have a version
      if (!versionStrategy) {
        throw new Error('Version strategy is empty');
      }
      
      const payload = {
        ...formData,
        ...(!isNew && { 
          version: versionStrategy,
          changelog: formData.changelog || (
            hasVersionChanged ? `New version ${newVersion}` : 
            'Updated template'
          ),
          baseVersion: originalVersion,
          saveMode: saveMode
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
      
      // Clear draft on successful save
      const draftKey = `prompt-draft-${promptId}`;
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setIsDirty(false);
      
      if (isNew) {
        router.push(`/prompt-mgmt/${result.data._id}`);
      } else {
        // For manual save, redirect back to view page
        router.push(`/prompt-mgmt/${promptId}?tab=versions`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [formData, isNew, promptId, router, validationResult, originalVersion, newVersion, hasVersionChanged]);
  
  // Draft state management using localStorage
  useEffect(() => {
    if (!isDirty || isNew) return;
    
    // Save draft to localStorage
    const draftKey = `prompt-draft-${promptId}`;
    const draftData = {
      formData,
      newVersion,
      timestamp: Date.now(),
      originalVersion
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    setHasDraft(true);
  }, [formData, isDirty, isNew, promptId, originalVersion, newVersion]);
  
  // Load draft on mount - after prompt data is loaded
  useEffect(() => {
    if (isNew || !promptId || !originalVersion) return;
    
    const draftKey = `prompt-draft-${promptId}`;
    const draftData = localStorage.getItem(draftKey);
    
    if (draftData) {
      try {
        const parsed = JSON.parse(draftData);
        if (parsed.originalVersion === originalVersion) {
          // Restore draft data
          setFormData(parsed.formData);
          setNewVersion(parsed.newVersion || originalVersion);
          setIsDirty(true);
          setHasDraft(true);
        } else {
          // Clear outdated draft
          localStorage.removeItem(draftKey);
        }
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
  }, [isNew, promptId, originalVersion]);

  const updateFormData = (updates: Partial<PromptFormData>) => {
    setFormData(prev => {
      const newFormData = { ...prev, ...updates };
      
      // Perform real-time validation for updated fields
      const newErrors = { ...fieldValidationErrors };
      
      Object.keys(updates).forEach(field => {
        const fieldKey = field as keyof PromptFormData;
        const fieldErrors = validateFormField(fieldKey, updates[fieldKey], newFormData);
        
        if (fieldErrors.length > 0) {
          newErrors[field] = fieldErrors[0].message;
        } else {
          delete newErrors[field];
        }
      });
      
      setFieldValidationErrors(newErrors);
      return newFormData;
    });
    setIsDirty(true);
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
  
  
  const handleProductionToggle = () => {
    updateFormData({ isProduction: !formData.isProduction });
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
              {editingVersion && (
                <span className="text-blue-600">• Editing version {editingVersion}</span>
              )}
              {draftVersion && !editingVersion && (
                <span className="text-purple-600">• Draft version {draftVersion.version}</span>
              )}
              {isDirty && <span className="text-orange-600">• Unsaved changes</span>}
              {validationResult && !validationResult.isValid && (
                <span className="text-red-600">• Validation errors</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasDraft && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              Draft
            </Badge>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={saving || !!(validationResult && !validationResult.isValid)}
          >
            <Play className="h-4 w-4 mr-2" />
            Test
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const draftKey = `prompt-draft-${promptId}`;
              localStorage.removeItem(draftKey);
              setHasDraft(false);
              setIsDirty(false);
              router.push(isNew ? "/prompt-mgmt" : `/prompt-mgmt/${promptId}`);
            }}
            disabled={saving}
          >
            Discard
          </Button>
          
          <Button 
            onClick={() => handleSave()}
            disabled={saving || (!isDirty && !hasVersionChanged) || (!versionValidation.isValid && hasVersionChanged)}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : (
              hasVersionChanged ? `Save as v${newVersion}` : 'Save'
            )}
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
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
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
            
            <TabsContent value="variables" className="space-y-4">
              <VariableEditor
                variables={validationResult?.variables || []}
                values={previewVariables}
                onChange={setPreviewVariables}
                onVariableUpdate={() => {
                  // Handle variable metadata updates
                }}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <PromptPreview
                prompt={{
                  ...formData,
                  _id: promptId,
                  primaryVersion: '1.0.0',
                  versions: [{
                    version: '1.0.0',
                    template: formData.template,
                    createdAt: new Date(),
                    changelog: formData.changelog || 'Current edit'
                  }],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  isProduction: false
                } as unknown as PromptMgmtPrompt}
                variables={previewVariables}
                onVariablesChange={setPreviewVariables}
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
              
              {!isNew && (
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={newVersion}
                    onChange={(e) => {
                      setNewVersion(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g., 1.0.1"
                    className={cn(
                      !versionValidation.isValid && hasVersionChanged && "border-red-500 focus:border-red-500"
                    )}
                    required
                  />
                  <div className="text-xs mt-1">
                    {!versionValidation.isValid && hasVersionChanged ? (
                      <p className="text-red-600">{versionValidation.error}</p>
                    ) : (
                      <p className="text-gray-500">
                        {hasVersionChanged ? 
                          `Will create new version ${newVersion}` : 
                          `Editing version ${originalVersion}`
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="agentType">Agent Type</Label>
                <Select 
                  value={formData.agentType} 
                  onValueChange={(value: AgentType) => {
                    // When agent type changes, also update operation to first valid one
                    const validOps = getValidOperations(value);
                    const currentOpIsValid = validOps.includes(formData.operation);
                    
                    updateFormData({ 
                      agentType: value,
                      ...(currentOpIsValid ? {} : { operation: validOps[0] })
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableAgentTypes().map(type => (
                      <SelectItem key={type} value={type}>
                        <span className="capitalize">{type.replace('_', ' ')}</span>
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
                  <SelectTrigger className={cn(
                    fieldValidationErrors.operation && "border-red-500"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidOperations(formData.agentType).map(op => (
                      <SelectItem key={op} value={op}>
                        <span className="capitalize">{op.replace('_', ' ')}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldValidationErrors.operation && (
                  <p className="text-sm text-red-600 mt-1">{fieldValidationErrors.operation}</p>
                )}
              </div>
              
              <div>
                <Label>Diagram Types</Label>
                <div className="mt-2">
                  {diagramTypeConfig ? (
                    <div className="space-y-2">
                      <Badge variant="secondary" className="cursor-default">
                        {diagramTypeConfig.displayLabel}
                      </Badge>
                      {!diagramTypeConfig.showAsGeneric && (
                        <div className="flex flex-wrap gap-1">
                          {diagramTypeConfig.displayTypes.map(type => (
                            <Badge key={type} variant="outline" className="text-xs cursor-default">
                              {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Diagram types are determined by the prompt configuration and cannot be modified during editing.
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Loading diagram type configuration...</div>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Environment</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="production-toggle"
                      checked={formData.isProduction}
                      onCheckedChange={handleProductionToggle}
                    />
                    <Label htmlFor="production-toggle" className="flex items-center space-x-2">
                      <Badge variant={formData.isProduction ? "default" : "secondary"}>
                        {getProductionStatusLabel(formData.isProduction)}
                      </Badge>
                    </Label>
                  </div>
                  {fieldValidationErrors.isProduction && (
                    <p className="text-sm text-red-600">{fieldValidationErrors.isProduction}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Toggle between Development and Production environments.
                  </p>
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