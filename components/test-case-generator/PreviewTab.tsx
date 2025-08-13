'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, Code2, Download, Copy, RefreshCw, CheckCircle, 
  AlertCircle, FileText, Settings, Maximize2, Minimize2,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { TestCaseFormData } from '@/lib/test-case-generator/types';
import { generateTestCaseYAML } from '@/lib/test-case-generator/utils';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface PreviewTabProps {
  formData: TestCaseFormData;
  template: string;
  variables: Record<string, unknown>;
  validationResult: ValidationResult;
  isExpanded: boolean;
  showRaw: boolean;
  saving: boolean;
  onToggleExpanded: () => void;
  onToggleRaw: () => void;
  onSave: () => Promise<void>;
}

export function PreviewTab({
  formData,
  template,
  variables,
  validationResult,
  isExpanded,
  showRaw,
  saving,
  onToggleExpanded,
  onToggleRaw,
  onSave
}: PreviewTabProps) {
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Generate processed template
  const processedTemplate = useMemo(() => {
    if (!template) return '';
    
    let processed = template;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(placeholder, String(value || `{{${key}}}`));
    });
    
    return processed;
  }, [template, variables]);

  // Generate YAML configuration
  const generatedYaml = useMemo(() => {
    try {
      return generateTestCaseYAML(formData);
    } catch (error) {
      return `# Error generating YAML: ${error}`;
    }
  }, [formData]);

  // Count variables
  const variableStats = useMemo(() => {
    const total = Object.keys(variables).length;
    const filled = Object.values(variables).filter(v => v !== undefined && v !== null && v !== '').length;
    return { total, filled };
  }, [variables]);

  // Handle copy operations
  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(generatedYaml);
      setCopiedYaml(true);
      setTimeout(() => setCopiedYaml(false), 2000);
    } catch (error) {
      console.error('Failed to copy YAML:', error);
    }
  };

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(processedTemplate);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    } catch (error) {
      console.error('Failed to copy template:', error);
    }
  };

  // Handle download
  const handleDownloadYaml = () => {
    const blob = new Blob([generatedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.promptName || 'test-case'}-${formData.version || 'v1'}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col space-y-6 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-100 p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-800 to-violet-700 bg-clip-text text-transparent">Preview & Export</h3>
            <p className="text-sm text-purple-700 font-medium">
              Review configuration and generated test case
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleExpanded}
            className="text-purple-600 hover:text-purple-800 hover:bg-purple-100 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4 mr-1" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-1" />
            )}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <Card className={`border-l-4 shadow-xl backdrop-blur-sm ${
        validationResult.isValid 
          ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' 
          : 'border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {validationResult.isValid ? (
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <h4 className={`font-semibold ${
                  validationResult.isValid ? 'text-emerald-800' : 'text-red-800'
                }`}>
                  {validationResult.isValid ? 'Configuration Valid' : 'Configuration Issues'}
                </h4>
                <p className={`text-sm ${
                  validationResult.isValid ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {validationResult.isValid 
                    ? 'Ready to generate test case'
                    : `${validationResult.errors.length} issue${validationResult.errors.length !== 1 ? 's' : ''} found`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Variables: {variableStats.filled}/{variableStats.total}
                </div>
                <div className="text-xs text-gray-600">
                  Models: {formData.testParameters?.models?.length || 0}
                </div>
              </div>
              <div className="w-16 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ 
                    width: variableStats.total > 0 
                      ? `${(variableStats.filled / variableStats.total) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          </div>
          
          {!validationResult.isValid && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="yaml" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 p-1 rounded-lg shadow-inner">
            <TabsTrigger value="yaml" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              YAML Config
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template Preview
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yaml" className="flex-1 mt-4 flex flex-col">
            <Card className="flex-1 border-l-4 border-l-purple-500 shadow-xl backdrop-blur-sm flex flex-col bg-white/80">
              <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold bg-gradient-to-r from-purple-800 to-violet-700 bg-clip-text text-transparent">Generated YAML Configuration</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={onSave}
                      disabled={!validationResult.isValid || saving}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Save YAML
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyYaml}
                      disabled={copiedYaml}
                    >
                      {copiedYaml ? (
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copiedYaml ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadYaml}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="flex-1 border-t border-gray-200 overflow-hidden">
                  <div className="h-full overflow-y-auto" style={{ overflowX: 'hidden' }}>
                    <SyntaxHighlighter
                      language="yaml"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: '16px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        backgroundColor: '#1e1e1e',
                        border: 'none'
                      }}
                      wrapLines={true}
                      wrapLongLines={true}
                      showLineNumbers={false}
                    >
                      {generatedYaml}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="flex-1 mt-4 flex flex-col">
            <Card className="flex-1 border-l-4 border-l-purple-500 shadow-xl backdrop-blur-sm flex flex-col bg-white/80">
              <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold bg-gradient-to-r from-purple-800 to-violet-700 bg-clip-text text-transparent">
                    {showRaw ? 'Raw Template' : 'Processed Template'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onToggleRaw}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      {showRaw ? 'Show Processed' : 'Show Raw'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyTemplate}
                      disabled={copiedTemplate}
                    >
                      {copiedTemplate ? (
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copiedTemplate ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="flex-1 border-t border-gray-200 overflow-hidden">
                  <div className="h-full overflow-y-auto" style={{ overflowX: 'hidden' }}>
                    <SyntaxHighlighter
                      language="text"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: '16px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        backgroundColor: '#1e1e1e',
                        border: 'none'
                      }}
                      wrapLines={true}
                      wrapLongLines={true}
                      showLineNumbers={false}
                    >
                      {showRaw ? template : processedTemplate}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="flex-1 mt-4">
            <div className="space-y-4">
              {/* Configuration Summary */}
              <Card className="border-l-4 border-l-purple-500 shadow-xl backdrop-blur-sm bg-white/80">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
                  <CardTitle className="text-base bg-gradient-to-r from-purple-800 to-violet-700 bg-clip-text text-transparent font-bold">Configuration Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-purple-900">Prompt</div>
                        <div className="text-sm text-purple-700">{formData.promptName || 'Not selected'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-purple-900">Version</div>
                        <div className="text-sm text-purple-700">{formData.version || 'Not selected'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-purple-900">Variables</div>
                        <div className="text-sm text-purple-700">
                          {variableStats.filled} of {variableStats.total} filled
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-purple-900">Models</div>
                        <div className="text-sm text-purple-700">
                          {formData.testParameters?.models?.length || 0} configured
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-purple-900">Status</div>
                        <Badge 
                          variant={validationResult.isValid ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {validationResult.isValid ? 'Valid' : 'Invalid'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Model Configuration Details */}
                  {formData.testParameters?.models && formData.testParameters.models.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-purple-900 mb-3">Model Configuration</div>
                      <div className="space-y-2">
                        {formData.testParameters.models.map((model) => (
                          <Card key={model.id} className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {model.provider}
                                </Badge>
                                <span className="text-sm font-medium">{model.model}</span>
                              </div>
                              <div className="text-xs text-purple-600">
                                T:{model.temperature} | Max:{model.maxTokens}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}