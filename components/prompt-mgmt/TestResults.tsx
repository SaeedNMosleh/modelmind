'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  BarChart3,
  Calendar,
  Zap,
  Target,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { TestSummary, TestResult } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatTimestamp, formatDuration } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

interface TestResultsProps {
  promptId: string;
  testSummary?: TestSummary;
  onRunTests?: () => void;
  showHistory?: boolean;
  className?: string;
}

export function TestResults({
  promptId,
  testSummary,
  onRunTests,
  showHistory = true,
  className
}: TestResultsProps) {
  const [recentResults, setRecentResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch recent test results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-results/prompt/${promptId}?limit=10`);
        const data = await response.json();
        
        if (data.success) {
          setRecentResults(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching test results:', err);
        setError('Failed to load test results');
      } finally {
        setLoading(false);
      }
    };
    
    if (promptId && showHistory) {
      fetchResults();
    }
  }, [promptId, showHistory]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const passRate = testSummary?.total ? (testSummary.passed / testSummary.total) * 100 : 0;
  
  if (!testSummary && recentResults.length === 0 && !loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Tests Run Yet</p>
            <p className="text-sm mb-4">
              Run tests to see performance metrics and results.
            </p>
            {onRunTests && (
              <Button onClick={onRunTests}>
                <Play className="h-4 w-4 mr-2" />
                Run First Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      {testSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{testSummary.total}</div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                <Calendar className="h-3 w-3" />
                {testSummary.lastRun && (
                  <span>Last: {formatTimestamp(testSummary.lastRun)}</span>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pass Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                passRate >= 90 ? 'text-green-600' :
                passRate >= 70 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {Math.round(passRate)}%
              </div>
              <div className="mt-2">
                <Progress value={passRate} className="h-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Passed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {testSummary.passed}
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Successful tests</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                testSummary.avgScore ? getScoreColor(testSummary.avgScore) : 'text-gray-400'
              )}>
                {testSummary.avgScore ? testSummary.avgScore.toFixed(2) : 'N/A'}
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                <BarChart3 className="h-3 w-3" />
                <span>Quality metric</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Test Results</h3>
          <p className="text-sm text-gray-600">
            Recent test executions and their outcomes
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            disabled={loading}
            title="Refresh results"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          
          {onRunTests && (
            <Button onClick={onRunTests}>
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
          )}
          
          <Button variant="outline" asChild>
            <Link href={`/prompt-mgmt/${promptId}/test`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Management
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Results Content */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Results</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="failures">Failures</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-4">
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading test results...</p>
                </div>
              </CardContent>
            </Card>
          ) : recentResults.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>No recent test results found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Execution History</CardTitle>
                <CardDescription>
                  Most recent test results for this prompt
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
                      <TableHead>Executed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{result.testCaseName}</div>
                            <div className="text-sm text-gray-500">
                              ID: {result.testCaseId}
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
                            getScoreColor(result.score)
                          )}>
                            {result.score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Zap className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">
                              {formatDuration(result.executionTime)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {/* Safely handle the timestamp data */}
                            {result.metadata?.executedAt && typeof result.metadata.executedAt === 'string' ? 
                              formatTimestamp(result.metadata.executedAt) : 
                              'Recently'
                            }
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance Analytics</span>
              </CardTitle>
              <CardDescription>
                Detailed insights into test performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Analytics Coming Soon</p>
                <p className="text-sm">
                  Performance trends and detailed analytics will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="failures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Failed Tests</span>
              </CardTitle>
              <CardDescription>
                Analyze and debug failed test cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const failedResults = recentResults.filter(r => r.status === 'failed' || r.status === 'error');
                
                if (failedResults.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                      <p className="text-lg font-medium mb-2">No Failed Tests</p>
                      <p className="text-sm">
                        All recent tests have passed successfully.
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-4">
                    {failedResults.map((result, index) => (
                      <Card key={index} className="border-red-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base text-red-700">
                              {result.testCaseName}
                            </CardTitle>
                            <Badge variant="destructive">
                              {result.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium">Error:</span>
                              <p className="text-sm text-red-600 mt-1">
                                {result.error || 'Test failed without specific error message'}
                              </p>
                            </div>
                            
                            {result.assertions && result.assertions.length > 0 && (
                              <div>
                                <span className="text-sm font-medium">Failed Assertions:</span>
                                <div className="mt-1 space-y-1">
                                  {result.assertions
                                    .filter(a => !a.passed)
                                    .map((assertion, i) => (
                                      <div key={i} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                        <div className="font-medium">{assertion.type}</div>
                                        <div className="text-xs mt-1">
                                          Expected: {JSON.stringify(assertion.expected)}
                                        </div>
                                        <div className="text-xs">
                                          Actual: {JSON.stringify(assertion.actual)}
                                        </div>
                                        {assertion.message && (
                                          <div className="text-xs mt-1 font-medium">
                                            {assertion.message}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Score: {result.score.toFixed(2)}</span>
                              <span>Duration: {formatDuration(result.executionTime)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}