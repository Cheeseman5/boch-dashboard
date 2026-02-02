import type { History, HistorySummaryResponse, StoplightStatus } from '@/types/api';
import { STOPLIGHT_THRESHOLDS, type PercentileValue, type GraphAggregationMethod } from '@/config/app.config';

/**
 * Calculate the Nth percentile of response times.
 * @param responseTimes - Array of response times in ms
 * @param percentile - The percentile to calculate (e.g., 95 for P95)
 */
function calculatePercentile(responseTimes: number[], percentile: PercentileValue = 95): number {
  if (responseTimes.length === 0) return 0;
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (percentile / 100));
  return sorted[Math.min(index, sorted.length - 1)];
}

/** Get the display label for the configured percentile (e.g., "P95", "P99") */
export function getPercentileLabel(): string {
  return `P${STOPLIGHT_THRESHOLDS.percentile}`;
}

/** Get the display label for the current graph aggregation method */
export function getAggregationLabel(): string {
  const method = STOPLIGHT_THRESHOLDS.graphAggregation;
  switch (method) {
    case 'max': return 'Max';
    case 'min': return 'Min';
    case 'avg': return 'Avg';
    case 'percentile': return getPercentileLabel();
  }
}

/**
 * Aggregate an array of response times based on the configured method.
 * @param responseTimes - Array of response times in ms
 * @param method - Optional override for the aggregation method (defaults to config value)
 */
export function aggregateResponseTimes(
  responseTimes: number[],
  method: GraphAggregationMethod = STOPLIGHT_THRESHOLDS.graphAggregation
): number {
  if (responseTimes.length === 0) return 0;
  
  switch (method) {
    case 'max':
      return Math.max(...responseTimes);
    case 'min':
      return Math.min(...responseTimes);
    case 'avg':
      return responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    case 'percentile':
      return calculatePercentile(responseTimes, STOPLIGHT_THRESHOLDS.percentile);
  }
}

function hasFailedResponses(statusSummary: Record<number, number>): boolean {
  return Object.entries(statusSummary).some(([code]) => {
    const numCode = parseInt(code, 10);
    return numCode >= 400 || numCode === 0;
  });
}

/**
 * Check if any status codes in the summary match the override lists.
 * Returns the override status if found, respecting priority: red > yellow > green.
 */
function getStatusCodeOverride(statusSummary: Record<number, number>): StoplightStatus | null {
  const codes = Object.keys(statusSummary).map((c) => parseInt(c, 10));
  const { redStatusCodes, yellowStatusCodes, greenStatusCodes } = STOPLIGHT_THRESHOLDS;

  // Priority: red > yellow > green
  if (codes.some((code) => redStatusCodes.includes(code))) {
    return 'red';
  }
  if (codes.some((code) => yellowStatusCodes.includes(code))) {
    return 'yellow';
  }
  if (codes.some((code) => greenStatusCodes.includes(code))) {
    return 'green';
  }

  return null;
}

function hasMixedStatusCodes(statusSummary: Record<number, number>): boolean {
  const codes = Object.keys(statusSummary).map((c) => parseInt(c, 10));
  const has2xx = codes.some((c) => c >= 200 && c < 300);
  const hasNon2xx = codes.some((c) => c < 200 || c >= 300);
  return has2xx && hasNon2xx;
}

export interface WatchStatusResult {
  status: StoplightStatus;
  p95: number | null;
  reason: string;
}

export function calculateWatchStatus(
  summary?: HistorySummaryResponse,
  history?: History[]
): StoplightStatus {
  return calculateWatchStatusWithDetails(summary, history).status;
}

export function calculateWatchStatusWithDetails(
  summary?: HistorySummaryResponse,
  history?: History[]
): WatchStatusResult {
  const { criticalLatencyMs, warningLatencyMs } = STOPLIGHT_THRESHOLDS;

  // No history records → grey
  if (!summary || summary.histroyRecordCount === 0) {
    return { status: 'grey', p95: null, reason: 'No data' };
  }

  const responseTimes = history?.map((h) => h.responseTimeMs) || [];
  const percentileValue = responseTimes.length > 0 
    ? calculatePercentile(responseTimes, STOPLIGHT_THRESHOLDS.percentile) 
    : summary.responseTime.avg;

  const label = getPercentileLabel();

  // Check for status code overrides first (priority: red > yellow > green)
  const overrideStatus = getStatusCodeOverride(summary.statusSummary);
  if (overrideStatus) {
    const overrideCodes = Object.keys(summary.statusSummary).join(', ');
    return { status: overrideStatus, p95: percentileValue, reason: `Status override: ${overrideCodes}` };
  }

  // Check for failed responses (4xx, 5xx, or 0)
  if (hasFailedResponses(summary.statusSummary)) {
    const errorCodes = Object.keys(summary.statusSummary)
      .filter(code => {
        const numCode = parseInt(code, 10);
        return numCode >= 400 || numCode === 0;
      })
      .join(', ');
    return { status: 'red', p95: percentileValue, reason: `Error responses: ${errorCodes}` };
  }

  // Check for extreme latency (RED)
  if (percentileValue >= criticalLatencyMs) {
    return { status: 'red', p95: percentileValue, reason: `${label}: ${Math.round(percentileValue).toLocaleString()} ms` };
  }

  // Check for high latency (YELLOW)
  if (percentileValue >= warningLatencyMs) {
    return { status: 'yellow', p95: percentileValue, reason: `${label}: ${Math.round(percentileValue).toLocaleString()} ms` };
  }

  // Check for mixed status codes
  if (hasMixedStatusCodes(summary.statusSummary)) {
    return { status: 'yellow', p95: percentileValue, reason: 'Mixed status codes' };
  }

  // All good: percentile < warningLatencyMs and all 2xx
  return { status: 'green', p95: percentileValue, reason: `${label}: ${Math.round(percentileValue).toLocaleString()} ms` };
}

export function calculateGlobalStatus(statuses: StoplightStatus[]): StoplightStatus {
  if (statuses.length === 0) return 'grey';
  
  if (statuses.includes('red')) return 'red';
  if (statuses.includes('yellow')) return 'yellow';
  if (statuses.includes('green')) return 'green';
  
  return 'grey';
}

export function getStatusCounts(statuses: StoplightStatus[]): Record<StoplightStatus, number> {
  return {
    green: statuses.filter((s) => s === 'green').length,
    yellow: statuses.filter((s) => s === 'yellow').length,
    red: statuses.filter((s) => s === 'red').length,
    grey: statuses.filter((s) => s === 'grey').length,
  };
}
