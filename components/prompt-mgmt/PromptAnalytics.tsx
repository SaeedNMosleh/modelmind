'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  Calendar,
  RefreshCw,
  Download
} from 'lucide-react';
import { PromptStats, PromptAnalytics as PromptAnalyticsType } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDuration } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

interface PromptAnalyticsProps {
  promptId: string;
  stats?: PromptStats;
  className?: string;
}

export function PromptAnalytics({
  promptId,
  stats,
  className
}: PromptAnalyticsProps) {
  const [analytics, setAnalytics] = useState<PromptAnalyticsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  
  // Fetch detailed analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/test-results/analytics/${promptId}?range=${timeRange}`);
        const data = await response.json();
        
        if (data.success) {
          setAnalytics(data.data);
        } else {
          setError(data.error || 'Failed to load analytics');
        }
      } catch (err) {
        setError('Failed to load analytics data');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (promptId) {
      fetchAnalytics();
    }
  }, [promptId, timeRange]);
  
  const getPerformanceColor = (value: number, type: 'score' | 'rate' | 'time') => {
    if (type === 'time') {
      // Lower is better for response time
      if (value < 1000) return 'text-green-600';
      if (value < 3000) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // Higher is better for score/rate
      if (value >= 0.9) return 'text-green-600';
      if (value >= 0.7) return 'text-yellow-600';
      return 'text-red-600';
    }
  };
  
  const MetricsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-1">
            <Target className="h-4 w-4" />
            <span>Total Tests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalTests || 0}</div>
          <div className="text-xs text-gray-500 mt-1">
            Avg {stats?.totalTests ? (stats.totalTests / 30).toFixed(1) : 0}/day
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span>Pass Rate</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            getPerformanceColor(stats?.passRate || 0, 'rate')
          )}>
            {stats?.passRate ? Math.round(stats.passRate * 100) : 0}%
          </div>
          <div className="mt-2">
            <Progress value={stats?.passRate ? stats.passRate * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-1">
            <Zap className="h-4 w-4" />
            <span>Avg Response</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            getPerformanceColor(stats?.avgExecutionTime || 0, 'time')
          )}>
            {stats?.avgExecutionTime ? formatDuration(stats.avgExecutionTime) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Execution time
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-1">
            <TrendingUp className="h-4 w-4" />
            <span>Popularity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.popularityScore || 0}</div>
          <div className="text-xs text-gray-500 mt-1">
            Usage ranking
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const UsageMetrics = () => {
    if (!analytics?.usage) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p>No usage data available</p>
          </CardContent>
        </Card>
      );
    }
    
    const { usage } = analytics;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.totalExecutions}</div>
              <div className="text-xs text-gray-500 mt-1">
                {usage.avgExecutionsPerDay.toFixed(1)} per day
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.uniqueUsers}</div>
              <div className="text-xs text-gray-500 mt-1">
                Active users
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Peak Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.peakUsageTime}</div>
              <div className="text-xs text-gray-500 mt-1">
                Busiest hour
              </div>
            </CardContent>
          </Card>
        </div>
        
        {usage.popularVariables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Popular Variables</CardTitle>
              <CardDescription>
                Most frequently used template variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usage.popularVariables.slice(0, 5).map((variable) => (
                  <div key={variable.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {variable.name}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${(variable.frequency / usage.popularVariables[0].frequency) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {variable.frequency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  
  const PerformanceMetrics = () => {
    if (!analytics?.performance) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Zap className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p>No performance data available</p>
          </CardContent>
        </Card>
      );
    }
    
    const { performance } = analytics;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                getPerformanceColor(performance.avgResponseTime, 'time')
              )}>
                {formatDuration(performance.avgResponseTime)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Average time
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">P95 Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                getPerformanceColor(performance.p95ResponseTime, 'time')
              )}>
                {formatDuration(performance.p95ResponseTime)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                95th percentile
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                performance.errorRate > 0.1 ? 'text-red-600' : 
                performance.errorRate > 0.05 ? 'text-yellow-600' : 'text-green-600'
              )}>
                {(performance.errorRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Failed executions
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performance.throughput.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Requests/second
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Distribution</CardTitle>
            <CardDescription>
              Response time percentiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Average</span>
                <span className="font-mono">{formatDuration(performance.avgResponseTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">P95</span>
                <span className="font-mono">{formatDuration(performance.p95ResponseTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">P99</span>
                <span className="font-mono">{formatDuration(performance.p99ResponseTime)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const QualityMetrics = () => {
    if (!analytics?.quality) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Target className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p>No quality data available</p>
          </CardContent>
        </Card>
      );
    }
    
    const { quality } = analytics;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                getPerformanceColor(quality.avgScore, 'score')
              )}>
                {quality.avgScore.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Quality metric
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                getPerformanceColor(quality.passRate, 'rate')
              )}>
                {Math.round(quality.passRate * 100)}%
              </div>
              <div className="mt-2">
                <Progress value={quality.passRate * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quality.userSatisfaction ? 
                  `${(quality.userSatisfaction * 100).toFixed(0)}%` : 
                  'N/A'
                }
              </div>
              <div className="text-xs text-gray-500 mt-1">
                User feedback
              </div>
            </CardContent>
          </Card>
        </div>
        
        {quality.commonFailures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Common Failures</CardTitle>
              <CardDescription>
                Most frequent failure reasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quality.commonFailures.slice(0, 5).map((failure, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{failure.reason}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full"
                          style={{ 
                            width: `${(failure.frequency / quality.commonFailures[0].frequency) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">
                        {failure.frequency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Analytics</span>
          </h3>
          <p className="text-sm text-gray-600">
            Performance metrics and usage insights
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
          {error}
        </div>
      )}
      
      {/* Overview Metrics */}
      <MetricsOverview />
      
      {/* Detailed Analytics */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="usage">
          <UsageMetrics />
        </TabsContent>
        
        <TabsContent value="performance">
          <PerformanceMetrics />
        </TabsContent>
        
        <TabsContent value="quality">
          <QualityMetrics />
        </TabsContent>
        
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Trends Over Time</span>
              </CardTitle>
              <CardDescription>
                Historical performance and usage trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Trend Analysis Coming Soon</p>
                <p className="text-sm">
                  Historical charts and trend analysis will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}