'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, Save, Loader2
} from 'lucide-react';

interface PresetForEdit {
  id: string;
  name: string;
  description: string;
  agentType?: string;
  operation?: string;
  variables: Record<string, unknown>;
}

interface PresetManagerProps {
  presets: PresetForEdit[];
  onRefreshPresets: () => void;
}

export function PresetManager({ presets, onRefreshPresets }: PresetManagerProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [selectedVariableName, setSelectedVariableName] = useState<string>('');
  const [variableValue, setVariableValue] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Get selected preset
  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  
  // Get variables from selected preset
  const availableVariables = selectedPreset ? Object.keys(selectedPreset.variables || {}) : [];

  // Handle preset selection
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    setSelectedVariableName('');
    setVariableValue('');
    setOriginalValue('');
  };

  // Handle variable selection
  const handleVariableSelect = (variableName: string) => {
    setSelectedVariableName(variableName);
    if (selectedPreset && selectedPreset.variables && selectedPreset.variables[variableName] !== undefined) {
      const value = selectedPreset.variables[variableName];
      const formattedValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      setVariableValue(formattedValue);
      setOriginalValue(formattedValue);
    } else {
      setVariableValue('');
      setOriginalValue('');
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedPreset || !selectedVariableName) return;

    setSaving(true);
    try {
      // Try to parse as JSON first, if it fails use as string
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(variableValue);
      } catch {
        parsedValue = variableValue; // Use as string if not valid JSON
      }

      // Create updated variables object
      const updatedVariables = {
        ...selectedPreset.variables,
        [selectedVariableName]: parsedValue
      };

      const response = await fetch(`/api/variable-presets/${selectedPreset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedPreset,
          variables: updatedVariables
        })
      });

      if (response.ok) {
        // Update the original value to reflect the save
        setOriginalValue(variableValue);
        // Refresh presets in parent component
        onRefreshPresets();
      } else {
        alert('Error saving preset variable.');
      }
    } catch (error) {
      console.error('Error saving preset variable:', error);
      alert('Error saving preset variable.');
    } finally {
      setSaving(false);
    }
  };

  // Check if value has changed
  const hasChanged = variableValue !== originalValue;

  return (
    <Card className="border border-gray-200 shadow-lg bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-purple-200 rounded-lg">
            <Settings className="h-5 w-5 text-purple-600" />
          </div>
          Preset Manager
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Preset Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Preset</Label>
          <Select value={selectedPresetId} onValueChange={handlePresetSelect}>
            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              {presets.length === 0 ? (
                <SelectItem value="no-presets" disabled>
                  No presets found
                </SelectItem>
              ) : (
                presets.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex items-center gap-2">
                      <span>{preset.name}</span>
                      {preset.agentType && (
                        <span className="text-xs text-gray-500">({preset.agentType})</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Variable Selection */}
        {selectedPreset && availableVariables.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Variable</Label>
            <Select value={selectedVariableName} onValueChange={handleVariableSelect}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Select variable" />
              </SelectTrigger>
              <SelectContent>
                {availableVariables.map(variableName => (
                  <SelectItem key={variableName} value={variableName}>
                    {variableName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Variable Value Editor */}
        {selectedPreset && selectedVariableName && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Variable Value</Label>
            <Textarea
              value={variableValue}
              onChange={(e) => setVariableValue(e.target.value)}
              placeholder="Enter variable value"
              className="bg-white border-gray-300 text-gray-900 text-sm min-h-[100px]"
              rows={4}
            />
            <div className="text-xs text-gray-500">
              Tip: You can enter plain text or JSON. JSON will be automatically parsed.
            </div>
          </div>
        )}

        {/* Save Button */}
        {selectedPreset && selectedVariableName && hasChanged && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Variable
              </>
            )}
          </Button>
        )}

        {/* No presets message */}
        {presets.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No presets found. Create presets to manage variables here.
          </div>
        )}

        {/* No variables message */}
        {selectedPreset && availableVariables.length === 0 && (
          <div className="text-center py-2 text-gray-500 text-sm">
            No variables found in this preset.
          </div>
        )}
      </CardContent>
    </Card>
  );
}