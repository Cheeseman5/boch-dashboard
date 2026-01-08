import { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw, Plus, Activity, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ApiKeyInput } from './ApiKeyInput';
import { GlobalHealth } from './GlobalHealth';
import { WatchCard } from './WatchCard';
import { WatchDialog } from './WatchDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import {
  getWatches,
  getHistory,
  getHistorySummary,
  addWatch,
  updateWatch,
  deleteWatch,
} from '@/lib/api';
import { calculateWatchStatus } from '@/lib/stoplight';
import type {
  Watch,
  WatchWithData,
  AddWatchRequest,
  UpdateWatchRequest,
  StoplightStatus,
} from '@/types/api';
import { toast } from '@/hooks/use-toast';

const LOCAL_STORAGE_KEY = 'boch-api-key';

export function Dashboard() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEY) || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watches, setWatches] = useState<WatchWithData[]>([]);
  const [watchOrder, setWatchOrder] = useState<string[]>([]);
  const [draggedWatch, setDraggedWatch] = useState<string | null>(null);
  const [dragOverWatch, setDragOverWatch] = useState<string | null>(null);

  // Dialog states
  const [watchDialogOpen, setWatchDialogOpen] = useState(false);
  const [editingWatch, setEditingWatch] = useState<Watch | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWatch, setDeletingWatch] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWatchData = useCallback(async (watch: Watch): Promise<WatchWithData> => {
    try {
      if (import.meta.env.DEV) {
        console.debug('[boch] fetchWatchData for', watch.name);
      }

      const [summary, historyResponse] = await Promise.all([
        getHistorySummary(apiKey, watch.name),
        getHistory(apiKey, watch.name),
      ]);

      const status = calculateWatchStatus(summary, historyResponse.records);

      return {
        ...watch,
        summary,
        history: historyResponse.records,
        status,
        isLoading: false,
      };
    } catch {
      return {
        ...watch,
        status: 'grey' as StoplightStatus,
        isLoading: false,
      };
    }
  }, [apiKey]);

  const refreshData = useCallback(async () => {
    if (!apiKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const watchList = await getWatches(apiKey);
      
      // Initialize watches with loading state
      const initialWatches: WatchWithData[] = watchList.map((w) => ({
        ...w,
        status: 'grey' as StoplightStatus,
        isLoading: true,
      }));
      setWatches(initialWatches);

      // Initialize order only if empty or if new watches were added
      setWatchOrder((prevOrder) => {
        const existingNames = new Set(prevOrder);
        const newNames = watchList.map((w) => w.name).filter((n) => !existingNames.has(n));
        // Keep existing order, append new watches at the end
        const validOrder = prevOrder.filter((n) => watchList.some((w) => w.name === n));
        return [...validOrder, ...newNames];
      });

      // Fetch data for each watch asynchronously
      watchList.forEach(async (watch) => {
        const watchWithData = await fetchWatchData(watch);
        setWatches((prev) =>
          prev.map((w) => (w.name === watch.name ? watchWithData : w))
        );
      });

      setIsConnected(true);
      localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch watches';
      setError(message);
      setIsConnected(false);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, fetchWatchData]);

  // Auto-refresh on mount if API key exists
  useEffect(() => {
    if (apiKey && !isConnected) {
      refreshData();
    }
  }, []);

  const handleConnect = () => {
    if (apiKey.trim()) {
      refreshData();
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    // If cleared, reset all state
    if (!value.trim()) {
      setIsConnected(false);
      setWatches([]);
      setWatchOrder([]);
      setError(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const handleAddWatch = () => {
    setEditingWatch(undefined);
    setWatchDialogOpen(true);
  };

  const handleEditWatch = (watch: Watch) => {
    setEditingWatch(watch);
    setWatchDialogOpen(true);
  };

  const handleSaveWatch = async (
    data: AddWatchRequest | UpdateWatchRequest,
    originalName?: string
  ) => {
    if (originalName) {
      await updateWatch(apiKey, originalName, data as UpdateWatchRequest);
    } else {
      await addWatch(apiKey, data as AddWatchRequest);
    }
    await refreshData();
  };

  const handleToggleWatch = async (watch: Watch) => {
    try {
      await updateWatch(apiKey, watch.name, { active: !watch.active });
      await refreshData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to toggle watch',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (watchName: string) => {
    setDeletingWatch(watchName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWatch) return;

    setIsDeleting(true);
    try {
      await deleteWatch(apiKey, deletingWatch);
      setDeleteDialogOpen(false);
      setDeletingWatch(null);
      await refreshData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete watch',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag and drop handlers
  const dragTimeoutRef = useRef<number | null>(null);
  
  const handleDragStart = (e: React.DragEvent, watchName: string) => {
    setDraggedWatch(watchName);
    e.dataTransfer.effectAllowed = 'move';
    // Store under a custom type first to avoid the browser overriding text/plain
    e.dataTransfer.setData('application/x-boch-watch-name', watchName);
    e.dataTransfer.setData('text/plain', watchName);
  };

  const handleDragOver = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedWatch && targetName !== draggedWatch && targetName !== dragOverWatch) {
      // Clear any pending timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
      setDragOverWatch(targetName);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Use a small delay to prevent flickering when moving between cards
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = window.setTimeout(() => {
      // Intentionally empty - we only clear on dragEnd or new dragOver
    }, 50);
  };

  const handleDragEnd = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    setDraggedWatch(null);
    setDragOverWatch(null);
  };

  const handleDrop = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // Use the last "over" card as the target when available (more stable than relying on the exact drop node)
    const effectiveTarget = dragOverWatch ?? targetName;

    // Get dragged name from dataTransfer (more reliable than state which may be cleared by dragEnd)
    const draggedName =
      e.dataTransfer.getData('application/x-boch-watch-name') ||
      e.dataTransfer.getData('text/plain');

    if (!draggedName || draggedName === effectiveTarget) {
      setDraggedWatch(null);
      setDragOverWatch(null);
      return;
    }

    const currentNames = watches.map((w) => w.name);
    const baseOrder = watchOrder.length > 0 ? [...watchOrder] : currentNames;

    const draggedIndex = baseOrder.indexOf(draggedName);
    const targetIndex = baseOrder.indexOf(effectiveTarget);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      baseOrder.splice(draggedIndex, 1);
      baseOrder.splice(targetIndex, 0, draggedName);
      setWatchOrder(baseOrder);
    }

    setDraggedWatch(null);
    setDragOverWatch(null);
  };

  // Sort watches by custom order
  const sortedWatches = [...watches].sort((a, b) => {
    const aIndex = watchOrder.indexOf(a.name);
    const bIndex = watchOrder.indexOf(b.name);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Create preview order when dragging - show where card WILL go
  const previewWatches = draggedWatch && dragOverWatch
    ? (() => {
        const names = sortedWatches.map(w => w.name);
        const draggedIndex = names.indexOf(draggedWatch);
        const targetIndex = names.indexOf(dragOverWatch);
        if (draggedIndex === -1 || targetIndex === -1) return sortedWatches;
        
        // Remove dragged item and insert at target position
        const reordered = [...names];
        reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, draggedWatch);
        
        return reordered.map(name => sortedWatches.find(w => w.name === name)!);
      })()
    : sortedWatches;

  const statuses = watches.map((w) => w.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav Bar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-2 shrink-0">
              <Activity className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-gradient">BOCH Dashboard</h1>
            </div>

            {/* API Key Menu */}
            <div className="flex items-center gap-3">
              {apiKey && (
                <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                  Key: ...{apiKey.slice(-5)}
                </span>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Settings className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[34rem]">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">API Key</p>
                    <ApiKeyInput
                      value={apiKey}
                      onChange={handleApiKeyChange}
                      onSubmit={handleConnect}
                      isLoading={isLoading}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </nav>

      {/* Status Section */}
      {(isConnected || error || !apiKey.trim()) && (
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col items-center gap-4">
              {/* Global Health */}
              {isConnected && (
                <GlobalHealth statuses={statuses} isLoading={isLoading} />
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Not Connected Message */}
              {!isConnected && !error && (
                <p className="text-muted-foreground text-center max-w-md">
                  Enter your RapidAPI key to begin viewing your watches
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Actions Bar - always show when API key exists */}
        {apiKey.trim() && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              Your Watches ({watches.length})
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isLoading || !isConnected}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAddWatch}>
                <Plus className="w-4 h-4 mr-2" />
                Add Watch
              </Button>
            </div>
          </div>
        )}

        {/* Watch Grid */}
        {isConnected && watches.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No watches added</h3>
            <p className="text-muted-foreground mb-4">
              Create your first watch to start monitoring your endpoints
            </p>
          </div>
        )}

        {isConnected && previewWatches.length > 0 && (
          <div className="flex flex-col gap-6">
            {previewWatches.map((watch) => (
              <WatchCard
                key={watch.name}
                watch={watch}
                onEdit={() => handleEditWatch(watch)}
                onDelete={() => handleDeleteClick(watch.name)}
                isDragging={draggedWatch === watch.name}
                isGhost={draggedWatch !== null && dragOverWatch !== null && watch.name === draggedWatch}
                onDragStart={(e) => handleDragStart(e, watch.name)}
                onDragOver={(e) => handleDragOver(e, watch.name)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, watch.name)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <WatchDialog
        open={watchDialogOpen}
        onClose={() => setWatchDialogOpen(false)}
        onSave={handleSaveWatch}
        watch={editingWatch}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        watchName={deletingWatch || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}
