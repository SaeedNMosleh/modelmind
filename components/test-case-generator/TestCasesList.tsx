'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Eye, Edit, Copy, Trash2, Download, 
  Loader2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { TestCase } from '@/lib/test-case-generator/types';

interface TestCasesListProps {
  testCases: TestCase[];
  loading: boolean;
  onLoad: (testCase: TestCase) => void;
  onDuplicate: (testCase: TestCase) => void;
  onDelete: (testCaseId: string) => Promise<void>;
  onRefresh: () => void;
}

export function TestCasesList({
  testCases,
  loading,
  onLoad,
  onDuplicate,
  onDelete,
  onRefresh
}: TestCasesListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const handleDelete = async (testCaseId: string) => {
    setDeletingId(testCaseId);
    try {
      await onDelete(testCaseId);
      setDeleteDialogOpen(null);
    } catch (error) {
      console.error('Error deleting test case:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (testCase: TestCase) => {
    const blob = new Blob([testCase.generatedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${testCase.promptName}-${testCase.version}-${testCase._id.slice(-6)}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border border-gray-200 shadow-lg bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-green-200 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            Saved Test Cases
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading test cases...
            </div>
          ) : testCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">No saved test cases yet</p>
              <p className="text-xs text-gray-400">Create and save your first test case</p>
            </div>
          ) : (
            testCases.map((testCase) => (
              <Card key={testCase._id} className="p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {testCase.promptName}
                      </h4>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        {testCase.version}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      Created {new Date(testCase.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLoad(testCase)}
                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Load test case"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(testCase)}
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Duplicate test case"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(testCase)}
                      className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      title="Download YAML"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(testCase._id)}
                      disabled={deletingId === testCase._id}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete test case"
                    >
                      {deletingId === testCase._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </CardContent>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen !== null} onOpenChange={() => setDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this test case? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDialogOpen && handleDelete(deleteDialogOpen)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}