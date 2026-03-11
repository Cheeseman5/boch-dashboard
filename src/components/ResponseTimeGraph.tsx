import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { History, StoplightStatus } from '@/types/api';
import { format } from 'date-fns';
import { STOPLIGHT_THRESHOLDS } from '@/config/app.config';
import { getAggregationLabel, aggregateResponseTimes } from '@/lib/stoplight';
import { getStatusCodeColor, getStatusCodeHslColor } from '@/lib/statusCodeColor';

function getStatusHsl(status: StoplightStatus): string {
  switch (status) {
    case 'red':
      return 'hsl(var(--stoplight-red))';
    case 'yellow':
      return 'hsl(var(--stoplight-yellow))';
    case 'green':
      return 'hsl(var(--stoplight-green))';
    default:
      return 'hsl(var(--muted-foreground))';
  }
}

/**
 * Reduce a bucket's status codes to a single interpreted status, using the same priority as the dashboard:
 * red > yellow > green (with per-code overrides applied inside getStatusCodeColor).
 */
function getBucketInterpretedStatus(statusSummary: Record<number, number> | undefined): StoplightStatus {
  if (!statusSummary || Object.keys(statusSummary).length === 0) return 'grey';

  let hasYellow = false;
  let hasGreen = false;

  for (const codeStr of Object.keys(statusSummary)) {
    const code = parseInt(codeStr, 10);
    const status = getStatusCodeColor(code);
    if (status === 'red') return 'red';
    if (status === 'yellow') hasYellow = true;
    if (status === 'green') hasGreen = true;
  }

  if (hasYellow) return 'yellow';
  if (hasGreen) return 'green';
  return 'grey';
}

interface ResponseTimeGraphProps {
  history: History[];
  isLoading?: boolean;
  /** Status code to highlight on the graph (from status list hover) */
  highlightStatusCode?: number | null;
  /** Callback when a data point is clicked */
  onDataPointClick?: (data: BucketData) => void;
  /** Callback when the visible data changes (e.g. due to zoom) */
  onVisibleDataChange?: (data: BucketData[] | null) => void;
}

export interface BucketData {
  startDateTime: string;
  endDateTime: string;
  timestamp: number; // midpoint timestamp for X positioning
  responseTimeMs: number;
  count: number;
  statusSummary: Record<number, number>;
  hasErrors: boolean;
  /** Original history records in this bucket */
  records: History[];
}

/** Clean hour intervals to snap to */
const MINUTE_INTERVALS = [15, 30, 60, 120, 180, 360, 720, 1440];
const TARGET_LABELS = 10;

/** Calculate hour and day boundary timestamps within a time range.
 *  Dynamically picks a clean hour interval to target ~10 labels.
 */
function getTimeBoundaries(startMs: number, endMs: number) {
  const boundaries: { timestamp: number; label: string; isDay: boolean }[] = [];
  
  // Pick the smallest clean interval (in minutes) that yields ≤ TARGET_LABELS
  const spanMinutes = (endMs - startMs) / (60 * 1000);
  const idealInterval = spanMinutes / TARGET_LABELS;
  const minuteInterval = MINUTE_INTERVALS.find(i => i >= idealInterval) ?? 1440;
  
  // Find first aligned boundary after start using calendar-safe arithmetic
  const first = new Date(startMs);
  first.setSeconds(0, 0);
  const currentMinutes = first.getHours() * 60 + first.getMinutes();
  const nextAligned = Math.ceil((currentMinutes + 1) / minuteInterval) * minuteInterval;
  
  // Start from midnight of the start day, then add the aligned offset via setMinutes
  // to stay DST-safe
  const base = new Date(first);
  base.setHours(0, 0, 0, 0);
  
  // Iterate using calendar-based stepping to avoid DST drift
  const startDay = new Date(base);
  let offsetMinutes = nextAligned;
  
  // Walk forward in calendar-aligned steps
  while (true) {
    const d = new Date(startDay);
    // Use setHours/setMinutes to let the engine handle DST
    const hours = Math.floor(offsetMinutes / 60);
    const mins = offsetMinutes % 60;
    
    if (hours >= 24) {
      // Advance by full days using setDate to handle DST correctly
      const daysToAdd = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      d.setDate(d.getDate() + daysToAdd);
      d.setHours(remainingHours, mins, 0, 0);
    } else {
      d.setHours(hours, mins, 0, 0);
    }
    
    const t = d.getTime();
    if (t >= endMs) break;
    
    if (t > startMs) {
      const hour = d.getHours();
      const minute = d.getMinutes();
      const isDay = hour === 0 && minute === 0;
      
      boundaries.push({
        timestamp: t,
        label: isDay ? format(d, 'MMM d') : format(d, 'HH:mm'),
        isDay,
      });
    }
    
    offsetMinutes += minuteInterval;
  }
  
  return boundaries;
}

const CustomTooltip = React.forwardRef<HTMLDivElement, { active?: boolean; payload?: Array<{ payload: BucketData }> }>(
  ({ active, payload }, ref) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const statusEntries = Object.entries(data.statusSummary).sort(([a], [b]) => parseInt(a) - parseInt(b));

    return (
      <div ref={ref} className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">
          {format(new Date(data.startDateTime), 'MMM d, HH:mm:ss')}
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          → {format(new Date(data.endDateTime), 'MMM d, HH:mm:ss')}
        </p>
        <p className="text-sm font-medium">
          {getAggregationLabel()}: {data.responseTimeMs.toLocaleString()}ms
        </p>
        {statusEntries.length > 0 && (
          <div className="flex flex-col gap-0.5 my-1">
            {statusEntries.map(([code, count]) => {
              const numCode = parseInt(code, 10);
              return (
                <span key={code} className="text-xs font-mono">
                  <span style={{ color: getStatusCodeHslColor(numCode) }}>
                    {code}
                  </span>
                  <span className="text-muted-foreground"> × {count}</span>
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
);
CustomTooltip.displayName = 'CustomTooltip';

export function ResponseTimeGraph({ history, isLoading, highlightStatusCode, onDataPointClick, onVisibleDataChange }: ResponseTimeGraphProps) {
  // Generate unique ID for this chart instance to avoid gradient conflicts
  const chartId = React.useId().replace(/:/g, '');
  
  // Zoom state
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const didDragRef = React.useRef(false);
  const chartDataRef = React.useRef<BucketData[]>([]);
  const onVisibleDataChangeRef = useRef(onVisibleDataChange);
  onVisibleDataChangeRef.current = onVisibleDataChange;

  // Notify parent of visible data changes via effect (not during render)
  const isZoomed = zoomRange !== null;
  useEffect(() => {
    if (onVisibleDataChangeRef.current) {
      onVisibleDataChangeRef.current(isZoomed ? chartDataRef.current : null);
    }
  }, [isZoomed, zoomRange]);

  const handleMouseDown = useCallback((e: any) => {
    if (e?.activeLabel != null) {
      setZoomLeft(e.activeLabel);
      setZoomRight(null);
      setIsSelecting(true);
      didDragRef.current = false;
    }
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    if (isSelecting && e?.activeLabel != null) {
      setZoomRight(e.activeLabel);
      didDragRef.current = true;
    }
  }, [isSelecting]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && zoomLeft != null && zoomRight != null && zoomLeft !== zoomRight) {
      const left = Math.min(zoomLeft, zoomRight);
      const right = Math.max(zoomLeft, zoomRight);
      // Find the actual time boundaries from the currently displayed chart data
      const selectedPoints = chartDataRef.current.filter(d => d.timestamp >= left && d.timestamp <= right);
      if (selectedPoints.length > 0) {
        const rangeStart = new Date(selectedPoints[0].startDateTime).getTime();
        const rangeEnd = new Date(selectedPoints[selectedPoints.length - 1].endDateTime).getTime();
        setZoomRange([rangeStart, rangeEnd]);
      }
    }
    setZoomLeft(null);
    setZoomRight(null);
    setIsSelecting(false);
  }, [isSelecting, zoomLeft, zoomRight]);

  const handleResetZoom = useCallback(() => {
    setZoomRange(null);
  }, []);

  // Defer rendering to avoid "Layout was forced before the page was fully loaded" warning
  const [isReady, setIsReady] = React.useState(false);
  React.useEffect(() => {
    let rafId1: number;
    let rafId2: number;
    let cancelled = false;

    const activate = () => {
      if (cancelled) return;
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          if (!cancelled) setIsReady(true);
        });
      });
    };

    if (document.readyState === 'complete') {
      activate();
    } else {
      window.addEventListener('load', activate);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', activate);
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
    };
  }, []);

  if (isLoading || !isReady) {
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
  
  // Bucket a set of sorted history records into up to maxBuckets
  const buildBuckets = (records: typeof sortedHistory): BucketData[] => {
    const maxBuckets = 90;
    const bSize = Math.ceil(records.length / maxBuckets);
    const result: BucketData[] = [];
    for (let i = 0; i < records.length; i += bSize) {
      const bucket = records.slice(i, i + bSize);
      if (bucket.length === 0) continue;
      const rts = bucket.map((h) => h.responseTimeMs);
      const statusSummary = bucket.reduce((acc, h) => {
        acc[h.statusCode] = (acc[h.statusCode] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      const hasErrors = bucket.some((h) => h.statusCode >= 400 || h.statusCode === 0);
      const startMs = new Date(bucket[0].dateTime).getTime();
      const endMs = new Date(bucket[bucket.length - 1].dateTime).getTime();
      result.push({
        startDateTime: bucket[0].dateTime,
        endDateTime: bucket[bucket.length - 1].dateTime,
        timestamp: Math.round((startMs + endMs) / 2),
        responseTimeMs: aggregateResponseTimes(rts),
        count: bucket.length,
        statusSummary,
        hasErrors,
        records: bucket,
      });
    }
    return result;
  };

  const allChartData = buildBuckets(sortedHistory);

  // When zoomed, re-bucket from raw history within the zoom range for max resolution
  const chartData = (() => {
    if (!zoomRange) return allChartData;
    const [rangeStart, rangeEnd] = zoomRange;
    // Filter raw records whose timestamp falls within the zoom range
    const zoomedRecords = sortedHistory.filter(h => {
      const t = new Date(h.dateTime).getTime();
      return t >= rangeStart && t <= rangeEnd;
    });
    if (zoomedRecords.length === 0) return allChartData;
    return buildBuckets(zoomedRecords);
  })();
  chartDataRef.current = chartData;

  // Calculate bounds
  const responseTimes = chartData.map((d) => d.responseTimeMs);
  const minResponse = Math.min(...responseTimes);
  const maxResponse = Math.max(...responseTimes);
  
  const firstDate = chartData[0]?.startDateTime;
  const lastDate = chartData[chartData.length - 1]?.endDateTime;
  
  // Calculate time boundaries for vertical grid lines
  const firstTimestamp = chartData[0]?.timestamp ?? 0;
  const lastTimestamp = chartData[chartData.length - 1]?.timestamp ?? 0;
  const timeBoundaries = getTimeBoundaries(firstTimestamp, lastTimestamp);

  // Threshold values from centralized config
  const YELLOW_THRESHOLD = STOPLIGHT_THRESHOLDS.warningLatencyMs;
  const RED_THRESHOLD = STOPLIGHT_THRESHOLDS.criticalLatencyMs;

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
    <div className="h-full w-full min-h-[100px] flex flex-col overflow-visible relative">
      {/* Reset zoom button */}
      {zoomRange && (
        <button
          onClick={handleResetZoom}
          className="absolute top-0 right-0 z-10 text-[9px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors border border-border"
        >
          Reset zoom
        </button>
      )}
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
            <AreaChart 
              data={chartData} 
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                if (isSelecting) {
                  setIsSelecting(false);
                  setZoomLeft(null);
                  setZoomRight(null);
                }
              }}
              onClick={(e) => {
                // Only fire click if not dragging to zoom
                if (!didDragRef.current && e?.activePayload?.[0]?.payload && onDataPointClick) {
                  onDataPointClick(e.activePayload[0].payload as BucketData);
                }
              }}
              style={{ cursor: isSelecting ? 'col-resize' : 'crosshair' }}
            >
              <defs>
                <linearGradient id={`strokeGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  {gradientStops.map((stop, i) => (
                    <stop key={i} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <linearGradient id={`fillGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  {gradientStops.map((stop, i) => {
                    // Linearly interpolate opacity from 0.3 at top (0%) to 0 at bottom (100%)
                    const offsetNum = parseFloat(stop.offset) / 100;
                    const opacity = 0.3 * (1 - offsetNum);
                    return (
                      <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={opacity} />
                    );
                  })}
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="timestamp" 
                type="number"
                domain={[firstTimestamp, lastTimestamp]}
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
                allowEscapeViewBox={{ x: false, y: true }}
                position={{ x: undefined, y: undefined }}
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
              {/* Vertical time boundary lines */}
              {timeBoundaries.map((b) => (
                <ReferenceLine
                  key={b.timestamp}
                  x={b.timestamp}
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                  strokeOpacity={1}
                  strokeDasharray={b.isDay ? '1' : '2 3'}
                />
              ))}
              <Area
                type="monotone"
                dataKey="responseTimeMs"
                stroke={getStrokeColor()}
                strokeWidth={2}
                fill={`url(#fillGradient-${chartId})`}
                dot={(props: { cx?: number; cy?: number; payload?: BucketData }) => {
                  const { cx, cy, payload } = props;
                  if (cx === undefined || cy === undefined) return <g />;
                  
                  // Check if this bucket should be highlighted (contains the hovered status code)
                  const isHighlighted = highlightStatusCode !== null && 
                    highlightStatusCode !== undefined && 
                    payload?.statusSummary[highlightStatusCode] !== undefined;
                  
                  // Show dot if bucket has errors OR if it's highlighted
                  if (!payload?.hasErrors && !isHighlighted) return <g />;
                  
                  // Determine dot color based on interpreted status code logic
                  const getDotColor = () => {
                    // When highlighting a specific status code, dot color should match that code.
                    if (isHighlighted && highlightStatusCode !== null) {
                      return getStatusCodeHslColor(highlightStatusCode);
                    }

                    // Otherwise, color the dot based on the bucket's interpreted status.
                    const bucketStatus = getBucketInterpretedStatus(payload?.statusSummary);
                    return getStatusHsl(bucketStatus);
                  };
                  
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHighlighted ? 5 : 3}
                      fill={getDotColor()}
                      fillOpacity={isHighlighted ? 0.9 : 0.5}
                      stroke={isHighlighted ? "hsl(var(--background))" : "none"}
                      strokeWidth={isHighlighted ? 2 : 0}
                    />
                  );
                }}
                activeDot={(props: { cx?: number; cy?: number; payload?: BucketData }) => {
                  const { cx, cy, payload } = props;
                  if (cx === undefined || cy === undefined) return <g />;

                  const bucketStatus = getBucketInterpretedStatus(payload?.statusSummary);

                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={getStatusHsl(bucketStatus)}
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                    />
                  );
                }}
              />
              {/* Drag selection overlay */}
              {isSelecting && zoomLeft != null && zoomRight != null && (
                <ReferenceArea
                  x1={Math.min(zoomLeft, zoomRight)}
                  x2={Math.max(zoomLeft, zoomRight)}
                  strokeOpacity={0.3}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  stroke="hsl(var(--primary))"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* X-axis labels with time boundaries */}
      <div className="relative pl-8 shrink-0 h-3">
        {/* First date */}
        <span className="absolute left-8 text-[9px] text-muted-foreground truncate">
          {firstDate ? format(new Date(firstDate), 'MMM d, HH:mm') : ''}
        </span>
        {/* Time boundary labels - positioned proportionally */}
        {timeBoundaries.map((b) => {
          const pct = lastTimestamp > firstTimestamp
            ? ((b.timestamp - firstTimestamp) / (lastTimestamp - firstTimestamp)) * 100
            : 50;
          // Skip labels too close to edges (within 8%)
          if (pct < 8 || pct > 92) return null;
          return (
            <span
              key={b.timestamp}
              className="absolute text-[8px] text-muted-foreground -translate-x-1/2 whitespace-nowrap"
              style={{ left: `calc(2rem + ${pct * 0.01} * (100% - 2rem))`, transform: 'translateX(-50%)' }}
            >
              {b.label}
            </span>
          );
        })}
        {/* Last date */}
        <span className="absolute right-0 text-[9px] text-muted-foreground truncate">
          {lastDate ? format(new Date(lastDate), 'MMM d, HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}
