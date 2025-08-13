'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Library, Search, Download, Trash2, 
  RefreshCw, ArrowLeft, Calendar,
  FileText, AlertCircle, Plus,
  SortAsc, SortDesc, Grid3X3, List, MoreHorizontal
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

import { TestCase } from '@/lib/test-case-generator/types';
import { exportTestCase } from '@/lib/test-case-generator/utils';

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'promptName' | 'version'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('all');

  // Fetch test cases
  const fetchTestCases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-case-generator?limit=100');
      const data = await response.json();
      
      if (response.ok) {
        setTestCases(data.testCases || []);
      } else {
        setError(data.error || 'Failed to fetch test cases');
      }
    } catch (error) {
      console.error('Error fetching test cases:', error);
      setError('Error loading test cases');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    fetchTestCases();
  }, [fetchTestCases]);

  // Filter and sort test cases
  const filteredAndSortedTestCases = useMemo(() => {
    let filtered = testCases;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tc => 
        tc.promptName.toLowerCase().includes(query) ||
        tc.version.toLowerCase().includes(query) ||
        Object.keys(tc.variables).some(key => key.toLowerCase().includes(query)) ||
        Object.values(tc.variables).some(value => 
          String(value).toLowerCase().includes(query)
        )
      );
    }
    
    // Prompt filter
    if (selectedPrompt !== 'all') {
      filtered = filtered.filter(tc => tc.promptId === selectedPrompt);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;
      
      switch (sortField) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'promptName':
          aValue = a.promptName;
          bValue = b.promptName;
          break;
        case 'version':
          aValue = a.version;
          bValue = b.version;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [testCases, searchQuery, selectedPrompt, sortField, sortDirection]);

  // Get unique prompts for filter
  const uniquePrompts = useMemo(() => {
    const prompts = Array.from(new Set(testCases.map(tc => tc.promptId)));
    return prompts.map(promptId => {
      const testCase = testCases.find(tc => tc.promptId === promptId);
      return { id: promptId, name: testCase?.promptName || promptId };
    });
  }, [testCases]);

  // Handle delete test case
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test case?')) return;
    
    try {
      const response = await fetch(`/api/test-case-generator/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTestCases(prev => prev.filter(tc => tc._id !== id));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete test case');
      }
    } catch (error) {
      console.error('Error deleting test case:', error);
      setError('Error deleting test case');
    }
  };

  // Handle export
  const handleExport = (testCase: TestCase, format: 'json' | 'yaml' | 'csv') => {
    try {
      const exported = exportTestCase(testCase, format);
      const blob = new Blob([exported], { 
        type: format === 'json' ? 'application/json' : 
             format === 'yaml' ? 'text/yaml' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${testCase.promptName}-${testCase.version}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export test case');
    }
  };

  // Handle sort
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Render test case card for grid view
  const renderTestCaseCard = (testCase: TestCase) => (
    <Card key={testCase._id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {testCase.promptName}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                v{testCase.version}
              </Badge>
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {new Date(testCase.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport(testCase, 'yaml')}>
                <Download className="h-4 w-4 mr-2" />
                Export YAML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(testCase, 'json')}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(testCase._id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Variables</span>
            <Badge variant="outline" className="text-xs">
              {Object.keys(testCase.variables).length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {Object.entries(testCase.variables).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{key}</span>
                <span className="text-gray-900 truncate max-w-24 ml-2">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
            {Object.keys(testCase.variables).length > 3 && (
              <div className="text-xs text-gray-500">
                +{Object.keys(testCase.variables).length - 3} more
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/test-case-generator">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Generator
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <Library className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Test Case Library
                  </h1>
                  <p className="text-sm text-gray-600">
                    Manage and organize your test cases ({filteredAndSortedTestCases.length} of {testCases.length})
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/test-case-generator">
                <Button className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test Case
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters and Controls */}
        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search test cases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                
                {/* Prompt Filter */}
                <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder="All Prompts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prompts</SelectItem>
                    {uniquePrompts.map(prompt => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Sort */}
                <Select value={`${sortField}-${sortDirection}`} onValueChange={(value) => {
                  const [field, direction] = value.split('-') as [typeof sortField, typeof sortDirection];
                  setSortField(field);
                  setSortDirection(direction);
                }}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="promptName-asc">Prompt A-Z</SelectItem>
                    <SelectItem value="promptName-desc">Prompt Z-A</SelectItem>
                    <SelectItem value="version-desc">Version High-Low</SelectItem>
                    <SelectItem value="version-asc">Version Low-High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTestCases()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <div className="flex border border-gray-200 rounded-lg bg-white">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-r-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-l-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedTestCases.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="py-16 text-center">
              <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {testCases.length === 0 ? 'No Test Cases Found' : 'No Matching Test Cases'}
              </h3>
              <p className="text-gray-600 mb-6">
                {testCases.length === 0 
                  ? 'Create your first test case to get started with AI prompt validation.'
                  : 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                }
              </p>
              {testCases.length === 0 && (
                <Link href="/test-case-generator">
                  <Button className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Test Case
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedTestCases.map(renderTestCaseCard)}
          </div>
        ) : (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-gray-200">
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSort('promptName')}
                    >
                      <div className="flex items-center gap-2">
                        Prompt
                        {sortField === 'promptName' && (
                          sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSort('version')}
                    >
                      <div className="flex items-center gap-2">
                        Version
                        {sortField === 'version' && (
                          sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Test Parameters</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">
                        Created
                        {sortField === 'createdAt' && (
                          sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTestCases.map((testCase) => (
                    <TableRow key={testCase._id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{testCase.promptName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          v{testCase.version}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            {Object.keys(testCase.variables).length} vars
                          </Badge>
                          <div className="text-xs text-gray-600">
                            {Object.keys(testCase.variables).slice(0, 2).join(', ')}
                            {Object.keys(testCase.variables).length > 2 && '...'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {testCase.testParameters ? (
                            <Badge variant="outline" className="text-xs">
                              {testCase.testParameters.models?.length || 0} models
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-500">Legacy format</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {new Date(testCase.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Export</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleExport(testCase, 'yaml')}>
                                <Download className="h-4 w-4 mr-2" />
                                YAML
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(testCase, 'json')}>
                                <Download className="h-4 w-4 mr-2" />
                                JSON
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(testCase, 'csv')}>
                                <Download className="h-4 w-4 mr-2" />
                                CSV
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(testCase._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}