'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, ChevronDown, ChevronRight, Sparkles, 
  Wand2, CheckCircle, AlertCircle, Loader2,
  RotateCcw
} from 'lucide-react';

import { TemplateVariable } from '@/lib/prompt-mgmt/types';
import { VariablePreset } from '@/lib/test-case-generator/types';
import { DiagramType } from '@/lib/database/types';
import { AnalysisType } from '@/lib/ai-pipeline/schemas/MasterClassificationSchema';

interface ConfigureTabProps {
  variables: Record<string, unknown>;
  variableCompletion: Record<string, boolean>;
  templateVariables: TemplateVariable[];
  presets: VariablePreset[];
  selectedPrompt: { agentType: string; operation: string } | null;
  onVariableUpdate: (name: string, value: unknown) => void;
  onPresetApply: (preset: VariablePreset) => void;
}

export function ConfigureTab({
  variables,
  variableCompletion,
  templateVariables,
  presets,
  selectedPrompt,
  onVariableUpdate,
  onPresetApply
}: ConfigureTabProps) {
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  // Progress calculation
  const completionProgress = useMemo(() => {
    if (templateVariables.length === 0) return 0;
    const completedCount = templateVariables.filter(v => variableCompletion[v.name]).length;
    return Math.round((completedCount / templateVariables.length) * 100);
  }, [templateVariables, variableCompletion]);

  // Handle variable input changes
  const handleVariableChange = (name: string, value: unknown) => {
    onVariableUpdate(name, value);
  };

  // Get enum options for specific variable names
  const getEnumOptions = (variableName: string): string[] => {
    switch (variableName) {
      case 'diagramType':
        return Object.values(DiagramType);
      case 'analysisType':
        // Only show analysisType dropdown for Analyzer agent with Analysis operation
        if (selectedPrompt?.agentType === 'analyzer' && selectedPrompt?.operation === 'analysis') {
          return Object.values(AnalysisType);
        }
        return [];
      default:
        return [];
    }
  };

  // Handle preset application with animation
  const handlePresetApply = async (preset: VariablePreset) => {
    setApplyingPreset(preset.id);
    
    // Stagger the application of variables for smooth animation
    const variables = Object.entries(preset.variables);
    for (let i = 0; i < variables.length; i++) {
      const [name, value] = variables[i];
      setTimeout(() => {
        onVariableUpdate(name, value);
      }, i * 150);
    }
    
    setTimeout(() => {
      setApplyingPreset(null);
      onPresetApply(preset);
    }, variables.length * 150 + 500);
  };

  // Toggle variable expansion
  const toggleVariableExpansion = (name: string) => {
    setExpandedVariables(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Render variable input based on type
  const renderVariableInput = (variable: TemplateVariable) => {
    const value = variables[variable.name] ?? '';
    
    // Check if this is a predefined enum variable
    const enumOptions = getEnumOptions(variable.name);
    
    switch (variable.type) {
      case 'string':
        // Handle predefined enums first
        if (enumOptions.length > 0) {
          return (
            <Select value={value as string} onValueChange={(v) => handleVariableChange(variable.name, v)}>
              <SelectTrigger className="bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 shadow-sm">
                <SelectValue placeholder={`Select ${variable.name}`} />
              </SelectTrigger>
              <SelectContent>
                {enumOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{option.toLowerCase().replace(/[_-]/g, ' ')}</span>
                      <span className="text-xs text-gray-500">({option})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        
        // Handle validation enums
        if (variable.validation?.enum) {
          return (
            <Select value={value as string} onValueChange={(v) => handleVariableChange(variable.name, v)}>
              <SelectTrigger className="bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 shadow-sm">
                <SelectValue placeholder={`Select ${variable.name}`} />
              </SelectTrigger>
              <SelectContent>
                {variable.validation.enum.map(option => (
                  <SelectItem key={String(option)} value={String(option)}>
                    {String(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        
        // Regular string input with textarea
        return (
          <Textarea
            value={value as string}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            placeholder={variable.description || `Enter ${variable.name}`}
            className="bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 min-h-[120px] shadow-sm"
            rows={6}
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => handleVariableChange(variable.name, parseFloat(e.target.value) || 0)}
            placeholder={variable.description || `Enter ${variable.name}`}
            className="bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 shadow-sm"
          />
        );
        
      case 'boolean':
        return (
          <Select value={String(value)} onValueChange={(v) => handleVariableChange(variable.name, v === 'true')}>
            <SelectTrigger className="bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );
        
      default:
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleVariableChange(variable.name, parsed);
              } catch {
                handleVariableChange(variable.name, e.target.value);
              }
            }}
            placeholder={`Enter ${variable.name} as JSON`}
            className="bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-mono text-sm shadow-sm"
            rows={3}
          />
        );
    }
  };

  // Render variable card
  const renderVariableCard = (variable: TemplateVariable) => {
    const isCompleted = variableCompletion[variable.name];
    const isExpanded = expandedVariables.has(variable.name);
    
    return (
      <Card 
        key={variable.name}
        className={`transition-all duration-300 hover:shadow-lg border-l-4 ${
          isCompleted 
            ? 'border-l-emerald-500 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-emerald-100' 
            : variable.required 
              ? 'border-l-red-500 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 shadow-red-100' 
              : 'border-l-blue-400 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-blue-100'
        } hover:scale-[1.01] backdrop-blur-sm`}
      >
        <CardHeader 
          className="pb-3 cursor-pointer"
          onClick={() => toggleVariableExpansion(variable.name)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 drop-shadow-sm" />
              ) : variable.required ? (
                <AlertCircle className="h-5 w-5 text-red-500 drop-shadow-sm" />
              ) : (
                <div className="h-5 w-5 border-2 border-blue-300 rounded-full bg-white shadow-sm" />
              )}
              <div>
                <Label className="text-sm font-semibold text-blue-900">
                  {variable.name}
                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {variable.description && (
                  <p className="text-xs text-blue-700 mt-1">{variable.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-blue-100 border-blue-300 text-blue-800">
                {variable.type}
              </Badge>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-blue-600" />
              )}
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {renderVariableInput(variable)}
              {variable.defaultValue !== undefined && variable.defaultValue !== null && variable.defaultValue !== '' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVariableChange(variable.name, variable.defaultValue)}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors duration-200"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset to default
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 p-6 rounded-lg">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-800 to-cyan-700 bg-clip-text text-transparent">Configuration</h3>
            <p className="text-sm text-blue-700 font-medium">
              {completionProgress}% complete ({templateVariables.filter(v => variableCompletion[v.name]).length}/{templateVariables.length} variables)
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-32 h-3 bg-blue-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 transition-all duration-500 shadow-sm"
            style={{ width: `${completionProgress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Variable Presets - Compact Buttons */}
        {presets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Wand2 className="h-4 w-4 text-cyan-600" />
              Variable Presets
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map(preset => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetApply(preset)}
                  disabled={applyingPreset === preset.id}
                  className="text-xs bg-white/80 hover:bg-blue-100 border-blue-300 text-blue-800 hover:text-blue-900 shadow-sm hover:shadow-md transition-all duration-200"
                  title={preset.description}
                >
                  {applyingPreset === preset.id ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Variables List - Simple and Static */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-cyan-600" />
            Template Variables
          </h4>
          <div className="space-y-3">
            {templateVariables.map(renderVariableCard)}
          </div>
        </div>

      </div>
    </div>
  );
}