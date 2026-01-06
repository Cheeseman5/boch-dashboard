import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Watch, AddWatchRequest, UpdateWatchRequest } from '@/types/api';

interface WatchDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddWatchRequest | UpdateWatchRequest, originalName?: string) => Promise<void>;
  watch?: Watch;
}

export function WatchDialog({ open, onClose, onSave, watch }: WatchDialogProps) {
  const isEdit = !!watch;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (watch) {
      setName(watch.name);
      setUrl(watch.url || '');
      setCustomHeaders(watch.customHeaders || '');
      setIntervalMinutes(watch.intervalMinutes);
      setActive(watch.active);
    } else {
      setName('');
      setUrl('');
      setCustomHeaders('');
      setIntervalMinutes(5);
      setActive(true);
    }
    setError(null);
  }, [watch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isEdit) {
        // Only include changed fields for update
        const updates: UpdateWatchRequest = {};
        if (name !== watch.name) updates.name = name;
        if (url !== (watch.url || '')) updates.url = url;
        if (customHeaders !== (watch.customHeaders || '')) updates.customHeaders = customHeaders;
        if (intervalMinutes !== watch.intervalMinutes) updates.intervalMinutes = intervalMinutes;
        if (active !== watch.active) updates.active = active;

        await onSave(updates, watch.name);
      } else {
        const newWatch: AddWatchRequest = {
          name,
          intervalMinutes,
        };
        if (url) newWatch.fullUrl = url;
        if (customHeaders) newWatch.customHeaders = customHeaders;

        await onSave(newWatch);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save watch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Watch' : 'Add Watch'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Endpoint"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/health"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headers">Custom Headers (JSON)</Label>
            <Textarea
              id="headers"
              value={customHeaders}
              onChange={(e) => setCustomHeaders(e.target.value)}
              placeholder='{"Authorization": "Bearer token"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Interval (minutes) *</Label>
            <Input
              id="interval"
              type="number"
              min={1}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
