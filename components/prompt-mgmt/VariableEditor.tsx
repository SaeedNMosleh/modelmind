'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  // Trash2, - Unused 
  Edit3, 
  // Check, - Unused 
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import { TemplateVariable } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '@/components/ui/alert'; - Unused
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VariableEditorProps {
  variables: TemplateVariable[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onVariableUpdate?: (variableId: string, updates: Partial<TemplateVariable>) => void;
  allowEditing?: boolean;
  className?: string;
}

export function VariableEditor({
  variables,
  values,
  onChange,
  onVariableUpdate,
  allowEditing = false,
  className
}: VariableEditorProps) {
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVariable, setNewVariable] = useState<Partial<TemplateVariable>>({
    name: '',
    type: 'string',
    required: true,
    description: ''
  });
  
  const handleValueChange = (name: string, value: unknown) => {
    const updated = { ...values, [name]: value };
    onChange(updated);
  };
  
  const parseInputValue = (variable: TemplateVariable, inputValue: string): unknown => {
    if (inputValue === '') return undefined;
    
    switch (variable.type) {
      case 'number':
        const num = parseFloat(inputValue);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        return inputValue.toLowerCase() === 'true';
      case 'array':
        try {
          return JSON.parse(inputValue);
        } catch {
          return inputValue.split(',').map(s => s.trim());
        }
      case 'object':
        try {
          return JSON.parse(inputValue);
        } catch {
          return { value: inputValue };
        }
      default:
        return inputValue;
    }
  };
  
  const formatDisplayValue = (variable: TemplateVariable, value: unknown): string => {
    if (value === undefined || value === null) return '';
    
    if (variable.type === 'object' || variable.type === 'array') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };
  
  const getVariableIcon = (type: TemplateVariable['type']) => {
    switch (type) {
      case 'string': return '📝';
      case 'number': return '🔢';
      case 'boolean': return '☑️';
      case 'array': return '📋';
      case 'object': return '🗂️';
      default: return '❓';
    }
  };
  
  const validateVariable = (variable: TemplateVariable, value: unknown): string | null => {
    if (variable.required && (value === undefined || value === '')) {
      return 'This field is required';
    }
    
    if (value !== undefined && variable.validation) {
      const val = variable.validation;
      
      if (val.pattern && typeof value === 'string') {
        const regex = new RegExp(val.pattern);
        if (!regex.test(value)) {
          return 'Value does not match required pattern';
        }
      }
      
      if (val.minLength && typeof value === 'string' && value.length < val.minLength) {
        return `Minimum length is ${val.minLength}`;
      }
      
      if (val.maxLength && typeof value === 'string' && value.length > val.maxLength) {
        return `Maximum length is ${val.maxLength}`;
      }
      
      if (val.min && typeof value === 'number' && value < val.min) {
        return `Minimum value is ${val.min}`;
      }
      
      if (val.max && typeof value === 'number' && value > val.max) {
        return `Maximum value is ${val.max}`;
      }
      
      if (val.enum && !val.enum.includes(value)) {
        return `Value must be one of: ${val.enum.join(', ')}`;
      }
    }
    
    return null;
  };
  
  const handleAddVariable = () => {
    if (!newVariable.name || !onVariableUpdate) return;
    
    const variable: TemplateVariable = {
      name: newVariable.name,
      type: newVariable.type || 'string',
      required: newVariable.required || false,
      description: newVariable.description || ''
    };
    
    onVariableUpdate(newVariable.name, variable);
    setNewVariable({ name: '', type: 'string', required: true, description: '' });
    setShowAddDialog(false);
  };
  
  if (variables.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Variables Found</p>
            <p className="text-sm">
              Template variables will appear here when you use {`{{variableName}}`} syntax in your template.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Template Variables</h3>
          <p className="text-sm text-gray-600">
            Configure values for the variables used in your template
          </p>
        </div>
        
        {allowEditing && onVariableUpdate && (
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {variables.map((variable) => {
          const currentValue = values[variable.name];
          const validationError = validateVariable(variable, currentValue);
          const isEditing = editingVariable === variable.name;
          
          return (
            <Card key={variable.name} className={cn(
              'transition-all duration-200',
              validationError && 'border-red-200 bg-red-50'
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg" title={`Type: ${variable.type}`}>
                      {getVariableIcon(variable.type)}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base font-mono">
                          {variable.name}
                        </CardTitle>
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
                        <CardDescription className="text-sm">
                          {variable.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  
                  {allowEditing && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingVariable(isEditing ? null : variable.name)}
                      >
                        {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Variable Value Input */}
                <div className="space-y-2">
                  <Label htmlFor={`var-${variable.name}`} className="text-sm font-medium">
                    Value
                  </Label>
                  
                  {variable.type === 'boolean' ? (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`var-${variable.name}`}
                        checked={Boolean(currentValue)}
                        onCheckedChange={(checked) => handleValueChange(variable.name, checked)}
                      />
                      <span className="text-sm text-gray-600">
                        {currentValue ? 'True' : 'False'}
                      </span>
                    </div>
                  ) : variable.validation?.enum ? (
                    <Select
                      value={String(currentValue || '')}
                      onValueChange={(value) => handleValueChange(variable.name, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a value" />
                      </SelectTrigger>
                      <SelectContent>
                        {variable.validation.enum.map((option) => (
                          <SelectItem key={String(option)} value={String(option)}>
                            {String(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : variable.type === 'object' || variable.type === 'array' ? (
                    <Textarea
                      id={`var-${variable.name}`}
                      value={formatDisplayValue(variable, currentValue)}
                      onChange={(e) => {
                        const parsed = parseInputValue(variable, e.target.value);
                        handleValueChange(variable.name, parsed);
                      }}
                      placeholder={
                        variable.type === 'array' 
                          ? '["item1", "item2"] or item1, item2'
                          : '{"key": "value"}'
                      }
                      rows={3}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <Input
                      id={`var-${variable.name}`}
                      type={variable.type === 'number' ? 'number' : 'text'}
                      value={formatDisplayValue(variable, currentValue)}
                      onChange={(e) => {
                        const parsed = parseInputValue(variable, e.target.value);
                        handleValueChange(variable.name, parsed);
                      }}
                      placeholder={variable.defaultValue ? `Default: ${variable.defaultValue}` : `Enter ${variable.name}`}
                      className={validationError ? 'border-red-300' : ''}
                    />
                  )}
                  
                  {validationError && (
                    <div className="flex items-center space-x-1 text-red-600 text-sm">
                      <AlertCircle className="h-3 w-3" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>
                
                {/* Examples */}
                {variable.examples && variable.examples.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Examples</Label>
                    <div className="flex flex-wrap gap-1">
                      {variable.examples.slice(0, 3).map((example, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs h-6"
                          onClick={() => handleValueChange(variable.name, example)}
                        >
                          {typeof example === 'object' ? JSON.stringify(example) : String(example)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Validation Rules */}
                {variable.validation && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center space-x-1">
                      <Info className="h-3 w-3" />
                      <span>Validation rules:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 ml-4">
                      {variable.validation.pattern && (
                        <li>Must match pattern: <code className="bg-gray-100 px-1 rounded">{variable.validation.pattern}</code></li>
                      )}
                      {variable.validation.minLength && (
                        <li>Minimum length: {variable.validation.minLength}</li>
                      )}
                      {variable.validation.maxLength && (
                        <li>Maximum length: {variable.validation.maxLength}</li>
                      )}
                      {variable.validation.min && (
                        <li>Minimum value: {variable.validation.min}</li>
                      )}
                      {variable.validation.max && (
                        <li>Maximum value: {variable.validation.max}</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Add Variable Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variable</DialogTitle>
            <DialogDescription>
              Create a new template variable with validation rules
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-var-name">Variable Name</Label>
              <Input
                id="new-var-name"
                value={newVariable.name || ''}
                onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                placeholder="variableName"
              />
            </div>
            
            <div>
              <Label htmlFor="new-var-type">Type</Label>
              <Select
                value={newVariable.type || 'string'}
                onValueChange={(value: TemplateVariable['type']) => 
                  setNewVariable(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="new-var-description">Description</Label>
              <Textarea
                id="new-var-description"
                value={newVariable.description || ''}
                onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this variable is used for"
                rows={2}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="new-var-required"
                checked={newVariable.required || false}
                onCheckedChange={(checked) => setNewVariable(prev => ({ ...prev, required: checked }))}
              />
              <Label htmlFor="new-var-required">Required</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVariable} disabled={!newVariable.name}>
              Add Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}