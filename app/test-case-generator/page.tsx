'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, FileText, TestTube2, Eye, Sparkles, Loader2, AlertCircle, CheckCircle, 
  RefreshCw, Cpu
} from 'lucide-react';

import { 
  TestCase, 
  TestCaseFormData, 
  VariablePreset,
  ModelConfiguration,
  TestCaseGeneratorState,
  TabConfig
} from '@/lib/test-case-generator/types';
import { 
  generateTestCaseYAML,
  validateFormData,
  fetchVariablePresets,
  getDefaultModelConfiguration,
  createModelConfiguration
} from '@/lib/test-case-generator/utils';

// Import tab components (to be created)
import { ConfigureTab } from '@/components/test-case-generator/ConfigureTab';
import { TestParametersTab } from '@/components/test-case-generator/TestParametersTab';
import { AssertionsTab } from '@/components/test-case-generator/AssertionsTab';
import { PreviewTab } from '@/components/test-case-generator/PreviewTab';
import { TestCasesList } from '@/components/test-case-generator/TestCasesList';
import { PresetManager } from '@/components/test-case-generator/PresetManager';

export default function TestCaseGeneratorPage() {
  // Enhanced state management for modern UX
  const [state, setState] = useState<TestCaseGeneratorState>({
    // Prompt selection
    selectedPromptId: '',
    selectedVersion: '',
    selectedPrompt: null,
    
    // Variables and validation
    variables: {},
    variableErrors: {},
    variableCompletion: {},
    
    // Test parameters with multi-model support
    testParameters: {
      models: [getDefaultModelConfiguration()]
    },
    
    // Assertions
    assertions: [],
    
    // UI state with enhanced UX
    loading: false,
    message: '',
    messageType: 'info',
    activeTab: 'configure',
    isPreviewExpanded: false,
    showRawTemplate: false,
    
    // Save operation state
    saving: false,
    
    // Data
    prompts: [],
    testCases: [],
    presets: []
  });

  // Tab configuration with modern design
  const tabConfigs = useMemo(() => [
    {
      id: 'configure',
      label: 'Configuration',
      icon: Settings,
      color: 'text-cyan-600',
      component: ConfigureTab,
      description: 'Set up template variables'
    },
    {
      id: 'testParameters',
      label: 'Test Parameters',
      icon: Cpu,
      color: 'text-emerald-600',
      component: TestParametersTab,
      description: 'Configure AI models for testing'
    },
    {
      id: 'assertions',
      label: 'Assertions',
      icon: TestTube2,
      color: 'text-orange-600',
      component: AssertionsTab,
      description: 'Define test validation criteria'
    },
    {
      id: 'preview',
      label: 'Preview',
      icon: Eye,
      color: 'text-purple-600',
      component: PreviewTab,
      description: 'Preview generated YAML configuration'
    }
  ] as unknown as TabConfig[], []);

  // Computed values for better performance
  const selectedPrompt = useMemo(() => 
    state.prompts.find(p => p.id === state.selectedPromptId),
    [state.prompts, state.selectedPromptId]
  );
  
  const selectedVersionData = useMemo(() => 
    selectedPrompt?.versions.find(v => v.version === state.selectedVersion),
    [selectedPrompt, state.selectedVersion]
  );
  
  const currentTemplate = selectedVersionData?.template || '';
  const currentVariables = useMemo(() => 
    selectedVersionData?.variables || [], 
    [selectedVersionData]
  );
  
  const formData: TestCaseFormData = useMemo(() => ({
    promptId: state.selectedPromptId,
    promptName: selectedPrompt?.displayName || '',
    version: state.selectedVersion,
    variables: state.variables,
    testParameters: state.testParameters
  }), [state.selectedPromptId, selectedPrompt, state.selectedVersion, state.variables, state.testParameters]);
  
  const validationResult = useMemo(() => 
    validateFormData(formData, currentVariables),
    [formData, currentVariables]
  );

  // Enhanced message system
  const showMessage = useCallback((message: string, type: TestCaseGeneratorState['messageType'] = 'info') => {
    setState(prev => ({ ...prev, message, messageType: type }));
    setTimeout(() => {
      setState(prev => ({ ...prev, message: '' }));
    }, type === 'success' ? 3000 : 5000);
  }, []);

  // Data fetching functions
  const fetchPrompts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/test-case-generator/prompts');
      const data = await response.json();
      
      if (response.ok) {
        setState(prev => ({ ...prev, prompts: data.prompts || [] }));
        
        if (data.health && data.health.status === 'warning') {
          showMessage(`AI Pipeline Health Warning: ${data.health.warnings.join(', ')}`, 'warning');
        } else if (data.prompts.length === 0) {
          showMessage('No activated prompts found. Please activate prompts in the prompt management section.', 'info');
        }
      } else {
        showMessage('Failed to fetch prompts', 'error');
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      showMessage('Error loading prompts', 'error');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [showMessage]);

  const fetchTestCases = useCallback(async () => {
    try {
      const response = await fetch('/api/test-case-generator?limit=20');
      const data = await response.json();
      setState(prev => ({ ...prev, testCases: data.testCases || [] }));
    } catch (error) {
      console.error('Error fetching test cases:', error);
    }
  }, []);

  const fetchPresets = useCallback(async () => {
    try {
      const presets = await fetchVariablePresets(
        selectedPrompt?.agentType,
        selectedPrompt?.operation
      );
      setState(prev => ({ ...prev, presets }));
    } catch (error) {
      console.error('Error fetching presets:', error);
    }
  }, [selectedPrompt]);

  // Initialize data
  useEffect(() => {
    Promise.all([
      fetchPrompts(),
      fetchTestCases()
    ]);
  }, [fetchPrompts, fetchTestCases]);

  // Fetch presets when prompt selection changes
  useEffect(() => {
    if (selectedPrompt) {
      fetchPresets();
    }
  }, [selectedPrompt, fetchPresets]);

  // Initialize variable completion tracking when prompt/version changes  
  useEffect(() => {
    if (currentVariables.length > 0) {
      setState(prev => {
        const newCompletion: Record<string, boolean> = {};
        
        // Only track completion status, don't auto-populate values
        currentVariables.forEach(templateVar => {
          const existingValue = prev.variables[templateVar.name];
          newCompletion[templateVar.name] = existingValue !== undefined && existingValue !== null && existingValue !== '';
        });
        
        return {
          ...prev,
          variableCompletion: newCompletion
        };
      });
    }
  }, [currentVariables]);



  // Action handlers
  const handlePromptSelect = useCallback((promptId: string) => {
    setState(prev => ({
      ...prev,
      selectedPromptId: promptId,
      selectedVersion: '', // Reset version
      variables: {},
      variableCompletion: {}
    }));
  }, []);

  const handleVersionSelect = useCallback((version: string) => {
    setState(prev => ({
      ...prev,
      selectedVersion: version
    }));
  }, []);

  const handleVariableUpdate = useCallback((name: string, value: unknown) => {
    setState(prev => ({
      ...prev,
      variables: { ...prev.variables, [name]: value },
      variableCompletion: { 
        ...prev.variableCompletion, 
        [name]: value !== undefined && value !== null && value !== '' 
      }
    }));
  }, []);

  const handlePresetApply = useCallback((preset: VariablePreset) => {
    setState(prev => ({
      ...prev,
      variables: { ...prev.variables, ...preset.variables },
      variableCompletion: Object.keys(preset.variables).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, { ...prev.variableCompletion })
    }));
    showMessage(`Applied preset: ${preset.name}`, 'success');
  }, [showMessage]);

  const handleModelAdd = useCallback(() => {
    const newModel = createModelConfiguration();
    setState(prev => ({
      ...prev,
      testParameters: {
        models: [...(prev.testParameters.models || []), newModel]
      }
    }));
  }, []);

  const handleModelUpdate = useCallback((modelId: string, updates: Partial<ModelConfiguration>) => {
    setState(prev => ({
      ...prev,
      testParameters: {
        models: (prev.testParameters.models || []).map(model =>
          model.id === modelId ? { ...model, ...updates } : model
        )
      }
    }));
  }, []);

  const handleModelRemove = useCallback((modelId: string) => {
    setState(prev => ({
      ...prev,
      testParameters: {
        models: (prev.testParameters.models || []).filter(model => model.id !== modelId)
      }
    }));
  }, []); 

  const handleTabChange = useCallback((tab: string) => {
    setState(prev => ({ 
      ...prev, 
      activeTab: tab as TestCaseGeneratorState['activeTab']
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!validationResult.isValid) {
      showMessage(`Form validation failed: ${validationResult.errors.join(', ')}`, 'error');
      return;
    }

    setState(prev => ({ ...prev, saving: true }));

    try {
      const generatedYAML = generateTestCaseYAML(formData);
      
      const response = await fetch('/api/test-case-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          generatedYaml: generatedYAML
        })
      });

      if (response.ok) {
        showMessage('Test case saved successfully!', 'success');
        fetchTestCases();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Failed to save test case', 'error');
      }
    } catch (error) {
      console.error('Error saving test case:', error);
      showMessage('Error saving test case', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [validationResult, formData, showMessage, fetchTestCases]);

  // Test case CRUD handlers
  const handleLoadTestCase = useCallback(async (testCase: TestCase) => {
    try {
      // Fetch full test case data
      const response = await fetch(`/api/test-case-generator/${testCase._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch test case details');
      }
      
      const fullTestCase = await response.json();
      
      setState(prev => ({
        ...prev,
        selectedPromptId: fullTestCase.promptId,
        selectedVersion: fullTestCase.version,
        variables: fullTestCase.variables || {},
        testParameters: fullTestCase.testParameters || prev.testParameters,
        variableCompletion: Object.keys(fullTestCase.variables || {}).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {} as Record<string, boolean>)
      }));
      
      showMessage(`Loaded test case: ${testCase.promptName}`, 'success');
    } catch (error) {
      console.error('Error loading test case:', error);
      showMessage('Failed to load test case', 'error');
    }
  }, [showMessage]);

  const handleDuplicateTestCase = useCallback((testCase: TestCase) => {
    handleLoadTestCase(testCase);
    showMessage(`Duplicated test case: ${testCase.promptName}`, 'success');
  }, [handleLoadTestCase, showMessage]);

  const handleDeleteTestCase = useCallback(async (testCaseId: string) => {
    try {
      const response = await fetch(`/api/test-case-generator/${testCaseId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete test case');
      }

      showMessage('Test case deleted successfully', 'success');
      fetchTestCases();
    } catch (error) {
      console.error('Error deleting test case:', error);
      showMessage('Failed to delete test case', 'error');
      throw error; // Re-throw so the component can handle loading states
    }
  }, [showMessage, fetchTestCases]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Modern Header with Enhanced UX */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 border-b border-blue-800 sticky top-0 z-20 shadow-xl backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-xl shadow-lg ring-2 ring-white/20">
                <Sparkles className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent drop-shadow-sm">
                  Test Case Generator
                </h1>
                <p className="text-sm text-blue-100 flex items-center gap-2">
                  Create intelligent test cases for AI pipeline prompts
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                disabled={state.loading}
                className="text-blue-100 hover:text-white border-blue-700 hover:border-blue-600 hover:bg-blue-800/50 transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Message System */}
      {state.message && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <Alert className={`mb-4 border-0 shadow-lg ${
            state.messageType === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
            state.messageType === 'error' ? 'bg-red-50 text-red-900 border-red-200' :
            state.messageType === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' :
            'bg-blue-50 text-blue-900 border-blue-200'
          }`}>
            {state.messageType === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {state.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content with Modern Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-7 gap-8 h-[calc(100vh-240px)]">
          
          {/* Left Panel - Prompt Selection (35%) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border-l-4 border-l-blue-500 border-r border-t border-b border-blue-100 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-800 to-cyan-700 bg-clip-text text-transparent font-bold">Prompt Selection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Template</Label>
                  <Select value={state.selectedPromptId} onValueChange={handlePromptSelect}>
                    <SelectTrigger className="bg-white border-blue-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-gray-900 shadow-sm">
                      <SelectValue placeholder={state.loading ? "Loading..." : "Select prompt"} />
                    </SelectTrigger>
                    <SelectContent>
                      {state.loading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading prompts...
                          </div>
                        </SelectItem>
                      ) : state.prompts.length === 0 ? (
                        <SelectItem value="no-prompts" disabled>
                          No activated prompts found
                        </SelectItem>
                      ) : (
                        state.prompts.map(prompt => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {prompt.agentType}
                              </Badge>
                              {prompt.displayName}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Version</Label>
                  <Select 
                    value={state.selectedVersion} 
                    onValueChange={handleVersionSelect}
                    disabled={!state.selectedPromptId || state.loading}
                  >
                    <SelectTrigger className="bg-white border-blue-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-gray-900 shadow-sm">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPrompt?.versions.map(version => (
                        <SelectItem key={version.version} value={version.version}>
                          <div className="flex items-center gap-2">
                            {version.version}
                            {version.isPrimary && (
                              <Badge variant="default" className="text-xs px-1.5 py-0.5">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedPrompt && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <span>Agent:</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedPrompt.agentType}
                      </Badge>
                      <span>Operation:</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedPrompt.operation}
                      </Badge>
                    </div>
                    {currentVariables.length > 0 && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">{currentVariables.length} variables detected</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preset Manager */}
            <PresetManager
              presets={state.presets}
              onRefreshPresets={fetchPresets}
            />

            {/* Test Cases List */}
            <TestCasesList
              testCases={state.testCases}
              loading={state.loading}
              onLoad={handleLoadTestCase}
              onDuplicate={handleDuplicateTestCase}
              onDelete={handleDeleteTestCase}
              onRefresh={fetchTestCases}
            />
          </div>
          
          {/* Right Panel - Tabbed Interface (65%) */}
          <div className="lg:col-span-4">
            <Card className="h-full border-l-4 border-l-purple-500 border-r border-t border-b border-purple-100 shadow-xl bg-white/80 backdrop-blur-sm">
              <Tabs value={state.activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                <div className="px-6 pt-6 pb-2">
                  <TabsList className="grid grid-cols-4 w-full bg-gradient-to-r from-slate-100 via-blue-50 to-purple-50 p-1 rounded-lg shadow-inner">
                    {tabConfigs.map(tab => (
                      <TabsTrigger 
                        key={tab.id} 
                        value={tab.id}
                        className={`flex items-center gap-2 text-xs sm:text-sm transition-all duration-200 hover:bg-white/60 ${
                          state.activeTab === tab.id 
                            ? 'bg-gradient-to-r from-white to-blue-50 shadow-lg border border-blue-200 data-[state=active]:shadow-xl' 
                            : 'hover:bg-white/40'
                        }`}
                      >
                        <tab.icon className={`h-4 w-4 transition-colors duration-200 ${
                          state.activeTab === tab.id ? tab.color : 'text-gray-500'
                        }`} />
                        <span className={`hidden sm:inline font-medium transition-colors duration-200 ${
                          state.activeTab === tab.id ? 'text-gray-900' : 'text-gray-600'
                        }`}>{tab.label}</span>
                        <span className={`sm:hidden font-medium transition-colors duration-200 ${
                          state.activeTab === tab.id ? 'text-gray-900' : 'text-gray-600'
                        }`}>{tab.label.split(' ')[0]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Configure Tab */}
                <TabsContent value="configure" className="flex-1 px-6 pb-6 mt-0">
                  <ConfigureTab
                    variables={state.variables}
                    variableCompletion={state.variableCompletion}
                    templateVariables={currentVariables}
                    presets={state.presets}
                    selectedPrompt={selectedPrompt ? { agentType: selectedPrompt.agentType, operation: selectedPrompt.operation } : null}
                    onVariableUpdate={handleVariableUpdate}
                    onPresetApply={handlePresetApply}
                  />
                </TabsContent>

                {/* Test Parameters Tab */}
                <TabsContent value="testParameters" className="flex-1 px-6 pb-6 mt-0">
                  <TestParametersTab
                    testParameters={state.testParameters}
                    onModelAdd={handleModelAdd}
                    onModelUpdate={handleModelUpdate}
                    onModelRemove={handleModelRemove}
                  />
                </TabsContent>

                {/* Assertions Tab */}
                <TabsContent value="assertions" className="flex-1 px-6 pb-6 mt-0">
                  <AssertionsTab
                    assertions={state.assertions}
                    onAssertionUpdate={(assertions) => setState(prev => ({ ...prev, assertions }))}
                  />
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="flex-1 px-6 pb-6 mt-0">
                  <PreviewTab
                    formData={formData}
                    template={currentTemplate}
                    variables={state.variables}
                    validationResult={validationResult}
                    isExpanded={state.isPreviewExpanded}
                    showRaw={state.showRawTemplate}
                    saving={state.saving}
                    onToggleExpanded={() => setState(prev => ({ ...prev, isPreviewExpanded: !prev.isPreviewExpanded }))}
                    onToggleRaw={() => setState(prev => ({ ...prev, showRawTemplate: !prev.showRawTemplate }))}
                    onSave={handleSave}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}