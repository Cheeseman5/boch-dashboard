import { Pencil, GripHorizontal, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Stoplight } from './Stoplight';
import { ResponseTimeGraph } from './ResponseTimeGraph';
import type { WatchWithData, HistoryFilter } from '@/types/api';
import { cn } from '@/lib/utils';

const HISTORY_FILTER_OPTIONS: { value: HistoryFilter; label: string }[] = [
  { value: 30, label: '30' },
  { value: 90, label: '90' },
  { value: 180, label: '180' },
  { value: 'all', label: 'All' },
];
interface WatchCardProps {
  watch: WatchWithData;
  historyFilter: HistoryFilter;
  onHistoryFilterChange: (filter: HistoryFilter) => void;
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
  historyFilter,
  onHistoryFilterChange,
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
  
  const filterLabel = HISTORY_FILTER_OPTIONS.find(o => o.value === historyFilter)?.label ?? 'All';

  // Filter history client-side based on the selected filter
  const filteredHistory = historyFilter === 'all' 
    ? history 
    : history?.slice(-historyFilter);

  // Calculate metrics from filtered data, or use summary when 'all'
  const metrics = (() => {
    if (historyFilter === 'all' && summary) {
      return {
        count: summary.histroyRecordCount,
        min: summary.responseTime?.min,
        avg: summary.responseTime?.avg,
        max: summary.responseTime?.max,
      };
    }
    
    if (!filteredHistory || filteredHistory.length === 0) {
      return { count: 0, min: undefined, avg: undefined, max: undefined };
    }
    
    const times = filteredHistory.map(h => h.responseTimeMs);
    return {
      count: filteredHistory.length,
      min: Math.min(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      max: Math.max(...times),
    };
  })();

  const formatMs = (ms?: number) => {
    if (ms === undefined || ms === null) return { value: '-', unit: '' };
    return { value: Math.round(ms).toLocaleString(), unit: 'ms' };
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

      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-1 pt-5 px-3">
        <div className="flex items-center gap-2 min-w-0">
          <Stoplight status={status} animate={!isLoading && status !== 'grey'} />
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{name}</h3>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              {url || '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Last</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="inline-flex items-center gap-0.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {filterLabel}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[80px]">
                {HISTORY_FILTER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onHistoryFilterChange(option.value)}
                    className={cn(
                      'text-xs cursor-pointer',
                      historyFilter === option.value && 'bg-accent'
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground">
              / {isLoading ? '...' : (summary?.histroyRecordCount ?? '-')} records
            </span>
          </div>
          <Badge variant={active ? 'default' : 'secondary'} className="text-xs">
            {active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            every {intervalMinutes}m
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={onEdit}
            title="Edit watch"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 pb-3">
        {/* Side-by-side: metrics on left, graph on right */}
        <div className="flex gap-3">
          {/* Metrics - stacked vertically (no Records, moved to header) */}
          <div className="flex flex-col justify-center gap-0.5 min-w-[70px]">
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Min</p>
              <p className="text-sm font-mono font-medium leading-tight flex justify-between">
                {isLoading ? <span className="skeleton-pulse inline-block w-8 h-3" /> : (
                  <><span>{formatMs(metrics.min).value}</span><span className="text-muted-foreground ml-1">{formatMs(metrics.min).unit}</span></>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Avg</p>
              <p className="text-sm font-mono font-medium leading-tight flex justify-between">
                {isLoading ? <span className="skeleton-pulse inline-block w-8 h-3" /> : (
                  <><span>{formatMs(metrics.avg).value}</span><span className="text-muted-foreground ml-1">{formatMs(metrics.avg).unit}</span></>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Max</p>
              <p className="text-sm font-mono font-medium leading-tight flex justify-between">
                {isLoading ? <span className="skeleton-pulse inline-block w-8 h-3" /> : (
                  <><span>{formatMs(metrics.max).value}</span><span className="text-muted-foreground ml-1">{formatMs(metrics.max).unit}</span></>
                )}
              </p>
            </div>
          </div>

          {/* Response Time Graph - fills remaining width */}
          <div className="flex-1 h-[100px]">
            <ResponseTimeGraph history={filteredHistory || []} isLoading={isLoading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
