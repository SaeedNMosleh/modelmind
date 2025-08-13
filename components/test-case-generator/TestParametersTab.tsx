'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, Plus, X, Settings2, Cpu
} from 'lucide-react';

import { TestParameters, ModelConfiguration } from '@/lib/test-case-generator/types';

interface TestParametersTabProps {
  testParameters: TestParameters;
  onModelAdd: () => void;
  onModelUpdate: (modelId: string, updates: Partial<ModelConfiguration>) => void;
  onModelRemove: (modelId: string) => void;
}

export function TestParametersTab({
  testParameters,
  onModelAdd,
  onModelUpdate,
  onModelRemove
}: TestParametersTabProps) {
  const [editingModel, setEditingModel] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col space-y-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent">Test Parameters</h3>
            <p className="text-sm text-emerald-700 font-medium">
              Configure AI models for testing ({testParameters.models?.length || 0} model{(testParameters.models?.length || 0) !== 1 ? 's' : ''})
            </p>
          </div>
        </div>
        
        <Button
          onClick={onModelAdd}
          size="sm"
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Model
        </Button>
      </div>

      {/* Models Configuration */}
      <div className="flex-1 overflow-y-auto">
        <Card className="border-l-4 border-l-emerald-500 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent font-bold">AI Models</h3>
                <p className="text-sm text-emerald-700 font-normal">
                  Configure the AI models that will be used for testing
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(testParameters.models || []).map((model, index) => (
                <Card key={model.id} className="bg-gradient-to-r from-white to-emerald-50 border-emerald-200 hover:shadow-md transition-all duration-300 border-l-4 border-l-emerald-400">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Cpu className="h-4 w-4 text-emerald-600" />
                        <Badge variant="outline" className="text-xs">
                          Model {index + 1}
                        </Badge>
                        <span className="text-sm font-medium text-emerald-800">
                          {model.provider}:{model.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingModel(editingModel === model.id ? null : model.id)}
                          className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 transition-colors duration-200"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        {(testParameters.models?.length || 0) > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onModelRemove(model.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {editingModel === model.id && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-emerald-800">Provider</Label>
                          <Select
                            value={model.provider}
                            onValueChange={(provider) => 
                              onModelUpdate(model.id, { provider: provider as 'openai' | 'anthropic' | 'local' | 'custom' })
                            }
                          >
                            <SelectTrigger className="bg-white border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-900 shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-emerald-800">Model</Label>
                          <Input
                            value={model.model}
                            onChange={(e) => onModelUpdate(model.id, { model: e.target.value })}
                            className="bg-white border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-900 shadow-sm"
                            placeholder="e.g. gpt-4"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-emerald-800">Temperature</Label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={model.temperature}
                            onChange={(e) => onModelUpdate(model.id, { temperature: parseFloat(e.target.value) })}
                            className="bg-white border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-900 shadow-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-emerald-800">Max Tokens</Label>
                          <Input
                            type="number"
                            min="1"
                            max="8000"
                            value={model.maxTokens}
                            onChange={(e) => onModelUpdate(model.id, { maxTokens: parseInt(e.target.value) })}
                            className="bg-white border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-900 shadow-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}