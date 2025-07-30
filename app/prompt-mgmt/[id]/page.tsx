'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Play, 
  Copy, 
  Share, 
  GitBranch, 
  TestTube,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { PromptMgmtPrompt } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PromptPreview } from '@/components/prompt-mgmt/PromptPreview';
import { VersionHistory } from '@/components/prompt-mgmt/VersionHistory';
import { TestResults } from '@/components/prompt-mgmt/TestResults';
import { PromptAnalytics } from '@/components/prompt-mgmt/PromptAnalytics';
import { getAgentTypeIcon, formatTimestamp } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;
  
  const [prompt, setPrompt] = useState<PromptMgmtPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('template');
  
  // Fetch prompt details
  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/prompt-mgmt/${promptId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch prompt');
        }
        
        setPrompt(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    if (promptId) {
      fetchPrompt();
    }
  }, [promptId]);
  
  const handleTest = async () => {
    try {
      const response = await fetch(`/api/prompt-mgmt/${promptId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        // Navigate to test results
        router.push(`/prompt-mgmt/${promptId}/test?jobId=${result.data.executionId}`);
      }
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };
  
  const handleDuplicate = async () => {
    try {
      const response = await fetch('/api/prompt-mgmt/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'duplicate',
          promptIds: [promptId],
          options: { nameSuffix: ' (Copy)' }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        router.push('/prompt-mgmt');
      }
    } catch (error) {
      console.error('Failed to duplicate prompt:', error);
    }
  };
  
  const handleToggleProduction = async () => {
    if (!prompt) return;
    
    try {
      const response = await fetch(`/api/prompt-mgmt/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isProduction: !prompt.isProduction })
      });
      
      if (response.ok) {
        setPrompt(prev => prev ? { ...prev, isProduction: !prev.isProduction } : null);
      }
    } catch (error) {
      console.error('Failed to toggle production status:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          
          <div className="col-span-12 lg:col-span-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !prompt) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/prompt-mgmt">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Prompts
            </Link>
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Prompt not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const currentVersion = prompt.versions.find(v => v.version === prompt.currentVersion);
  const testSummary = prompt._testSummary;
  const passRate = testSummary?.total ? (testSummary.passed / testSummary.total) * 100 : 0;
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/prompt-mgmt">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Prompts
            </Link>
          </Button>
          
          <div className="flex items-center space-x-3">
            <span className="text-2xl" aria-label={`Agent type: ${prompt.agentType}`}>
              {getAgentTypeIcon(prompt.agentType)}
            </span>
            <div>
              <h1 className="text-2xl font-bold">{prompt.name}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="capitalize">{prompt.agentType}</span>
                <span>•</span>
                <span className="capitalize">{prompt.operation.replace('_', ' ')}</span>
                <span>•</span>
                <span>v{prompt.currentVersion}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleTest}>
            <TestTube className="h-4 w-4 mr-2" />
            Run Tests
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/prompt-mgmt/${promptId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Status Bar */}
      <Card className={cn(
        'border-l-4',
        prompt.isProduction 
          ? passRate >= 90 
            ? 'border-l-green-500 bg-green-50' 
            : 'border-l-yellow-500 bg-yellow-50'
          : 'border-l-gray-500 bg-gray-50'
      )}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={prompt.isProduction ? "default" : "secondary"}
                  className={prompt.isProduction ? "bg-green-100 text-green-800" : ""}
                >
                  {prompt.isProduction ? 'Production' : 'Development'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleProduction}
                  className="h-6 px-2 text-xs"
                >
                  {prompt.isProduction ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
              
              {testSummary && testSummary.total > 0 && (
                <div className="flex items-center space-x-2">
                  {passRate >= 90 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : passRate >= 70 ? (
                    <Clock className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {Math.round(passRate)}% Pass Rate
                  </span>
                  <span className="text-sm text-gray-500">
                    ({testSummary.passed}/{testSummary.total} tests)
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Updated {formatTimestamp(prompt.updatedAt)}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {prompt.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Main Content */}
        <div className="col-span-12 lg:col-span-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="template" className="space-y-4">
              <PromptPreview
                prompt={prompt}
                version={currentVersion}
                showMetadata
                showVariables
                allowTesting
              />
            </TabsContent>
            
            <TabsContent value="versions" className="space-y-4">
              <VersionHistory
                promptId={promptId}
                versions={prompt.versions}
                currentVersion={prompt.currentVersion}
                onVersionSelect={() => {
                  // Handle version selection
                }}
              />
            </TabsContent>
            
            <TabsContent value="tests" className="space-y-4">
              <TestResults
                promptId={promptId}
                testSummary={testSummary}
                onRunTests={handleTest}
              />
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <PromptAnalytics
                promptId={promptId}
                stats={prompt._stats}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Metadata */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Agent Type</label>
                <div className="flex items-center space-x-2 mt-1">
                  <span>{getAgentTypeIcon(prompt.agentType)}</span>
                  <span className="capitalize">{prompt.agentType}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Operation</label>
                <p className="mt-1 capitalize">{prompt.operation.replace('_', ' ')}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Diagram Types</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {prompt.diagramType.map(type => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Environments</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {prompt.environments.map(env => (
                    <Badge key={env} variant="outline" className="text-xs">
                      {env}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{formatTimestamp(prompt.createdAt)}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Modified</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{formatTimestamp(prompt.updatedAt)}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Version</label>
                <div className="flex items-center space-x-2 mt-1">
                  <GitBranch className="h-4 w-4" />
                  <span className="text-sm">v{prompt.currentVersion}</span>
                  <Badge variant="outline" className="text-xs">
                    {prompt.versions.length} version{prompt.versions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Test Summary */}
          {testSummary && testSummary.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Summary</CardTitle>
                <CardDescription>
                  Latest test results overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pass Rate</span>
                    <span className="font-medium">{Math.round(passRate)}%</span>
                  </div>
                  <Progress value={passRate} className="h-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-600">{testSummary.passed}</div>
                    <div className="text-xs text-gray-500">Passed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{testSummary.failed}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{testSummary.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
                
                {testSummary.avgScore !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Average Score</label>
                    <p className="text-lg font-bold mt-1">{testSummary.avgScore.toFixed(1)}</p>
                  </div>
                )}
                
                {testSummary.lastRun && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Run</label>
                    <p className="text-sm mt-1">{formatTimestamp(testSummary.lastRun)}</p>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleTest}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Tests Again
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/prompt-mgmt/${promptId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Prompt
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/prompt-mgmt/${promptId}/versions`}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  View Versions
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/prompt-mgmt/${promptId}/test`}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Management
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleDuplicate}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Prompt
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}