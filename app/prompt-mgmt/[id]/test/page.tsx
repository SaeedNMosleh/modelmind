'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  RefreshCw, 
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Upload
} from 'lucide-react';
import { TestExecutionResponse, TestResult, PromptMgmtPrompt } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TestCaseEditor } from '@/components/prompt-mgmt/TestCaseEditor';
import { TestResults } from '@/components/prompt-mgmt/TestResults';
import { formatDuration, formatTimestamp } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

export default function TestManagementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const promptId = params.id as string;
  const jobId = searchParams.get('jobId');
  
  const [prompt, setPrompt] = useState<PromptMgmtPrompt | null>(null);
  const [currentExecution, setCurrentExecution] = useState<TestExecutionResponse | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Fetch prompt and execution status
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch prompt details
        const promptResponse = await fetch(`/api/prompt-mgmt/${promptId}`);
        const promptData = await promptResponse.json();
        
        if (promptData.success) {
          setPrompt(promptData.data);
        }
        
        // If we have a jobId, fetch execution status
        if (jobId) {
          await pollExecutionStatus(jobId);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [promptId, jobId]);
  
  // Poll execution status if running
  const pollExecutionStatus = async (executionId: string) => {
    try {
      const response = await fetch(`/api/prompts/${promptId}/test/status/${executionId}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentExecution(data.data);
        
        if (data.data.status === 'completed') {
          setTestResults(data.data.results || []);
          setIsRunning(false);
        } else if (data.data.status === 'failed') {
          setError(data.data.error || 'Test execution failed');
          setIsRunning(false);
        } else if (data.data.status === 'running') {
          setIsRunning(true);
          // Continue polling
          setTimeout(() => pollExecutionStatus(executionId), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to poll execution status:', err);
    }
  };
  
  const handleRunTests = async () => {
    if (!prompt) return;
    
    try {
      setIsRunning(true);
      setError(null);
      
      const response = await fetch(`/api/prompt-mgmt/${promptId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: prompt.currentVersion
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCurrentExecution(result.data);
        await pollExecutionStatus(result.data.executionId);
      } else {
        throw new Error(result.error || 'Failed to start tests');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start tests');
      setIsRunning(false);
    }
  };
  
  const handleStopTests = async () => {
    if (!currentExecution) return;
    
    try {
      await fetch(`/api/prompts/${promptId}/test/status/${currentExecution.executionId}`, {
        method: 'DELETE'
      });
      setIsRunning(false);
      setCurrentExecution(null);
    } catch (err) {
      console.error('Failed to stop tests:', err);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  const passedTests = testResults.filter(r => r.status === 'passed').length;
  const failedTests = testResults.filter(r => r.status === 'failed' || r.status === 'error').length;
  const passRate = testResults.length ? (passedTests / testResults.length) * 100 : 0;
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/prompt-mgmt/${promptId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Prompt
            </Link>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">Test Management</h1>
            <p className="text-gray-600">
              {prompt?.name || 'Loading...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Tests
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
          {isRunning ? (
            <Button 
              variant="destructive" 
              onClick={handleStopTests}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Tests
            </Button>
          ) : (
            <Button onClick={handleRunTests}>
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
          )}
        </div>
      </div>
      
      {/* Current Execution Status */}
      {currentExecution && (
        <Card className={cn('border-2', getStatusColor(currentExecution.status))}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(currentExecution.status)}
                <span>Current Execution</span>
                <Badge variant="outline" className="capitalize">
                  {currentExecution.status}
                </Badge>
              </CardTitle>
              
              {currentExecution.progress !== undefined && (
                <div className="text-sm text-gray-600">
                  {Math.round(currentExecution.progress)}% Complete
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {currentExecution.progress !== undefined && (
                <Progress value={currentExecution.progress} className="w-full" />
              )}
              
              {currentExecution.error && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{currentExecution.error}</AlertDescription>
                </Alert>
              )}
              
              {currentExecution.results && currentExecution.results.length > 0 && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                    <div className="text-sm text-gray-500">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{testResults.length}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error Display */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Main Content */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="cases">Test Cases</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="results" className="space-y-4">
          {testResults.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Latest Test Results</CardTitle>
                <CardDescription>
                  Results from the most recent test execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Case</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{result.testCaseName}</div>
                            <div className="text-sm text-gray-500">
                              {result.testCaseId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(result.status)}
                            <Badge
                              variant={
                                result.status === 'passed' ? 'default' :
                                result.status === 'failed' ? 'destructive' : 'secondary'
                              }
                              className="capitalize"
                            >
                              {result.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-medium",
                            result.score >= 0.9 ? 'text-green-600' :
                            result.score >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                          )}>
                            {result.score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatDuration(result.executionTime)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No Test Results</p>
                <p className="text-gray-600 mb-4">
                  Run tests to see results here
                </p>
                <Button onClick={handleRunTests} disabled={isRunning}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Tests
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="cases" className="space-y-4">
          <TestCaseEditor
            promptId={promptId}
            onTestCasesChange={() => {
              // Refresh test cases if needed
            }}
          />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <TestResults
            promptId={promptId}
            testSummary={prompt?._testSummary}
            onRunTests={handleRunTests}
            showHistory={true}
          />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>
                Configure test execution settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Test Settings</p>
                <p className="text-sm">
                  Test configuration options will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}