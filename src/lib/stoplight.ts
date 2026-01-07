import type { History, HistorySummaryResponse, StoplightStatus } from '@/types/api';

function calculateP95(responseTimes: number[]): number {
  if (responseTimes.length === 0) return 0;
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(index, sorted.length - 1)];
}

function hasFailedResponses(statusSummary: Record<number, number>): boolean {
  return Object.entries(statusSummary).some(([code]) => {
    const numCode = parseInt(code, 10);
    return numCode >= 400 || numCode === 0;
  });
}

function hasMixedStatusCodes(statusSummary: Record<number, number>): boolean {
  const codes = Object.keys(statusSummary).map((c) => parseInt(c, 10));
  const has2xx = codes.some((c) => c >= 200 && c < 300);
  const hasNon2xx = codes.some((c) => c < 200 || c >= 300);
  return has2xx && hasNon2xx;
}

export function calculateWatchStatus(
  summary?: HistorySummaryResponse,
  history?: History[]
): StoplightStatus {
  // No history records → grey
  if (!summary || summary.histroyRecordCount === 0) {
    return 'grey';
  }

  const responseTimes = history?.map((h) => h.responseTimeMs) || [];
  const p95 = responseTimes.length > 0 ? calculateP95(responseTimes) : summary.responseTime.avg;

  // Check for failed responses (4xx, 5xx, or 0) or extreme latency
  if (hasFailedResponses(summary.statusSummary) || p95 >= 2000) {
    return 'red';
  }

  // Check for high latency or mixed status codes
  if (p95 >= 500 || hasMixedStatusCodes(summary.statusSummary)) {
    return 'yellow';
  }

  // All good: P95 < 500ms and all 2xx
  return 'green';
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
