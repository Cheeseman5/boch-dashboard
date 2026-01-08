import { Pencil, GripHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Stoplight } from './Stoplight';
import { ResponseTimeGraph } from './ResponseTimeGraph';
import type { WatchWithData } from '@/types/api';
import { cn } from '@/lib/utils';

interface WatchCardProps {
  watch: WatchWithData;
  onEdit: () => void;
  isDragging?: boolean;
  isGhost?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function WatchCard({ 
  watch, 
  onEdit,
  isDragging,
  isGhost,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
}: WatchCardProps) {
  const { name, url, intervalMinutes, active, summary, history, status, isLoading } = watch;

  const formatMs = (ms?: number) => {
    if (ms === undefined || ms === null) return '-';
    return `${Math.round(ms)}ms`;
  };

  return (
    <Card 
      className={cn(
        'glass-card transition-all duration-300 animate-fade-in relative',
        isLoading && 'card-loading',
        isDragging && 'opacity-50 scale-[0.98]',
        isGhost && 'ring-2 ring-primary/50 ring-dashed'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      {/* Drag Handle - centered at top (only draggable area) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors py-1 px-4"
        draggable
        onDragStart={onDragStart}
      >
        <GripHorizontal className="w-5 h-5" />
      </div>

      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2 pt-6">
        <div className="flex items-center gap-3 min-w-0">
          <Stoplight status={status} animate={!isLoading && status !== 'grey'} />
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{name}</h3>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              {url || '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={active ? 'default' : 'secondary'} className="text-xs">
            {active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {intervalMinutes}m
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Response Time Stats - compact sidebar */}
          <div className="flex lg:flex-col gap-4 lg:gap-2 lg:w-24 shrink-0">
            <div className="text-center lg:text-left">
              <p className="text-xs text-muted-foreground">Min</p>
              <p className="text-lg font-mono font-medium">
                {isLoading ? <span className="skeleton-pulse inline-block w-12 h-5" /> : formatMs(summary?.responseTime?.min)}
              </p>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-xs text-muted-foreground">Avg</p>
              <p className="text-lg font-mono font-medium">
                {isLoading ? <span className="skeleton-pulse inline-block w-12 h-5" /> : formatMs(summary?.responseTime?.avg)}
              </p>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-xs text-muted-foreground">Max</p>
              <p className="text-lg font-mono font-medium">
                {isLoading ? <span className="skeleton-pulse inline-block w-12 h-5" /> : formatMs(summary?.responseTime?.max)}
              </p>
            </div>
          </div>

          {/* Response Time Graph - takes up remaining space */}
          <div className="flex-1 min-h-[160px]">
            <ResponseTimeGraph history={history || []} isLoading={isLoading} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {summary?.histroyRecordCount ?? '-'} records
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onEdit}
            title="Edit watch"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
