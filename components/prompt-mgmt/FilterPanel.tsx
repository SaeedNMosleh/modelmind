'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  Tag,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PromptFilters, PromptSortOptions } from '@/lib/prompt-mgmt/types';
import { AgentType, DiagramType, PromptOperation, PromptEnvironment } from '@/lib/database/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: PromptFilters;
  sort: PromptSortOptions;
  onFiltersChange: (filters: PromptFilters) => void;
  onSortChange: (sort: PromptSortOptions) => void;
  onClearFilters: () => void;
  className?: string;
  compact?: boolean;
}

export function FilterPanel({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onClearFilters,
  className,
  compact = false
}: FilterPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filters.dateRange ? {
      from: filters.dateRange.from,
      to: filters.dateRange.to
    } : undefined
  );
  
  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  }).length;
  
  const updateFilters = (updates: Partial<PromptFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };
  
  const handleSearchChange = (value: string) => {
    updateFilters({ search: value || undefined });
  };
  
  const handleAgentTypeToggle = (agentType: AgentType, checked: boolean) => {
    const current = filters.agentType || [];
    const updated = checked
      ? [...current, agentType]
      : current.filter(t => t !== agentType);
    updateFilters({ agentType: updated.length > 0 ? updated : undefined });
  };
  
  const handleDiagramTypeToggle = (diagramType: DiagramType, checked: boolean) => {
    const current = filters.diagramType || [];
    const updated = checked
      ? [...current, diagramType]
      : current.filter(t => t !== diagramType);
    updateFilters({ diagramType: updated.length > 0 ? updated : undefined });
  };
  
  const handleOperationToggle = (operation: PromptOperation, checked: boolean) => {
    const current = filters.operation || [];
    const updated = checked
      ? [...current, operation]
      : current.filter(o => o !== operation);
    updateFilters({ operation: updated.length > 0 ? updated : undefined });
  };
  
  const handleEnvironmentToggle = (environment: PromptEnvironment, checked: boolean) => {
    const current = filters.environment || [];
    const updated = checked
      ? [...current, environment]
      : current.filter(e => e !== environment);
    updateFilters({ environment: updated.length > 0 ? updated : undefined });
  };
  
  const handleProductionStatusChange = (value: string) => {
    const isProduction = value === 'production' ? true : value === 'development' ? false : undefined;
    updateFilters({ isProduction });
  };
  
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    updateFilters({ 
      dateRange: range?.from && range?.to ? {
        from: range.from,
        to: range.to
      } : undefined 
    });
  };
  
  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    updateFilters({ tags: tags.length > 0 ? tags : undefined });
  };
  
  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search prompts..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClearFilters}>
                    Clear all
                  </Button>
                )}
              </div>
              
              {/* Compact filter content */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Agent Type</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.values(AgentType).map(type => (
                      <Badge
                        key={type}
                        variant={filters.agentType?.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleAgentTypeToggle(type, !filters.agentType?.includes(type))}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select 
                    value={
                      filters.isProduction === true ? 'production' : 
                      filters.isProduction === false ? 'development' : 'all'
                    }
                    onValueChange={handleProductionStatusChange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Select
          value={`${sort.field}-${sort.direction}`}
          onValueChange={(value) => {
            const [field, direction] = value.split('-') as [string, 'asc' | 'desc'];
            onSortChange({ field: field as any, direction });
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt-desc">Latest</SelectItem>
            <SelectItem value="updatedAt-asc">Oldest</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="testScore-desc">Best Tests</SelectItem>
            <SelectItem value="usage-desc">Most Used</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-6 p-6 bg-white border rounded-lg', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters & Search</h3>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear all ({activeFiltersCount})
          </Button>
        )}
      </div>
      
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            id="search"
            placeholder="Search prompts by name, content, or tags..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      <Separator />
      
      {/* Quick Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <Select 
            value={
              filters.isProduction === true ? 'production' : 
              filters.isProduction === false ? 'development' : 'all'
            }
            onValueChange={handleProductionStatusChange}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prompts</SelectItem>
              <SelectItem value="production">Production Only</SelectItem>
              <SelectItem value="development">Development Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Sort By</Label>
          <Select
            value={`${sort.field}-${sort.direction}`}
            onValueChange={(value) => {
              const [field, direction] = value.split('-') as [string, 'asc' | 'desc'];
              onSortChange({ field: field as any, direction });
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
              <SelectItem value="updatedAt-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="testScore-desc">Best Test Results</SelectItem>
              <SelectItem value="usage-desc">Most Used</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Filters
            </span>
            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 mt-4">
          {/* Agent Types */}
          <div>
            <Label className="text-sm font-medium">Agent Types</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.values(AgentType).map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`agent-${type}`}
                    checked={filters.agentType?.includes(type) || false}
                    onCheckedChange={(checked) => 
                      handleAgentTypeToggle(type, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`agent-${type}`} 
                    className="text-sm capitalize cursor-pointer"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Diagram Types */}
          <div>
            <Label className="text-sm font-medium">Diagram Types</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.values(DiagramType).map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`diagram-${type}`}
                    checked={filters.diagramType?.includes(type) || false}
                    onCheckedChange={(checked) => 
                      handleDiagramTypeToggle(type, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`diagram-${type}`} 
                    className="text-sm capitalize cursor-pointer"
                  >
                    {type.replace('-', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Operations */}
          <div>
            <Label className="text-sm font-medium">Operations</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.values(PromptOperation).map(operation => (
                <div key={operation} className="flex items-center space-x-2">
                  <Checkbox
                    id={`operation-${operation}`}
                    checked={filters.operation?.includes(operation) || false}
                    onCheckedChange={(checked) => 
                      handleOperationToggle(operation, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`operation-${operation}`} 
                    className="text-sm capitalize cursor-pointer"
                  >
                    {operation.replace('_', ' ').replace('-', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Environments */}
          <div>
            <Label className="text-sm font-medium">Environments</Label>
            <div className="flex gap-4 mt-2">
              {Object.values(PromptEnvironment).map(env => (
                <div key={env} className="flex items-center space-x-2">
                  <Checkbox
                    id={`env-${env}`}
                    checked={filters.environment?.includes(env) || false}
                    onCheckedChange={(checked) => 
                      handleEnvironmentToggle(env, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`env-${env}`} 
                    className="text-sm capitalize cursor-pointer"
                  >
                    {env}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tags */}
          <div>
            <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Tag className="h-4 w-4 text-gray-400" />
              <Input
                id="tags"
                placeholder="Enter tags separated by commas"
                value={filters.tags?.join(', ') || ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          
          {/* Date Range */}
          <div>
            <Label className="text-sm font-medium">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start mt-1">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                      </>
                    ) : (
                      dateRange.from.toLocaleDateString()
                    )
                  ) : (
                    'Select date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <>
          <Separator />
          <div>
            <Label className="text-sm font-medium">Active Filters</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{filters.search}"
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilters({ search: undefined })}
                  />
                </Badge>
              )}
              {filters.agentType?.map(type => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  Agent: {type}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleAgentTypeToggle(type, false)}
                  />
                </Badge>
              ))}
              {filters.diagramType?.map(type => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  Diagram: {type}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleDiagramTypeToggle(type, false)}
                  />
                </Badge>
              ))}
              {filters.isProduction !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.isProduction ? 'Production' : 'Development'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilters({ isProduction: undefined })}
                  />
                </Badge>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}