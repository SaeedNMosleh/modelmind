'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  TestTube2, Plus, X, Wand2, Brain, Target, Clock, 
  Code2, FileCheck, AlertTriangle, CheckCircle,
  Trash2, Copy
} from 'lucide-react';

import { AssertionConfiguration } from '@/lib/test-case-generator/types';

interface AssertionsTabProps {
  assertions: AssertionConfiguration[];
  onAssertionUpdate: (assertions: AssertionConfiguration[]) => void;
}

export function AssertionsTab({
  assertions,
  onAssertionUpdate
}: AssertionsTabProps) {
  const [expandedAssertion, setExpandedAssertion] = useState<string | null>(null);

  // Assertion type configurations with enhanced UI metadata
  const assertionTypes: Array<{
    type: AssertionConfiguration['type'];
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
    fields: string[];
    example: string;
  }> = [
    {
      type: 'contains' as const,
      label: 'Contains Text',
      icon: FileCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-300',
      description: 'Check if output contains specific text',
      fields: ['value'],
      example: 'PlantUML'
    },
    {
      type: 'not-contains' as const,
      label: 'Does Not Contain',
      icon: X,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      description: 'Check if output does not contain specific text',
      fields: ['value'],
      example: 'error'
    },
    {
      type: 'latency' as const,
      label: 'Response Time',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      description: 'Check response time threshold',
      fields: ['threshold'],
      example: '5000'
    },
    {
      type: 'javascript' as const,
      label: 'Custom JavaScript',
      icon: Code2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-300',
      description: 'Custom JavaScript validation logic',
      fields: ['value'],
      example: 'output.includes("@startuml")'
    },
    {
      type: 'llm-rubric' as const,
      label: 'LLM Rubric',
      icon: Brain,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      borderColor: 'border-indigo-300',
      description: 'AI-powered evaluation rubric',
      fields: ['rubric', 'provider'],
      example: 'Is this a valid UML diagram?'
    },
    {
      type: 'plantuml-valid' as const,
      label: 'PlantUML Validity',
      icon: Target,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      borderColor: 'border-emerald-300',
      description: 'Validate PlantUML syntax',
      fields: [],
      example: 'Validates diagram syntax'
    },
    {
      type: 'custom' as const,
      label: 'Custom Assertion',
      icon: Wand2,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      description: 'Define custom validation logic',
      fields: ['value', 'description'],
      example: 'Custom validation'
    }
  ];

  // Add new assertion
  const handleAddAssertion = () => {
    const newAssertion: AssertionConfiguration = {
      id: `assertion-${Date.now()}`,
      type: 'contains',
      enabled: true
    };
    onAssertionUpdate([...assertions, newAssertion]);
    setExpandedAssertion(newAssertion.id);
  };

  // Update assertion
  const handleUpdateAssertion = (id: string, updates: Partial<AssertionConfiguration>) => {
    const updatedAssertions = assertions.map(assertion =>
      assertion.id === id ? { ...assertion, ...updates } : assertion
    );
    onAssertionUpdate(updatedAssertions);
  };

  // Remove assertion
  const handleRemoveAssertion = (id: string) => {
    const updatedAssertions = assertions.filter(assertion => assertion.id !== id);
    onAssertionUpdate(updatedAssertions);
    if (expandedAssertion === id) {
      setExpandedAssertion(null);
    }
  };

  // Duplicate assertion
  const handleDuplicateAssertion = (assertion: AssertionConfiguration) => {
    const duplicatedAssertion: AssertionConfiguration = {
      ...assertion,
      id: `assertion-${Date.now()}`,
      description: assertion.description ? `${assertion.description} (Copy)` : undefined
    };
    onAssertionUpdate([...assertions, duplicatedAssertion]);
    setExpandedAssertion(duplicatedAssertion.id);
  };

  // Toggle assertion expansion
  const toggleExpansion = (id: string) => {
    setExpandedAssertion(expandedAssertion === id ? null : id);
  };

  // Get assertion type config
  const getAssertionTypeConfig = (type: AssertionConfiguration['type']) => {
    return assertionTypes.find(t => t.type === type) || assertionTypes[0];
  };

  // Render assertion fields based on type
  const renderAssertionFields = (assertion: AssertionConfiguration) => {
    const config = getAssertionTypeConfig(assertion.type);
    
    return (
      <div className="space-y-4">
        {config.fields.includes('value') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Value</Label>
            {assertion.type === 'javascript' || assertion.type === 'custom' ? (
              <Textarea
                value={assertion.value as string || ''}
                onChange={(e) => handleUpdateAssertion(assertion.id, { value: e.target.value })}
                placeholder={config.example}
                className="font-mono text-sm"
                rows={4}
              />
            ) : (
              <Input
                value={assertion.value as string || ''}
                onChange={(e) => handleUpdateAssertion(assertion.id, { value: e.target.value })}
                placeholder={config.example}
                className="bg-white border-gray-200 focus:border-blue-400"
              />
            )}
          </div>
        )}

        {config.fields.includes('threshold') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Threshold</Label>
            <Input
              type="number"
              value={assertion.threshold || ''}
              onChange={(e) => handleUpdateAssertion(assertion.id, { threshold: parseFloat(e.target.value) || 0 })}
              placeholder={config.example}
              className="bg-white border-gray-200 focus:border-blue-400"
            />
          </div>
        )}

        {config.fields.includes('provider') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Provider</Label>
            <Select
              value={assertion.provider || 'openai'}
              onValueChange={(value) => handleUpdateAssertion(assertion.id, { provider: value })}
            >
              <SelectTrigger className="bg-white border-gray-200 focus:border-blue-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="local">Local Model</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {config.fields.includes('rubric') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Evaluation Rubric</Label>
            <Textarea
              value={assertion.rubric || ''}
              onChange={(e) => handleUpdateAssertion(assertion.id, { rubric: e.target.value })}
              placeholder="Describe what makes a good response..."
              rows={3}
              className="bg-white border-gray-200 focus:border-blue-400"
            />
          </div>
        )}

        {config.fields.includes('description') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Input
              value={assertion.description || ''}
              onChange={(e) => handleUpdateAssertion(assertion.id, { description: e.target.value })}
              placeholder="Describe this assertion"
              className="bg-white border-gray-200 focus:border-blue-400"
            />
          </div>
        )}
      </div>
    );
  };

  // Render assertion card
  const renderAssertionCard = (assertion: AssertionConfiguration) => {
    const config = getAssertionTypeConfig(assertion.type);
    const isExpanded = expandedAssertion === assertion.id;
    
    return (
      <Card 
        key={assertion.id}
        className={`transition-all duration-300 hover:shadow-md ${config.borderColor} ${config.bgColor}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpansion(assertion.id)}>
              <div className={`p-2 ${config.bgColor} rounded-lg border ${config.borderColor}`}>
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{config.label}</h4>
                  <Badge 
                    variant={assertion.enabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {assertion.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{config.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={assertion.enabled}
                onCheckedChange={(enabled) => handleUpdateAssertion(assertion.id, { enabled })}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDuplicateAssertion(assertion)}
                className="text-gray-600 hover:text-gray-900"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAssertion(assertion.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              <Separator />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assertion Type</Label>
                <Select
                  value={assertion.type}
                  onValueChange={(type) => handleUpdateAssertion(assertion.id, { 
                    type: type as AssertionConfiguration['type'],
                    // Reset fields when type changes
                    value: undefined,
                    threshold: undefined,
                    provider: undefined,
                    rubric: undefined
                  })}
                >
                  <SelectTrigger className="bg-white border-gray-200 focus:border-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assertionTypes.map(type => (
                      <SelectItem key={type.type} value={type.type}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`h-4 w-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {renderAssertionFields(assertion)}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // Group assertions by enabled status
  const enabledAssertions = assertions.filter(a => a.enabled);
  const disabledAssertions = assertions.filter(a => !a.enabled);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TestTube2 className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Test Assertions</h3>
            <p className="text-sm text-gray-600">
              {assertions.length} assertion{assertions.length !== 1 ? 's' : ''} 
              ({enabledAssertions.length} enabled)
            </p>
          </div>
        </div>
        
        <Button onClick={handleAddAssertion} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Assertion
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {assertions.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <div className="p-3 bg-orange-50 rounded-full w-fit mx-auto mb-4">
                <TestTube2 className="h-8 w-8 text-orange-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Assertions Defined</h4>
              <p className="text-gray-600 mb-6">
                Assertions validate your test outputs. Add assertions to ensure quality and accuracy.
              </p>
              
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6">
                {assertionTypes.slice(0, 4).map(type => (
                  <Button
                    key={type.type}
                    variant="outline"
                    onClick={() => {
                      const newAssertion: AssertionConfiguration = {
                        id: `assertion-${Date.now()}`,
                        type: type.type,
                        enabled: true
                      };
                      onAssertionUpdate([newAssertion]);
                      setExpandedAssertion(newAssertion.id);
                    }}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </Button>
                ))}
              </div>
              
              <Button onClick={handleAddAssertion} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create First Assertion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Enabled Assertions */}
            {enabledAssertions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-semibold text-emerald-800">
                    Active Assertions ({enabledAssertions.length})
                  </h4>
                </div>
                {enabledAssertions.map(renderAssertionCard)}
              </div>
            )}
            
            {/* Disabled Assertions */}
            {disabledAssertions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-700">
                    Disabled Assertions ({disabledAssertions.length})
                  </h4>
                </div>
                {disabledAssertions.map(renderAssertionCard)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {assertions.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <span className="text-sm font-medium">{enabledAssertions.length} Active</span>
                </div>
                {disabledAssertions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="text-sm text-gray-600">{disabledAssertions.length} Disabled</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  {assertions.length} Total
                </Badge>
                {enabledAssertions.length === 0 && (
                  <Badge variant="destructive" className="text-xs">
                    No Active Tests
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}