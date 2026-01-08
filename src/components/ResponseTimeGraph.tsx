import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { History } from '@/types/api';
import { format } from 'date-fns';

interface ResponseTimeGraphProps {
  history: History[];
  isLoading?: boolean;
}

interface TooltipPayload {
  dateTime: string;
  responseTimeMs: number;
  statusCode: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TooltipPayload }> }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isSuccess = data.statusCode >= 200 && data.statusCode < 300;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {format(new Date(data.dateTime), 'MMM d, yyyy HH:mm:ss')}
      </p>
      <p className="text-sm font-medium">
        {data.responseTimeMs}ms
      </p>
      <p className={`text-xs ${isSuccess ? 'text-stoplight-green' : 'text-stoplight-red'}`}>
        Status: {data.statusCode}
      </p>
    </div>
  );
}

export function ResponseTimeGraph({ history, isLoading }: ResponseTimeGraphProps) {
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

  // Take max 90 data points, sorted by date
  const chartData = [...history]
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(-90)
    .map((h) => ({
      dateTime: h.dateTime,
      responseTimeMs: h.responseTimeMs,
      statusCode: h.statusCode,
    }));

  // Calculate bounds
  const responseTimes = chartData.map((d) => d.responseTimeMs);
  const minResponse = Math.min(...responseTimes);
  const maxResponse = Math.max(...responseTimes);
  
  const firstDate = chartData[0]?.dateTime;
  const lastDate = chartData[chartData.length - 1]?.dateTime;

  return (
    <div className="h-full w-full min-h-[160px] flex flex-col">
      {/* Y-axis label */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-muted-foreground font-medium">Response Time (ms)</span>
        <div className="flex-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{maxResponse}ms</span>
          <span>{minResponse}ms</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--graph-line))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--graph-line))" stopOpacity={0} />
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
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="responseTimeMs"
              stroke="hsl(var(--graph-line))"
              strokeWidth={2}
              fill="url(#colorResponse)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--graph-line))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* X-axis label with bounds */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">
          {firstDate ? format(new Date(firstDate), 'MMM d, HH:mm') : ''}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">Time</span>
        <span className="text-[10px] text-muted-foreground">
          {lastDate ? format(new Date(lastDate), 'MMM d, HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}
