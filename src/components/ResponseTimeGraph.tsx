import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { History } from '@/types/api';
import { format } from 'date-fns';

interface ResponseTimeGraphProps {
  history: History[];
  isLoading?: boolean;
}

interface BucketData {
  startDateTime: string;
  endDateTime: string;
  responseTimeMs: number;
  count: number;
  statusSummary: Record<number, number>;
  hasErrors: boolean;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BucketData }> }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const statusEntries = Object.entries(data.statusSummary).sort(([a], [b]) => parseInt(a) - parseInt(b));

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {format(new Date(data.startDateTime), 'MMM d, HH:mm:ss')}
      </p>
      <p className="text-xs text-muted-foreground mb-2">
        → {format(new Date(data.endDateTime), 'MMM d, HH:mm:ss')}
      </p>
      <p className="text-sm font-medium">
        P95: {data.responseTimeMs.toLocaleString()}ms
      </p>
      {statusEntries.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 my-1">
          {statusEntries.map(([code, count]) => {
            const numCode = parseInt(code, 10);
            const isError = numCode >= 400 || numCode === 0;
            const isSuccess = numCode >= 200 && numCode < 300;
            return (
              <span key={code} className="text-xs font-mono">
                <span className={isError ? 'text-red-500' : isSuccess ? 'text-green-500' : 'text-yellow-500'}>
                  {code}
                </span>
                <span className="text-muted-foreground">×{count}</span>
              </span>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {data.count} request{data.count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function ResponseTimeGraph({ history, isLoading }: ResponseTimeGraphProps) {
  // Generate unique ID for this chart instance to avoid gradient conflicts
  const chartId = React.useId().replace(/:/g, '');

  if (isLoading) {
    return (
      <div className="h-full w-full min-h-[160px] skeleton-pulse" />
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-full w-full min-h-[160px] flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
        No history data available
      </div>
    );
  }

  // Sort history by date
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );
  
  if (import.meta.env.DEV) {
    console.debug('[ResponseTimeGraph] Rendering with', history.length, 'records')
  }

  // Calculate P95 for an array of values
  const calculateP95 = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
  };

  // Group into max 90 buckets
  const maxBuckets = 90;
  const bucketSize = Math.ceil(sortedHistory.length / maxBuckets);
  
  const chartData: BucketData[] = [];
  for (let i = 0; i < sortedHistory.length; i += bucketSize) {
    const bucket = sortedHistory.slice(i, i + bucketSize);
    if (bucket.length === 0) continue;
    
    const responseTimes = bucket.map((h) => h.responseTimeMs);
    const statusSummary = bucket.reduce((acc, h) => {
      acc[h.statusCode] = (acc[h.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Check if any status code in this bucket is an error (4xx, 5xx, or 0)
    const hasErrors = bucket.some((h) => h.statusCode >= 400 || h.statusCode === 0);
    
    chartData.push({
      startDateTime: bucket[0].dateTime,
      endDateTime: bucket[bucket.length - 1].dateTime,
      responseTimeMs: calculateP95(responseTimes),
      count: bucket.length,
      statusSummary,
      hasErrors,
    });
  }

  // Calculate bounds
  const responseTimes = chartData.map((d) => d.responseTimeMs);
  const minResponse = Math.min(...responseTimes);
  const maxResponse = Math.max(...responseTimes);
  
  const firstDate = chartData[0]?.startDateTime;
  const lastDate = chartData[chartData.length - 1]?.endDateTime;

  // Threshold values for color changes
  const YELLOW_THRESHOLD = 500;
  const RED_THRESHOLD = 2000;

  // Calculate gradient stops based on thresholds
  // Y-axis goes from top (max) to bottom (min), so we need to invert the percentages
  const range = maxResponse - minResponse;
  const getStopOffset = (value: number) => {
    if (range === 0) return 0;
    // Invert: high values at top (0%), low values at bottom (100%)
    return Math.max(0, Math.min(1, 1 - (value - minResponse) / range));
  };

  // Build gradient stops
  const gradientStops: { offset: string; color: string }[] = [];
  
  // Determine which thresholds are within our data range
  const yellowInRange = YELLOW_THRESHOLD > minResponse && YELLOW_THRESHOLD < maxResponse;
  const redInRange = RED_THRESHOLD > minResponse && RED_THRESHOLD < maxResponse;

  if (maxResponse < YELLOW_THRESHOLD) {
    // All green
    gradientStops.push({ offset: '0%', color: 'hsl(var(--stoplight-green))' });
    gradientStops.push({ offset: '100%', color: 'hsl(var(--stoplight-green))' });
  } else if (minResponse >= RED_THRESHOLD) {
    // All red
    gradientStops.push({ offset: '0%', color: 'hsl(var(--stoplight-red))' });
    gradientStops.push({ offset: '100%', color: 'hsl(var(--stoplight-red))' });
  } else if (minResponse >= YELLOW_THRESHOLD) {
    // Between yellow and red
    if (redInRange) {
      const redOffset = getStopOffset(RED_THRESHOLD);
      gradientStops.push({ offset: '0%', color: 'hsl(var(--stoplight-red))' });
      gradientStops.push({ offset: `${redOffset * 100}%`, color: 'hsl(var(--stoplight-red))' });
      gradientStops.push({ offset: `${redOffset * 100}%`, color: 'hsl(var(--stoplight-yellow))' });
      gradientStops.push({ offset: '100%', color: 'hsl(var(--stoplight-yellow))' });
    } else {
      gradientStops.push({ offset: '0%', color: 'hsl(var(--stoplight-yellow))' });
      gradientStops.push({ offset: '100%', color: 'hsl(var(--stoplight-yellow))' });
    }
  } else {
    // Starts in green
    const yellowOffset = getStopOffset(YELLOW_THRESHOLD);
    
    if (redInRange) {
      const redOffset = getStopOffset(RED_THRESHOLD);
      gradientStops.push({ offset: '0%', color: 'hsl(var(--stoplight-red))' });
      gradientStops.push({ offset: `${redOffset * 100}%`, color: 'hsl(var(--stoplight-red))' });
      gradientStops.push({ offset: `${redOffset * 100}%`, color: 'hsl(var(--stoplight-yellow))' });
      gradientStops.push({ offset: `${yellowOffset * 100}%`, color: 'hsl(var(--stoplight-yellow))' });
      gradientStops.push({ offset: `${yellowOffset * 100}%`, color: 'hsl(var(--stoplight-green))' });
      gradientStops.push({ offset: '100%', color: 'hsl(var(--stoplight-green))' });
    } else if (yellowInRange) {
      gradientStops.push({ offset: '0%', color: 'hsl(var(--stoplight-yellow))' });
      gradientStops.push({ offset: `${yellowOffset * 100}%`, color: 'hsl(var(--stoplight-yellow))' });
      gradientStops.push({ offset: `${yellowOffset * 100}%`, color: 'hsl(var(--stoplight-green))' });
      gradientStops.push({ offset: '100%', color: 'hsl(var(--stoplight-green))' });
    } else {
      gradientStops.push({ offset: '0%', color: 'hsl(var(--stoplight-green))' });
      gradientStops.push({ offset: '100%', color: 'hsl(var(--stoplight-green))' });
    }
  }

  // Determine the dominant color for the stroke (based on max value)
  const getStrokeColor = () => {
    if (maxResponse >= RED_THRESHOLD) return `url(#strokeGradient-${chartId})`;
    if (maxResponse >= YELLOW_THRESHOLD) return `url(#strokeGradient-${chartId})`;
    return 'hsl(var(--stoplight-green))';
  };

  return (
    <div className="h-full w-full min-h-[100px] flex flex-col overflow-visible">
      <div className="flex-1 min-h-0 flex">
        {/* Y-axis labels on left */}
        <div className="flex flex-col justify-between items-end pr-1 py-1 shrink-0">
          <span className="text-[9px] text-muted-foreground leading-none">{maxResponse.toLocaleString()}</span>
          <span className="text-[8px] text-muted-foreground leading-none">ms</span>
          <span className="text-[9px] text-muted-foreground leading-none">{minResponse.toLocaleString()}</span>
        </div>
        
        {/* Chart area */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={`strokeGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  {gradientStops.map((stop, i) => (
                    <stop key={i} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <linearGradient id={`fillGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  {gradientStops.map((stop, i) => (
                    <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={i === 0 ? 0.3 : 0} />
                  ))}
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="dateTime" 
                hide 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                hide 
                domain={[minResponse, maxResponse]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              {/* Baseline at lowest value */}
              <ReferenceLine
                y={minResponse}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              {/* Reference lines for thresholds */}
              {YELLOW_THRESHOLD >= minResponse && YELLOW_THRESHOLD <= maxResponse && (
                <ReferenceLine
                  y={YELLOW_THRESHOLD}
                  stroke="hsl(var(--stoplight-yellow))"
                  strokeWidth={1}
                  strokeOpacity={0.4}
                  strokeDasharray="4 4"
                />
              )}
              {RED_THRESHOLD >= minResponse && RED_THRESHOLD <= maxResponse && (
                <ReferenceLine
                  y={RED_THRESHOLD}
                  stroke="hsl(var(--stoplight-red))"
                  strokeWidth={1}
                  strokeOpacity={0.4}
                  strokeDasharray="4 4"
                />
              )}
              <Area
                type="monotone"
                dataKey="responseTimeMs"
                stroke={getStrokeColor()}
                strokeWidth={2}
                fill={`url(#fillGradient-${chartId})`}
                dot={(props: { cx?: number; cy?: number; payload?: BucketData }) => {
                  const { cx, cy, payload } = props;
                  if (!payload?.hasErrors || cx === undefined || cy === undefined) return <g />;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="hsl(var(--stoplight-red))"
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 4, fill: 'hsl(var(--graph-line))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* X-axis label with bounds */}
      <div className="flex items-center justify-between pl-8 shrink-0">
        <span className="text-[9px] text-muted-foreground truncate">
          {firstDate ? format(new Date(firstDate), 'MMM d, HH:mm') : ''}
        </span>
        <span className="text-[9px] text-muted-foreground truncate">
          {lastDate ? format(new Date(lastDate), 'MMM d, HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}
