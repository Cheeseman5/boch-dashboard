import { Pencil, Pause, Play, Trash2 } from 'lucide-react';
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
  onToggle: () => void;
  onDelete: () => void;
}

export function WatchCard({ watch, onEdit, onToggle, onDelete }: WatchCardProps) {
  const { name, url, intervalMinutes, active, summary, history, status, isLoading } = watch;

  const formatMs = (ms?: number) => {
    if (ms === undefined || ms === null) return '-';
    return `${Math.round(ms)}ms`;
  };

  return (
    <Card className={cn(
      'glass-card transition-all duration-300 animate-fade-in',
      isLoading && 'card-loading'
    )}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
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
        {/* Response Time Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Min</p>
            <p className="text-lg font-mono font-medium">
              {isLoading ? <span className="skeleton-pulse inline-block w-12 h-5" /> : formatMs(summary?.responseTime?.min)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg</p>
            <p className="text-lg font-mono font-medium">
              {isLoading ? <span className="skeleton-pulse inline-block w-12 h-5" /> : formatMs(summary?.responseTime?.avg)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Max</p>
            <p className="text-lg font-mono font-medium">
              {isLoading ? <span className="skeleton-pulse inline-block w-12 h-5" /> : formatMs(summary?.responseTime?.max)}
            </p>
          </div>
        </div>

        {/* Response Time Graph */}
        <ResponseTimeGraph history={history || []} isLoading={isLoading} />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {summary?.histroyRecordCount ?? '-'} records
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onToggle}
              title={active ? 'Pause watch' : 'Resume watch'}
            >
              {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onEdit}
              title="Edit watch"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete watch"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
