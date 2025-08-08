'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Play, 
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  FileText
  // Settings - Unused
} from 'lucide-react';
// import { TestCaseFormData } from '@/lib/prompt-mgmt/types'; - Defined locally
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MonacoEditor } from '@/components/prompt-mgmt/MonacoEditor';
import { cn } from '@/lib/utils';

interface TestCase {
  _id: string;
  name: string;
  description: string;
  vars: Record<string, unknown>;
  assert: Array<{
    type: string;
    value?: unknown;
    threshold?: number;
    provider?: string;
    rubric?: string;
    metric?: string;
  }>;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface TestCaseFormData {
  name: string;
  description: string;
  vars: Record<string, unknown> | string;
  assert: TestCase['assert'];
  tags: string[];
  metadata?: Record<string, unknown>;
}

interface TestCaseEditorProps {
  promptId: string;
  onTestCasesChange?: () => void;
  className?: string;
}

export function TestCaseEditor({
  promptId,
  onTestCasesChange,
  className
}: TestCaseEditorProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<TestCaseFormData>({
    name: '',
    description: '',
    vars: {},
    assert: [],
    tags: [],
    metadata: {}
  });
  
  // Fetch test cases
  useEffect(() => {
    const fetchTestCases = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-cases?promptId=${promptId}`);
        const data = await response.json();
        
        if (data.success) {
          setTestCases(data.data || []);
        } else {
          setError(data.error?.message || data.error || 'Failed to load test cases');
        }
      } catch {
        setError('Failed to load test cases');
      } finally {
        setLoading(false);
      }
    };
    
    if (promptId) {
      fetchTestCases();
    }
  }, [promptId]);
  
  const handleSaveTestCase = async () => {
    try {
      const url = editingCase ? `/api/test-cases/${editingCase}` : '/api/test-cases';
      const method = editingCase ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        promptId,
        vars: typeof formData.vars === 'string' ? JSON.parse(formData.vars) : formData.vars
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh test cases
        const refreshResponse = await fetch(`/api/test-cases?promptId=${promptId}`);
        const refreshData = await refreshResponse.json();
        
        if (refreshData.success) {
          setTestCases(refreshData.data || []);
        }
        
        setShowAddDialog(false);
        setEditingCase(null);
        setFormData({
          name: '',
          description: '',
          vars: {},
          assert: [],
          tags: [],
          metadata: {}
        });
        
        onTestCasesChange?.();
      } else {
        setError(result.error?.message || result.error || 'Failed to save test case');
      }
    } catch {
      setError('Failed to save test case');
    }
  };
  
  const handleDeleteTestCase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test case?')) return;
    
    try {
      const response = await fetch(`/api/test-cases/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTestCases(prev => prev.filter(tc => tc._id !== id));
        onTestCasesChange?.();
      } else {
        setError(result.error?.message || result.error || 'Failed to delete test case');
      }
    } catch {
      setError('Failed to delete test case');
    }
  };
  
  const handleEditTestCase = (testCase: TestCase) => {
    setFormData({
      name: testCase.name,
      description: testCase.description,
      vars: testCase.vars,
      assert: testCase.assert,
      tags: testCase.tags,
      metadata: testCase.metadata || {}
    });
    setEditingCase(testCase._id);
    setShowAddDialog(true);
  };
  
  const handleDuplicateTestCase = (testCase: TestCase) => {
    setFormData({
      name: `${testCase.name} (Copy)`,
      description: testCase.description,
      vars: testCase.vars,
      assert: testCase.assert,
      tags: testCase.tags,
      metadata: testCase.metadata || {}
    });
    setEditingCase(null);
    setShowAddDialog(true);
  };
  
  const handleRunSingleTest = async (testCaseId: string) => {
    try {
      const response = await fetch(`/api/prompt-mgmt/${promptId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseIds: [testCaseId]
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Navigate to test results or show success message
        alert('Test started successfully!');
      } else {
        setError(result.error?.message || result.error || 'Failed to start test');
      }
    } catch {
      setError('Failed to start test');
    }
  };
  
  const handleAddAssertion = () => {
    setFormData(prev => ({
      ...prev,
      assert: [
        ...prev.assert,
        {
          type: 'contains',
          value: ''
        }
      ]
    }));
  };
  
  const handleUpdateAssertion = (index: number, updates: Partial<TestCase['assert'][0]>) => {
    setFormData(prev => ({
      ...prev,
      assert: prev.assert.map((assertion, i) => 
        i === index ? { ...assertion, ...updates } : assertion
      )
    }));
  };
  
  const handleRemoveAssertion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      assert: prev.assert.filter((_, i) => i !== index)
    }));
  };
  
  const assertionTypes = [
    { value: 'contains', label: 'Contains Text' },
    { value: 'not-contains', label: 'Does Not Contain' },
    { value: 'starts-with', label: 'Starts With' },
    { value: 'ends-with', label: 'Ends With' },
    { value: 'regex', label: 'Regex Match' },
    { value: 'plantuml-valid', label: 'Valid PlantUML' },
    { value: 'plantuml-syntax', label: 'PlantUML Syntax Check' },
    { value: 'similarity', label: 'Similarity Score' },
    { value: 'length', label: 'Length Check' },
    { value: 'custom', label: 'Custom Assertion' }
  ];
  
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Test Cases</h3>
          <p className="text-sm text-gray-600">
            Manage test cases for validating prompt performance
          </p>
        </div>
        
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Test Case
        </Button>
      </div>
      
      {/* Error Display */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Test Cases List */}
      {testCases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">No Test Cases</p>
            <p className="text-gray-600 mb-4">
              Create test cases to validate your prompt&apos;s performance
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Test Case
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Test Cases ({testCases.length})</CardTitle>
            <CardDescription>
              Define test scenarios and validation criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Assertions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testCases.map((testCase) => (
                  <TableRow key={testCase._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{testCase.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {testCase.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {testCase.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {Object.keys(testCase.vars).length} vars
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {testCase.assert.length} checks
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRunSingleTest(testCase._id)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTestCase(testCase)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateTestCase(testCase)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTestCase(testCase._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Add/Edit Test Case Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCase ? 'Edit Test Case' : 'Add Test Case'}
            </DialogTitle>
            <DialogDescription>
              Define test variables and validation criteria for your prompt
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="assertions">Assertions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Test case name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this test case validates"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    setFormData(prev => ({ ...prev, tags }));
                  }}
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="variables" className="space-y-4">
              <div>
                <Label>Test Variables</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Define the variable values for this test case (JSON format)
                </p>
                <MonacoEditor
                  value={typeof formData.vars === 'string' ? formData.vars : JSON.stringify(formData.vars, null, 2)}
                  onChange={(value) => {
                    try {
                      const parsed = JSON.parse(value);
                      setFormData(prev => ({ ...prev, vars: parsed }));
                    } catch {
                      setFormData(prev => ({ ...prev, vars: value }));
                    }
                  }}
                  height="300px"
                  language="json"
                  options={{
                    wordWrap: 'on',
                    minimap: { enabled: false }
                  }}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="assertions" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Validation Assertions</Label>
                <Button variant="outline" size="sm" onClick={handleAddAssertion}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Assertion
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.assert.map((assertion, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Assertion {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssertion(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={assertion.type}
                          onValueChange={(value) => handleUpdateAssertion(index, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assertionTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Value</Label>
                        <Input
                          value={String(assertion.value || '')}
                          onChange={(e) => handleUpdateAssertion(index, { value: e.target.value })}
                          placeholder="Expected value or pattern"
                        />
                      </div>
                      
                      {assertion.type === 'similarity' && (
                        <div>
                          <Label>Threshold</Label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={assertion.threshold || 0.8}
                            onChange={(e) => handleUpdateAssertion(index, { threshold: parseFloat(e.target.value) })}
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                
                {formData.assert.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No assertions defined</p>
                    <p className="text-sm">Add assertions to validate the output</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTestCase}>
              <Save className="h-4 w-4 mr-2" />
              {editingCase ? 'Update' : 'Create'} Test Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}