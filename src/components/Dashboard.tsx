import { useState, useCallback, useEffect } from 'react';
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

  // Dialog states
  const [watchDialogOpen, setWatchDialogOpen] = useState(false);
  const [editingWatch, setEditingWatch] = useState<Watch | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWatch, setDeletingWatch] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWatchData = useCallback(async (watch: Watch): Promise<WatchWithData> => {
    try {
      const [summary, historyResponse] = await Promise.all([
        getHistorySummary(apiKey, watch.name),
        getHistory(apiKey, watch.name, 90),
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
                <PopoverContent align="end" className="w-[28rem]">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">API Key</p>
                    <ApiKeyInput
                      value={apiKey}
                      onChange={setApiKey}
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

        {isConnected && watches.length > 0 && (
          <div className="flex flex-col gap-6">
            {watches.map((watch) => (
              <WatchCard
                key={watch.name}
                watch={watch}
                onEdit={() => handleEditWatch(watch)}
                onToggle={() => handleToggleWatch(watch)}
                onDelete={() => handleDeleteClick(watch.name)}
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
