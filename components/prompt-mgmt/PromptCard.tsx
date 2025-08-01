'use client';

import React from 'react';
import Link from 'next/link';
import { 
  MoreHorizontal, 
  Play, 
  Copy, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  GitBranch,
  TestTube
} from 'lucide-react';
import { PromptMgmtPrompt } from '@/lib/prompt-mgmt/types';
import { 
  getPromptStatusColor, 
  getAgentTypeIcon, 
  formatTimestamp, 
  formatDuration 
} from '@/lib/prompt-mgmt/utils';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PromptCardProps {
  prompt: PromptMgmtPrompt;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onTest?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleProduction?: (id: string, isProduction: boolean) => void;
  showCheckbox?: boolean;
  compact?: boolean;
}

export function PromptCard({
  prompt,
  selected = false,
  onSelect,
  onTest,
  onDuplicate,
  onDelete,
  onToggleProduction,
  showCheckbox = true,
  compact = false
}: PromptCardProps) {
  const handleSelect = () => {
    onSelect?.(prompt._id.toString());
  };
  
  const handleTest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTest?.(prompt._id.toString());
  };
  
  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDuplicate?.(prompt._id.toString());
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(prompt._id.toString());
  };
  
  const handleToggleProduction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleProduction?.(prompt._id.toString(), !prompt.isProduction);
  };
  
  // Calculate test statistics
  const testSummary = prompt._testSummary;
  const passRate = testSummary?.total ? (testSummary.passed / testSummary.total) * 100 : 0;
  const hasRecentTests = testSummary?.lastRun && 
    new Date(testSummary.lastRun).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  return (
    <Card className={cn(
      'group relative transition-all duration-200 hover:shadow-md',
      selected && 'ring-2 ring-blue-500',
      compact && 'p-3'
    )}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {showCheckbox && (
              <Checkbox
                checked={selected}
                onCheckedChange={handleSelect}
                className="mt-1"
                aria-label={`Select ${prompt.name}`}
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg" aria-label={`Agent type: ${prompt.agentType}`}>
                  {getAgentTypeIcon(prompt.agentType)}
                </span>
                <Link 
                  href={`/prompt-mgmt/${prompt._id}`}
                  className="font-semibold text-lg hover:text-blue-600 transition-colors truncate"
                >
                  {prompt.name}
                </Link>
                {prompt.isProduction && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Production
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <span className="capitalize">{prompt.agentType}</span>
                <span>•</span>
                <span className="capitalize">{prompt.operation.replace('_', ' ')}</span>
                {prompt.diagramType.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{prompt.diagramType.join(', ')}</span>
                  </>
                )}
              </div>
              
              {!compact && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {prompt.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {prompt.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{prompt.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/prompt-mgmt/${prompt._id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/prompt-mgmt/${prompt._id}/edit`}>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTest}>
                <TestTube className="mr-2 h-4 w-4" />
                Run Tests
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleProduction}>
                {prompt.isProduction ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
                disabled={prompt.isProduction}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      {!compact && (
        <CardContent className="py-3">
          {/* Test Results Summary */}
          {testSummary && testSummary.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Test Results</span>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    'flex items-center space-x-1',
                    passRate >= 90 ? 'text-green-600' :
                    passRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {passRate >= 90 ? <CheckCircle className="h-3 w-3" /> :
                     passRate >= 70 ? <Clock className="h-3 w-3" /> : 
                     <XCircle className="h-3 w-3" />}
                    <span>{Math.round(passRate)}%</span>
                  </span>
                  <span className="text-gray-500">
                    ({testSummary.passed}/{testSummary.total})
                  </span>
                </div>
              </div>
              
              <Progress 
                value={passRate} 
                className="h-2"
                // Custom color based on pass rate would go here
              />
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {testSummary.avgScore !== undefined && (
                    `Avg Score: ${testSummary.avgScore.toFixed(1)}`
                  )}
                </span>
                {testSummary.lastRun && (
                  <span className={cn(
                    hasRecentTests && 'text-green-600'
                  )}>
                    Last run: {formatTimestamp(testSummary.lastRun)}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Version Info */}
          <div className="flex items-center justify-between text-sm text-gray-500 mt-3">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-3 w-3" />
              <span>v{prompt.primaryVersion}</span>
              <span>•</span>
              <span>{prompt.versions.length} version{prompt.versions.length !== 1 ? 's' : ''}</span>
            </div>
            
            {prompt._stats?.avgExecutionTime && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(prompt._stats.avgExecutionTime)}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}
      
      <CardFooter className={cn('pt-3 border-t', compact && 'pt-2')}>
        <div className="flex items-center justify-between w-full text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Updated {formatTimestamp(prompt.updatedAt)}</span>
            {prompt._stats?.totalTests && (
              <span>{prompt._stats.totalTests} test runs</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              className="h-7"
            >
              <Play className="h-3 w-3 mr-1" />
              Test
            </Button>
          </div>
        </div>
      </CardFooter>
      
      {/* Status indicator */}
      <div className={cn(
        'absolute top-2 right-2 w-2 h-2 rounded-full',
        getPromptStatusColor(prompt).replace('bg-', '').replace(' text-', ' bg-').split(' ')[0]
      )} />
    </Card>
  );
}