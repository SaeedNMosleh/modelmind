'use client';

import React, { useState } from 'react';
import { 
  Play, 
  Copy, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Download,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { BulkOperation, BulkOperationResult } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface BulkActionsProps {
  selectedCount: number;
  onExecute: (operation: BulkOperation) => Promise<BulkOperationResult>;
  onClear: () => void;
  compact?: boolean;
  className?: string;
}

export function BulkActions({
  selectedCount,
  onExecute,
  onClear,
  compact = false,
  className
}: BulkActionsProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<BulkOperation | null>(null);
  const [lastResult, setLastResult] = useState<BulkOperationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const bulkOperations = [
    {
      type: 'test' as const,
      label: 'Run Tests',
      icon: Play,
      description: 'Execute test cases for selected prompts',
      variant: 'default' as const,
      confirmMessage: 'Run tests for all selected prompts?'
    },
    {
      type: 'activate' as const,
      label: 'Activate',
      icon: CheckCircle,
      description: 'Mark selected prompts as production-ready',
      variant: 'default' as const,
      confirmMessage: 'Activate selected prompts for production use?'
    },
    {
      type: 'deactivate' as const,
      label: 'Deactivate',
      icon: XCircle,
      description: 'Remove selected prompts from production',
      variant: 'outline' as const,
      confirmMessage: 'Deactivate selected prompts from production?'
    },
    {
      type: 'duplicate' as const,
      label: 'Duplicate',
      icon: Copy,
      description: 'Create copies of selected prompts',
      variant: 'outline' as const,
      confirmMessage: 'Create duplicates of selected prompts?'
    },
    {
      type: 'export' as const,
      label: 'Export',
      icon: Download,
      description: 'Export selected prompts to file',
      variant: 'outline' as const,
      confirmMessage: 'Export selected prompts?'
    },
    {
      type: 'delete' as const,
      label: 'Delete',
      icon: Trash2,
      description: 'Permanently delete selected prompts',
      variant: 'destructive' as const,
      confirmMessage: 'Permanently delete selected prompts? This action cannot be undone.'
    }
  ];
  
  const handleOperationClick = (operation: typeof bulkOperations[0]) => {
    const bulkOp: BulkOperation = {
      type: operation.type,
      promptIds: [], // Will be filled by the parent component
      options: operation.type === 'export' ? { format: 'json' } : {}
    };
    
    setPendingOperation(bulkOp);
    setShowConfirmDialog(true);
  };
  
  const handleConfirmOperation = async () => {
    if (!pendingOperation) return;
    
    setShowConfirmDialog(false);
    setIsExecuting(true);
    
    try {
      const result = await onExecute(pendingOperation);
      setLastResult(result);
      setShowResult(true);
      
      // Auto-hide result after 5 seconds if successful
      if (result.failed === 0) {
        setTimeout(() => setShowResult(false), 5000);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
      setLastResult({
        operationType: pendingOperation.type,
        totalRequested: selectedCount,
        successful: 0,
        failed: selectedCount,
        results: []
      });
      setShowResult(true);
    } finally {
      setIsExecuting(false);
      setPendingOperation(null);
    }
  };
  
  const pendingOperationData = pendingOperation 
    ? bulkOperations.find(op => op.type === pendingOperation.type)
    : null;
  
  if (compact) {
    return (
      <Card className={cn('border-blue-200 bg-blue-50', className)}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{selectedCount} selected</Badge>
              <Select onValueChange={(value) => {
                const operation = bulkOperations.find(op => op.type === value);
                if (operation) handleOperationClick(operation);
              }}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Actions" />
                </SelectTrigger>
                <SelectContent>
                  {bulkOperations.map((operation) => (
                    <SelectItem key={operation.type} value={operation.type}>
                      <div className="flex items-center space-x-2">
                        <operation.icon className="h-3 w-3" />
                        <span>{operation.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="ghost" 
              size="sm"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className={cn('border-blue-200 bg-blue-50', className)}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedCount} prompt{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              <span className="text-sm text-gray-600">
                Choose an action to apply to all selected prompts
              </span>
            </div>
            
            <Button
              variant="ghost" 
              size="sm"
              onClick={onClear}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Selection
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {bulkOperations.map((operation) => (
              <Button
                key={operation.type}
                variant={operation.variant}
                size="sm"
                onClick={() => handleOperationClick(operation)}
                disabled={isExecuting}
                className="flex items-center space-x-2 justify-start"
                title={operation.description}
              >
                {isExecuting && pendingOperation?.type === operation.type ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <operation.icon className="h-4 w-4" />
                )}
                <span>{operation.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {pendingOperationData?.icon && (
                <pendingOperationData.icon className="h-5 w-5" />
              )}
              <span>Confirm {pendingOperationData?.label}</span>
            </DialogTitle>
            <DialogDescription>
              {pendingOperationData?.confirmMessage}
              <br />
              <strong>{selectedCount} prompt{selectedCount !== 1 ? 's' : ''}</strong> will be affected.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant={pendingOperationData?.variant || 'default'}
              onClick={handleConfirmOperation}
            >
              {pendingOperationData?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Result Display */}
      {showResult && lastResult && (
        <Alert className={cn(
          'mt-4',
          lastResult.failed === 0 
            ? 'bg-green-50 border-green-200' 
            : lastResult.successful === 0 
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {lastResult.failed === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : lastResult.successful === 0 ? (
                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              )}
              
              <div className="flex-1">
                <AlertDescription>
                  <div className="font-medium mb-2">
                    {lastResult.failed === 0 
                      ? `Successfully completed ${lastResult.operationType} for all ${lastResult.successful} prompts`
                      : lastResult.successful === 0
                      ? `Failed to ${lastResult.operationType} any prompts`
                      : `Partially completed ${lastResult.operationType}: ${lastResult.successful} successful, ${lastResult.failed} failed`
                    }
                  </div>
                  
                  {lastResult.totalRequested > 0 && (
                    <div className="space-y-2">
                      <Progress 
                        value={(lastResult.successful / lastResult.totalRequested) * 100} 
                        className="h-2"
                      />
                      <div className="text-sm text-gray-600">
                        {lastResult.successful} of {lastResult.totalRequested} completed
                      </div>
                    </div>
                  )}
                  
                  {lastResult.failed > 0 && lastResult.results.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        View failed operations
                      </summary>
                      <div className="mt-2 space-y-1">
                        {lastResult.results
                          .filter(r => !r.success)
                          .map((result, index) => (
                            <div key={index} className="text-sm text-red-600">
                              Prompt {result.promptId}: {result.error?.message || result.error || 'Unknown error'}
                            </div>
                          ))
                        }
                      </div>
                    </details>
                  )}
                </AlertDescription>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResult(false)}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}
    </>
  );
}