'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Clock, 
  User, 
  Eye, 
  GitCompare,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { PromptMgmtVersion } from '@/lib/prompt-mgmt/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatTimestamp } from '@/lib/prompt-mgmt/utils';
import { cn } from '@/lib/utils';

interface VersionHistoryProps {
  versions: PromptMgmtVersion[];
  primaryVersion: string;
  onVersionSelect?: (version: string) => void;
  onVersionCompare?: (v1: string, v2: string) => void;
  onSetPrimary?: (version: string) => void;
  onVersionEdit?: (version: string) => void;
  onVersionDelete?: (version: string) => Promise<void>;
  showActions?: boolean;
  className?: string;
  promptId?: string;
}

export function VersionHistory({
  versions,
  primaryVersion,
  onVersionSelect,
  onVersionCompare,
  onSetPrimary,
  onVersionEdit,
  onVersionDelete,
  showActions = true,
  className,
  promptId
}: VersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showVersionDetails, setShowVersionDetails] = useState<string | null>(null);
  const [deletingVersions, setDeletingVersions] = useState<Set<string>>(new Set());
  
  // Check for draft changes and which version it's based on
  const getDraftVersionInfo = () => {
    if (!promptId) return null;
    
    const draftData = localStorage.getItem(`prompt-draft-${promptId}`);
    if (!draftData) return null;
    
    try {
      const parsed = JSON.parse(draftData);
      return {
        originalVersion: parsed.originalVersion,
        hasDraft: true
      };
    } catch {
      return null;
    }
  };
  
  // Helper function to parse semantic version for sorting
  const parseVersion = (version: string) => {
    const isDraft = version.endsWith('-draft');
    const cleanVersion = isDraft ? version.replace('-draft', '') : version;
    const parts = cleanVersion.split('.').map(Number);
    return { parts, isDraft };
  };

  // Sort versions: primary first, then by version number (oldest to newest), drafts last
  const sortedVersions = [...versions].sort((a, b) => {
    // Primary version always comes first
    if (a.version === primaryVersion) return -1;
    if (b.version === primaryVersion) return 1;
    
    const aVersion = parseVersion(a.version);
    const bVersion = parseVersion(b.version);
    
    // Drafts go to the bottom
    if (aVersion.isDraft && !bVersion.isDraft) return 1;
    if (!aVersion.isDraft && bVersion.isDraft) return -1;
    
    // Compare version numbers (oldest to newest)
    for (let i = 0; i < Math.max(aVersion.parts.length, bVersion.parts.length); i++) {
      const aPart = aVersion.parts[i] || 0;
      const bPart = bVersion.parts[i] || 0;
      if (aPart !== bPart) return aPart - bPart;
    }
    
    // If versions are identical, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const toggleExpanded = (version: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(version)) {
      newExpanded.delete(version);
    } else {
      newExpanded.add(version);
    }
    setExpandedVersions(newExpanded);
  };
  
  const handleVersionSelect = (version: string) => {
    if (selectedVersions.includes(version)) {
      setSelectedVersions(prev => prev.filter(v => v !== version));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions(prev => [...prev, version]);
    } else {
      // Replace the older selection
      setSelectedVersions([selectedVersions[1], version]);
    }
    
    // Call the provided onVersionSelect callback if it exists
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };
  
  const handleCompare = () => {
    if (selectedVersions.length === 2 && onVersionCompare) {
      onVersionCompare(selectedVersions[0], selectedVersions[1]);
    }
  };

  const handleDeleteVersion = async (version: string) => {
    if (!onVersionDelete) return;
    
    setDeletingVersions(prev => new Set(prev).add(version));
    
    try {
      await onVersionDelete(version);
    } catch (error) {
      console.error('Failed to delete version:', error);
      // Remove from deleting state if failed
      setDeletingVersions(prev => {
        const newSet = new Set(prev);
        newSet.delete(version);
        return newSet;
      });
    }
  };
  
  
  const getVersionStatus = (version: PromptMgmtVersion) => {
    if (version.version === primaryVersion) {
      return { label: 'Primary', variant: 'default' as const, color: 'bg-green-100 text-green-800' };
    }
    
    if (version.version.endsWith('-draft')) {
      return { label: 'Draft', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' };
    }
    
    if (version._stats && version._stats.usageCount > 0) {
      return { label: 'Used', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' };
    }
    
    return { label: 'Secondary', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
  };
  
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatTimestamp(date);
  };
  
  if (versions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Version History</p>
            <p className="text-sm">
              Version history will appear here as you make changes to the prompt.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Version History</span>
          </h3>
          <p className="text-sm text-gray-600">
            {versions.length} version{versions.length !== 1 ? 's' : ''} • Primary: v{primaryVersion}
          </p>
        </div>
        
        {showActions && selectedVersions.length === 2 && (
          <Button variant="outline" size="sm" onClick={handleCompare}>
            <GitCompare className="h-4 w-4 mr-2" />
            Compare Selected
          </Button>
        )}
      </div>
      
      {/* Compare Instructions */}
      {showActions && selectedVersions.length < 2 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select two versions to compare their differences.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Version List */}
      <div className="space-y-3">
        {sortedVersions.map((version, index) => {
          const status = getVersionStatus(version);
          const isExpanded = expandedVersions.has(version.version);
          const isSelected = selectedVersions.includes(version.version);
          const canSetPrimary = version.version !== primaryVersion && showActions && onSetPrimary;
          const canDelete = showActions && onVersionDelete && versions.length > 1;
          const isPrimary = version.version === primaryVersion;
          const isDeleting = deletingVersions.has(version.version);
          const draftInfo = getDraftVersionInfo();
          const hasDraftForThisVersion = draftInfo && draftInfo.originalVersion === version.version;
          
          return (
            <Card 
              key={version.version}
              className={cn(
                'transition-all duration-200',
                isSelected && 'ring-2 ring-blue-500',
                version.version === primaryVersion && 'border-green-700 bg-green-600',
                isDeleting && 'opacity-50 pointer-events-none'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {showActions && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleVersionSelect(version.version)}
                        className="mt-1"
                      />
                    )}
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className={cn(
                          "font-semibold",
                          version.version === primaryVersion ? "text-gray-900" : "text-white-800"
                        )}>v{version.version}</h4>
                        <Badge 
                          variant={status.variant}
                          className={status.color}
                        >
                          {status.label}
                        </Badge>
                        {hasDraftForThisVersion && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            Draft Changes
                          </Badge>
                        )}
                      </div>
                      
                      <div className={cn(
                        "flex items-center space-x-4 text-sm",
                        version.version === primaryVersion ? "text-gray-700" : "text-gray-500"
                      )}>
                        <div className="flex items-center space-x-1">
                          <Clock className={cn(
                            "h-3 w-3",
                            version.version === primaryVersion ? "text-gray-700" : "text-gray-400"
                          )} />
                          <span>{getTimeAgo(version.createdAt)}</span>
                        </div>
                        
                        {version._stats && (
                          <>
                            <div className="flex items-center space-x-1">
                              <User className={cn(
                                "h-3 w-3",
                                version.version === primaryVersion ? "text-gray-700" : "text-gray-400"
                              )} />
                              <span>{version._stats.usageCount} uses</span>
                            </div>
                            
                            {version._stats.successRate !== undefined && (
                              <div className="flex items-center space-x-1">
                                <span className={cn(
                                  'text-xs font-medium',
                                  version._stats.successRate >= 0.9 ? 'text-green-600' :
                                  version._stats.successRate >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                                )}>
                                  {Math.round(version._stats.successRate * 100)}% success
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {version.changelog && (
                        <p className={cn(
                          "text-sm",
                          version.version === primaryVersion ? "text-gray-800" : "text-gray-700"
                        )}>{version.changelog}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {onVersionEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVersionEdit(version.version)}
                        title="Edit this version"
                        className={version.version === primaryVersion ? "text-gray-700 hover:text-gray-900" : ""}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVersionDetails(version.version)}
                      title="View version details"
                      className={version.version === primaryVersion ? "text-gray-700 hover:text-gray-900" : ""}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {canSetPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSetPrimary!(version.version)}
                        title="Set as primary version"
                        className={version.version === primaryVersion ? "text-gray-700 hover:text-gray-900" : ""}
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete version"
                            className={cn(
                              "hover:text-red-600",
                              version.version === primaryVersion ? "text-gray-700 hover:text-red-600" : ""
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {isPrimary ? "Delete Primary Version?" : "Delete Version?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isPrimary ? (
                                <>
                                  You are about to delete the primary version <strong>{version.version}</strong>.
                                  <br />
                                  <br />
                                  The next available version will automatically become the new primary version.
                                  This action cannot be undone.
                                </>
                              ) : (
                                <>
                                  Are you sure you want to delete version <strong>{version.version}</strong>?
                                  <br />
                                  This action cannot be undone.
                                </>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteVersion(version.version)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={isDeleting}
                            >
                              {isDeleting ? "Deleting..." : (isPrimary ? "Delete Primary Version" : "Delete Version")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(version.version)}
                      title={isExpanded ? "Collapse version details" : "Expand version details"}
                      className={version.version === primaryVersion ? "text-gray-700 hover:text-gray-900" : ""}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <>
                  <Separator />
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Template Preview */}
                      <div>
                        <h5 className="font-medium text-sm mb-2 flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>Template</span>
                        </h5>
                        <div className="bg-gray-50 border rounded-lg p-3 text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {version.template}
                        </div>
                      </div>
                      
                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Created:</span>
                          <div className="flex items-center space-x-1 mt-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span>{formatTimestamp(version.createdAt)}</span>
                          </div>
                        </div>
                        
                        {version._stats && (
                          <div>
                            <span className="font-medium text-gray-500">Performance:</span>
                            <div className="mt-1 space-y-1">
                              <div className="text-xs">
                                Tests: {version._stats.testCount}
                              </div>
                              {version._stats.avgLatency && (
                                <div className="text-xs">
                                  Avg Latency: {version._stats.avgLatency}ms
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          );
        })}
      </div>
      
      {/* Version Details Modal */}
      <Dialog open={!!showVersionDetails} onOpenChange={() => setShowVersionDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version {showVersionDetails} Details
            </DialogTitle>
            <DialogDescription>
              View the complete template and metadata for this version
            </DialogDescription>
          </DialogHeader>
          
          {showVersionDetails && (
            <div className="space-y-4">
              {(() => {
                const version = versions.find(v => v.version === showVersionDetails);
                if (!version) return null;
                
                return (
                  <>
                    <div>
                      <h4 className="font-semibold mb-2">Template</h4>
                      <div className="bg-gray-50 border rounded-lg p-4 text-sm font-mono whitespace-pre-wrap">
                        {version.template}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Metadata</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Version:</span> {version.version}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {formatTimestamp(version.createdAt)}
                          </div>
                          {version.changelog && (
                            <div>
                              <span className="font-medium">Changes:</span> {version.changelog}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {version._stats && (
                        <div>
                          <h4 className="font-semibold mb-2">Statistics</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Usage Count:</span> {version._stats.usageCount}
                            </div>
                            <div>
                              <span className="font-medium">Test Count:</span> {version._stats.testCount}
                            </div>
                            {version._stats.successRate !== undefined && (
                              <div>
                                <span className="font-medium">Success Rate:</span> {Math.round(version._stats.successRate * 100)}%
                              </div>
                            )}
                            {version._stats.avgLatency && (
                              <div>
                                <span className="font-medium">Avg Latency:</span> {version._stats.avgLatency}ms
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}