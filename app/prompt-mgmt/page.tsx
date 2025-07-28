'use client';

import React, { useState } from 'react';
import { Plus, Download, Upload, Settings, Search } from 'lucide-react';
import { usePrompts } from '@/hooks/usePrompts';
import { PromptCard } from '@/components/prompt-mgmt/PromptCard';
import { FilterPanel } from '@/components/prompt-mgmt/FilterPanel';
import { BulkActions } from '@/components/prompt-mgmt/BulkActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function PromptManagementPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const {
    prompts,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    hasMore,
    filters,
    sort,
    selectedPrompts,
    setFilters,
    setSort,
    setPage,
    refresh,
    selectPrompt,
    deselectPrompt,
    selectAllPrompts,
    deselectAllPrompts,
    togglePromptSelection,
    deletePrompt,
    duplicatePrompt,
    executeBulkOperation
  } = usePrompts({
    pageSize: 20,
    autoRefresh: true,
    refreshInterval: 30000
  });

  // Check if mobile on mount
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTest = async (promptId: string) => {
    try {
      const response = await fetch(`/api/prompt-mgmt/${promptId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        // Navigate to test results or show success
        window.open(`/prompt-mgmt/${promptId}/test?jobId=${result.data.executionId}`, '_blank');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };

  const handleDuplicate = async (promptId: string) => {
    try {
      await duplicatePrompt(promptId);
      // Success feedback handled by the hook
    } catch (error) {
      console.error('Failed to duplicate prompt:', error);
    }
  };

  const handleDelete = async (promptId: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        await deletePrompt(promptId);
      } catch (error) {
        console.error('Failed to delete prompt:', error);
      }
    }
  };

  const handleToggleProduction = async (promptId: string, isProduction: boolean) => {
    try {
      const response = await fetch(`/api/prompt-mgmt/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isProduction })
      });
      
      if (!response.ok) throw new Error('Failed to update production status');
      await refresh();
    } catch (error) {
      console.error('Failed to toggle production status:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(currentPage + 1);
    }
  };

  const FilterContent = () => (
    <FilterPanel
      filters={filters}
      sort={sort}
      onFiltersChange={setFilters}
      onSortChange={setSort}
      onClearFilters={handleClearFilters}
      compact={isMobile}
      className={isMobile ? '' : 'sticky top-4'}
    />
  );

  const PromptGrid = () => (
    <div className={cn(
      'grid gap-4',
      viewMode === 'grid' 
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
        : 'grid-cols-1'
    )}>
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt._id.toString()}
          prompt={prompt}
          selected={selectedPrompts.includes(prompt._id.toString())}
          onSelect={togglePromptSelection}
          onTest={handleTest}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onToggleProduction={handleToggleProduction}
          compact={viewMode === 'list'}
        />
      ))}
    </div>
  );

  const LoadingSkeleton = () => (
    <div className={cn(
      'grid gap-4',
      viewMode === 'grid' 
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
        : 'grid-cols-1'
    )}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prompt Management</h1>
            <p className="text-gray-600">
              {total} prompt{total !== 1 ? 's' : ''} 
              {selectedPrompts.length > 0 && ` • ${selectedPrompts.length} selected`}
            </p>
          </div>
          <Link href="/prompt-mgmt/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Mobile Tabs */}
        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>
          
          <TabsContent value="prompts" className="space-y-4">
            {/* Quick search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search prompts..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>

            {/* Bulk actions */}
            {selectedPrompts.length > 0 && (
              <BulkActions
                selectedCount={selectedPrompts.length}
                onExecute={executeBulkOperation}
                onClear={deselectAllPrompts}
                compact
              />
            )}

            {/* Error state */}
            {error && (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Content */}
            {loading && prompts.length === 0 ? (
              <LoadingSkeleton />
            ) : (
              <>
                <PromptGrid />
                
                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleLoadMore}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
                
                {prompts.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No prompts found</p>
                    <Link href="/prompt-mgmt/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Prompt
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="filters">
            <FilterContent />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Desktop Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Prompt Management</h1>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-gray-600">
              {total} prompt{total !== 1 ? 's' : ''} total
            </p>
            {selectedPrompts.length > 0 && (
              <Badge variant="secondary">
                {selectedPrompts.length} selected
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Link href="/prompt-mgmt/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Prompt
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="col-span-12 lg:col-span-3">
            <FilterContent />
          </div>
        )}
        
        {/* Main Content */}
        <div className={cn(
          'col-span-12',
          showFilters ? 'lg:col-span-9' : 'lg:col-span-12'
        )}>
          {/* Bulk Actions */}
          {selectedPrompts.length > 0 && (
            <div className="mb-4">
              <BulkActions
                selectedCount={selectedPrompts.length}
                onExecute={executeBulkOperation}
                onClear={deselectAllPrompts}
              />
            </div>
          )}

          {/* View Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={loading}
                >
                  Previous
                </Button>
              )}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={loading}
                >
                  Next
                </Button>
              )}
            </div>
          </div>

          {/* Error state */}
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Content */}
          {loading && prompts.length === 0 ? (
            <LoadingSkeleton />
          ) : (
            <>
              <PromptGrid />
              
              {prompts.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No prompts found</p>
                  <Link href="/prompt-mgmt/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Prompt
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}