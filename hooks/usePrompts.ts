'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PromptMgmtPrompt, 
  PromptFilters, 
  PromptSortOptions,
  BulkOperation,
  BulkOperationResult,
  ApiResponse,
  PaginatedResponse
} from '@/lib/prompt-mgmt/types';

interface UsePromptsOptions {
  initialFilters?: PromptFilters;
  initialSort?: PromptSortOptions;
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UsePromptsReturn {
  prompts: PromptMgmtPrompt[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  filters: PromptFilters;
  sort: PromptSortOptions;
  selectedPrompts: string[];
  
  // Actions
  setFilters: (filters: PromptFilters) => void;
  setSort: (sort: PromptSortOptions) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  selectPrompt: (id: string) => void;
  deselectPrompt: (id: string) => void;
  selectAllPrompts: () => void;
  deselectAllPrompts: () => void;
  togglePromptSelection: (id: string) => void;
  
  // CRUD operations
  createPrompt: (promptData: any) => Promise<PromptMgmtPrompt>;
  updatePrompt: (id: string, updates: any) => Promise<PromptMgmtPrompt>;
  deletePrompt: (id: string) => Promise<void>;
  duplicatePrompt: (id: string, nameSuffix?: string) => Promise<PromptMgmtPrompt>;
  
  // Bulk operations
  executeBulkOperation: (operation: BulkOperation) => Promise<BulkOperationResult>;
}

export function usePrompts(options: UsePromptsOptions = {}): UsePromptsReturn {
  const {
    initialFilters = {},
    initialSort = { field: 'updatedAt', direction: 'desc' },
    pageSize = 20,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;
  
  // State
  const [prompts, setPrompts] = useState<PromptMgmtPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<PromptFilters>(initialFilters);
  const [sort, setSort] = useState<PromptSortOptions>(initialSort);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  
  // Use refs to avoid stale closures in useCallback
  const filtersRef = useRef(filters);
  const sortRef = useRef(sort);
  
  // Update refs when values change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    sortRef.current = sort;
  }, [sort]);
  
  // Fetch prompts - simplified to avoid circular dependencies
  const fetchPrompts = useCallback(async (
    page?: number, 
    resetPrompts = true
  ) => {
    const currentFilters = filtersRef.current;
    const currentSort = sortRef.current;
    const targetPage = page ?? currentPage;
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams({
        page: targetPage.toString(),
        limit: pageSize.toString(),
        sortField: currentSort.field,
        sortDirection: currentSort.direction
      });
      
      // Add filters to search params
      if (currentFilters.agentType?.length) {
        searchParams.set('agentType', currentFilters.agentType.join(','));
      }
      if (currentFilters.diagramType?.length) {
        searchParams.set('diagramType', currentFilters.diagramType.join(','));
      }
      if (currentFilters.operation?.length) {
        searchParams.set('operation', currentFilters.operation.join(','));
      }
      if (currentFilters.environment?.length) {
        searchParams.set('environment', currentFilters.environment.join(','));
      }
      if (currentFilters.isProduction !== undefined) {
        searchParams.set('isProduction', currentFilters.isProduction.toString());
      }
      if (currentFilters.tags?.length) {
        searchParams.set('tags', currentFilters.tags.join(','));
      }
      if (currentFilters.search) {
        searchParams.set('search', currentFilters.search);
      }
      
      const response = await fetch(`/api/prompt-mgmt?${searchParams.toString()}`);
      const data: PaginatedResponse<PromptMgmtPrompt> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch prompts');
      }
      
      if (resetPrompts) {
        setPrompts(data.data || []);
      } else {
        setPrompts(prev => [...prev, ...(data.data || [])]);
      }
      
      setTotal(data.meta.total);
      setCurrentPage(data.meta.page);
      setTotalPages(data.meta.totalPages);
      setHasMore(data.meta.hasMore);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching prompts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]); // Stable dependencies only
  
  // Initial load and dependency updates
  useEffect(() => {
    fetchPrompts(1, true);
  }, [filters, sort, fetchPrompts]);
  
  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchPrompts(currentPage, true);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, currentPage, fetchPrompts]);
  
  // Actions
  const refresh = useCallback(() => fetchPrompts(currentPage, true), [fetchPrompts, currentPage]);
  
  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchPrompts(page, true);
  }, [fetchPrompts]);
  
  const selectPrompt = useCallback((id: string) => {
    setSelectedPrompts(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);
  
  const deselectPrompt = useCallback((id: string) => {
    setSelectedPrompts(prev => prev.filter(pid => pid !== id));
  }, []);
  
  const selectAllPrompts = useCallback(() => {
    setSelectedPrompts(prompts.map(p => p._id.toString()));
  }, [prompts]);
  
  const deselectAllPrompts = useCallback(() => {
    setSelectedPrompts([]);
  }, []);
  
  const togglePromptSelection = useCallback((id: string) => {
    setSelectedPrompts(prev => 
      prev.includes(id) 
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  }, []);
  
  // CRUD operations
  const createPrompt = useCallback(async (promptData: any): Promise<PromptMgmtPrompt> => {
    const response = await fetch('/api/prompt-mgmt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptData)
    });
    
    const data: ApiResponse<PromptMgmtPrompt> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create prompt');
    }
    
    // Refresh the list
    await refresh();
    
    return data.data!;
  }, [refresh]);
  
  const updatePrompt = useCallback(async (id: string, updates: any): Promise<PromptMgmtPrompt> => {
    const response = await fetch(`/api/prompt-mgmt/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    const data: ApiResponse<PromptMgmtPrompt> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update prompt');
    }
    
    // Update local state
    setPrompts(prev => prev.map(p => p._id.toString() === id ? data.data! : p));
    
    return data.data!;
  }, []);
  
  const deletePrompt = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/prompt-mgmt/${id}`, {
      method: 'DELETE'
    });
    
    const data: ApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete prompt');
    }
    
    // Remove from local state
    setPrompts(prev => prev.filter(p => p._id.toString() !== id));
    setSelectedPrompts(prev => prev.filter(pid => pid !== id));
    
    // Update totals
    setTotal(prev => prev - 1);
  }, []);
  
  const duplicatePrompt = useCallback(async (id: string, nameSuffix = ' (Copy)'): Promise<PromptMgmtPrompt> => {
    const result = await executeBulkOperation({
      type: 'duplicate',
      promptIds: [id],
      options: { nameSuffix }
    });
    
    if (result.failed > 0) {
      const failedResult = result.results.find(r => r.promptId === id);
      throw new Error(failedResult?.error || 'Failed to duplicate prompt');
    }
    
    // Refresh to get the new prompt
    await refresh();
    
    // Return the newly created prompt (we'll need to find it by name)
    const originalPrompt = prompts.find(p => p._id.toString() === id);
    const duplicatedPrompt = prompts.find(p => p.name === `${originalPrompt?.name}${nameSuffix}`);
    
    return duplicatedPrompt!;
  }, [prompts, refresh]);
  
  const executeBulkOperation = useCallback(async (operation: BulkOperation): Promise<BulkOperationResult> => {
    const response = await fetch('/api/prompt-mgmt/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation)
    });
    
    const data: ApiResponse<BulkOperationResult> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to execute bulk operation');
    }
    
    // Refresh the list after bulk operations
    if (['activate', 'deactivate', 'delete'].includes(operation.type)) {
      await refresh();
    }
    
    return data.data!;
  }, [refresh]);
  
  return {
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
    
    createPrompt,
    updatePrompt,
    deletePrompt,
    duplicatePrompt,
    executeBulkOperation
  };
}