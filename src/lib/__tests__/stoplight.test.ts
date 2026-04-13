import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HistorySummaryResponse, History, StoplightStatus } from '@/types/api';

// We'll test the actual module but need to understand its config dependency
import {
  calculateWatchStatus,
  calculateWatchStatusWithDetails,
  calculateGlobalStatus,
  getStatusCounts,
  getPercentileLabel,
  getAggregationLabel,
  aggregateResponseTimes,
  type WatchStatusResult,
} from '@/lib/stoplight';

// ============================================================================
// Helpers to build test data
// ============================================================================

function makeSummary(overrides: Partial<HistorySummaryResponse> = {}): HistorySummaryResponse {
  return {
    watchName: 'test-watch',
    histroyRecordCount: 10,
    firstEventTime: '2024-01-01T00:00:00Z',
    lastEventTime: '2024-01-01T01:00:00Z',
    responseTime: { min: 50, max: 500, avg: 200 },
    statusSummary: { 200: 10 },
    ...overrides,
  };
}

function makeHistory(responseTimes: number[], statusCode = 200): History[] {
  return responseTimes.map((ms, i) => ({
    dateTime: new Date(Date.now() - (responseTimes.length - i) * 60000).toISOString(),
    statusCode,
    responseTimeMs: ms,
    peekResponseContent: '',
  }));
}

function makeHistoryWithCodes(entries: { ms: number; code: number }[]): History[] {
  return entries.map((e, i) => ({
    dateTime: new Date(Date.now() - (entries.length - i) * 60000).toISOString(),
    statusCode: e.code,
    responseTimeMs: e.ms,
    peekResponseContent: '',
  }));
}

// ============================================================================
// getPercentileLabel
// ============================================================================
describe('getPercentileLabel', () => {
  it('returns the configured percentile label', () => {
    // Default config is P95
    expect(getPercentileLabel()).toBe('P95');
  });
});

// ============================================================================
// getAggregationLabel
// ============================================================================
describe('getAggregationLabel', () => {
  it('returns a label for the configured aggregation method', () => {
    const label = getAggregationLabel();
    // Default is 'percentile' which maps to getPercentileLabel()
    expect(label).toBe('P95');
  });
});

// ============================================================================
// aggregateResponseTimes
// ============================================================================
describe('aggregateResponseTimes', () => {
  const times = [100, 200, 300, 400, 500];

  it('returns 0 for empty array', () => {
    expect(aggregateResponseTimes([])).toBe(0);
  });

  it('calculates max correctly', () => {
    expect(aggregateResponseTimes(times, 'max')).toBe(500);
  });

  it('calculates min correctly', () => {
    expect(aggregateResponseTimes(times, 'min')).toBe(100);
  });

  it('calculates avg correctly', () => {
    expect(aggregateResponseTimes(times, 'avg')).toBe(300);
  });

  it('calculates percentile correctly', () => {
    const result = aggregateResponseTimes(times, 'percentile');
    // P95 of [100,200,300,400,500]: index = floor(5 * 0.95) = 4 → 500
    expect(result).toBe(500);
  });

  it('handles single element array', () => {
    expect(aggregateResponseTimes([42], 'max')).toBe(42);
    expect(aggregateResponseTimes([42], 'min')).toBe(42);
    expect(aggregateResponseTimes([42], 'avg')).toBe(42);
    expect(aggregateResponseTimes([42], 'percentile')).toBe(42);
  });

  it('handles identical values', () => {
    const same = [100, 100, 100, 100];
    expect(aggregateResponseTimes(same, 'max')).toBe(100);
    expect(aggregateResponseTimes(same, 'avg')).toBe(100);
    expect(aggregateResponseTimes(same, 'percentile')).toBe(100);
  });

  it('handles unsorted input', () => {
    const unsorted = [500, 100, 300, 200, 400];
    expect(aggregateResponseTimes(unsorted, 'min')).toBe(100);
    expect(aggregateResponseTimes(unsorted, 'max')).toBe(500);
  });

  it('handles negative response times without crashing', () => {
    // Shouldn't happen in practice but shouldn't crash
    expect(aggregateResponseTimes([-10, -5, 0, 5, 10], 'avg')).toBe(0);
    expect(aggregateResponseTimes([-10, -5, 0, 5, 10], 'min')).toBe(-10);
  });

  it('handles very large values', () => {
    const large = [Number.MAX_SAFE_INTEGER, 1];
    expect(aggregateResponseTimes(large, 'max')).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// ============================================================================
// calculateWatchStatus / calculateWatchStatusWithDetails
// ============================================================================
describe('calculateWatchStatus', () => {
  // --- Grey: no data ---
  describe('grey (no data)', () => {
    it('returns grey when summary is undefined', () => {
      expect(calculateWatchStatus(undefined, undefined)).toBe('grey');
    });

    it('returns grey when summary is undefined but history is provided', () => {
      expect(calculateWatchStatus(undefined, makeHistory([100]))).toBe('grey');
    });

    it('returns grey when record count is 0', () => {
      const summary = makeSummary({ histroyRecordCount: 0 });
      expect(calculateWatchStatus(summary, [])).toBe('grey');
    });
  });

  // --- Green: healthy ---
  describe('green (healthy)', () => {
    it('returns green for all 2xx and low latency', () => {
      const summary = makeSummary({ statusSummary: { 200: 10 } });
      const history = makeHistory([100, 150, 200, 120, 130, 110, 140, 160, 180, 190]);
      expect(calculateWatchStatus(summary, history)).toBe('green');
    });

    it('returns green for 201/204 status codes', () => {
      const summary = makeSummary({ statusSummary: { 201: 5, 204: 5 } });
      const history = makeHistory([50, 60, 70, 80, 90, 100, 110, 120, 130, 140]);
      expect(calculateWatchStatus(summary, history)).toBe('green');
    });
  });

  // --- Yellow: warning latency ---
  describe('yellow (warning latency)', () => {
    it('returns yellow when P95 exceeds warning threshold but not critical', () => {
      // warningLatencyMs is 1200, criticalLatencyMs is 3000
      // Need P95 >= 1200 and < 3000
      const times = Array(20).fill(100);
      times[19] = 1500; // Push P95 above 1200
      const summary = makeSummary({
        histroyRecordCount: 20,
        statusSummary: { 200: 20 },
      });
      expect(calculateWatchStatus(summary, makeHistory(times))).toBe('yellow');
    });
  });

  // --- Yellow: mixed status codes ---
  describe('yellow (mixed status codes)', () => {
    it('returns yellow for mix of 2xx and 3xx', () => {
      const summary = makeSummary({
        statusSummary: { 200: 8, 301: 2 },
      });
      const history = makeHistory([100, 100, 100, 100, 100, 100, 100, 100, 100, 100]);
      expect(calculateWatchStatus(summary, history)).toBe('yellow');
    });
  });

  // --- Red: error responses ---
  describe('red (error responses)', () => {
    it('returns red for 500 status codes', () => {
      const summary = makeSummary({ statusSummary: { 500: 10 } });
      const history = makeHistory([100], 500);
      expect(calculateWatchStatus(summary, history)).toBe('red');
    });

    it('returns red for 404 status codes', () => {
      const summary = makeSummary({ statusSummary: { 404: 5 } });
      const history = makeHistory([100], 404);
      expect(calculateWatchStatus(summary, history)).toBe('red');
    });

    it('returns red for status code 0 (connection failure)', () => {
      const summary = makeSummary({ statusSummary: { 0: 3 } });
      const history = makeHistory([0], 0);
      expect(calculateWatchStatus(summary, history)).toBe('red');
    });

    it('returns red for mix of 200 and 500 (failed responses present)', () => {
      const summary = makeSummary({ statusSummary: { 200: 8, 500: 2 } });
      const history = makeHistory([100, 100, 100, 100, 100, 100, 100, 100, 100, 100]);
      expect(calculateWatchStatus(summary, history)).toBe('red');
    });
  });

  // --- Red: critical latency ---
  describe('red (critical latency)', () => {
    it('returns red when P95 exceeds critical threshold', () => {
      // criticalLatencyMs is 3000
      const times = Array(20).fill(100);
      times[19] = 5000; // Push P95 above 3000
      const summary = makeSummary({
        histroyRecordCount: 20,
        statusSummary: { 200: 20 },
      });
      expect(calculateWatchStatus(summary, makeHistory(times))).toBe('red');
    });
  });

  // --- Status code overrides ---
  describe('status code overrides', () => {
    it('treats 429 as green (configured in greenStatusCodes)', () => {
      // 429 is in greenStatusCodes config, so it should override the default 4xx=red behavior
      const summary = makeSummary({ statusSummary: { 429: 10 } });
      const history = makeHistory([100, 100, 100, 100, 100]);
      expect(calculateWatchStatus(summary, history)).toBe('green');
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    it('handles empty history array with valid summary', () => {
      const summary = makeSummary({
        histroyRecordCount: 10,
        statusSummary: { 200: 10 },
        responseTime: { min: 50, max: 100, avg: 75 },
      });
      // When history is empty, falls back to summary.responseTime.avg for percentile
      expect(calculateWatchStatus(summary, [])).toBe('green');
    });

    it('handles undefined history with valid summary', () => {
      const summary = makeSummary({
        histroyRecordCount: 10,
        statusSummary: { 200: 10 },
        responseTime: { min: 50, max: 100, avg: 75 },
      });
      expect(calculateWatchStatus(summary, undefined)).toBe('green');
    });

    it('handles summary with very large record count', () => {
      const summary = makeSummary({
        histroyRecordCount: 1_000_000,
        statusSummary: { 200: 1_000_000 },
      });
      expect(calculateWatchStatus(summary, makeHistory([100]))).toBe('green');
    });
  });
});

// ============================================================================
// calculateWatchStatusWithDetails - verify reason strings
// ============================================================================
describe('calculateWatchStatusWithDetails', () => {
  it('provides "No data" reason for grey', () => {
    const result = calculateWatchStatusWithDetails(undefined, undefined);
    expect(result.status).toBe('grey');
    expect(result.p95).toBeNull();
    expect(result.reason).toBe('No data');
  });

  it('provides error code reason for red (error responses)', () => {
    const summary = makeSummary({ statusSummary: { 503: 5 } });
    const history = makeHistory([100], 503);
    const result = calculateWatchStatusWithDetails(summary, history);
    expect(result.status).toBe('red');
    expect(result.reason).toContain('503');
  });

  it('provides latency reason for yellow', () => {
    const times = Array(20).fill(100);
    times[19] = 1500;
    const summary = makeSummary({
      histroyRecordCount: 20,
      statusSummary: { 200: 20 },
    });
    const result = calculateWatchStatusWithDetails(summary, makeHistory(times));
    expect(result.status).toBe('yellow');
    expect(result.reason).toContain('P95');
    expect(result.reason).toContain('ms');
  });

  it('provides latency reason for green', () => {
    const summary = makeSummary({ statusSummary: { 200: 10 } });
    const history = makeHistory([100, 100, 100, 100, 100]);
    const result = calculateWatchStatusWithDetails(summary, history);
    expect(result.status).toBe('green');
    expect(result.reason).toContain('P95');
    expect(result.p95).toBeGreaterThan(0);
  });

  it('provides override reason for status code overrides', () => {
    const summary = makeSummary({ statusSummary: { 429: 5 } });
    const history = makeHistory([100, 100, 100, 100, 100]);
    const result = calculateWatchStatusWithDetails(summary, history);
    expect(result.status).toBe('green');
    expect(result.reason).toContain('override');
  });
});

// ============================================================================
// Priority ordering tests
// ============================================================================
describe('status priority ordering', () => {
  it('status code overrides take priority over error response detection', () => {
    // 429 is green override, but also >= 400 which would normally be red
    const summary = makeSummary({ statusSummary: { 429: 10 } });
    const history = makeHistory([100]);
    expect(calculateWatchStatus(summary, history)).toBe('green');
  });

  it('error responses take priority over latency checks', () => {
    // Even with low latency, 500 should be red
    const summary = makeSummary({ statusSummary: { 200: 5, 500: 1 } });
    const history = makeHistory([50, 50, 50, 50, 50, 50]);
    expect(calculateWatchStatus(summary, history)).toBe('red');
  });

  it('critical latency takes priority over mixed status codes', () => {
    // High latency + mixed codes → red (latency checked before mixed)
    const times = Array(20).fill(5000);
    const summary = makeSummary({
      histroyRecordCount: 20,
      statusSummary: { 200: 18, 301: 2 },
    });
    expect(calculateWatchStatus(summary, makeHistory(times))).toBe('red');
  });

  it('warning latency takes priority over mixed status codes', () => {
    const times = Array(20).fill(1500);
    const summary = makeSummary({
      histroyRecordCount: 20,
      statusSummary: { 200: 18, 301: 2 },
    });
    expect(calculateWatchStatus(summary, makeHistory(times))).toBe('yellow');
  });
});

// ============================================================================
// calculateGlobalStatus
// ============================================================================
describe('calculateGlobalStatus', () => {
  it('returns grey for empty array', () => {
    expect(calculateGlobalStatus([])).toBe('grey');
  });

  it('returns red if any status is red', () => {
    expect(calculateGlobalStatus(['green', 'yellow', 'red'])).toBe('red');
  });

  it('returns yellow if worst is yellow', () => {
    expect(calculateGlobalStatus(['green', 'yellow', 'green'])).toBe('yellow');
  });

  it('returns green if all green', () => {
    expect(calculateGlobalStatus(['green', 'green', 'green'])).toBe('green');
  });

  it('returns grey if all grey', () => {
    expect(calculateGlobalStatus(['grey', 'grey'])).toBe('grey');
  });

  it('returns green if mix of green and grey', () => {
    expect(calculateGlobalStatus(['green', 'grey'])).toBe('green');
  });

  it('returns red even with single red among many greens', () => {
    const statuses: StoplightStatus[] = Array(100).fill('green');
    statuses[50] = 'red';
    expect(calculateGlobalStatus(statuses)).toBe('red');
  });
});

// ============================================================================
// getStatusCounts
// ============================================================================
describe('getStatusCounts', () => {
  it('counts empty array correctly', () => {
    expect(getStatusCounts([])).toEqual({ green: 0, yellow: 0, red: 0, grey: 0 });
  });

  it('counts mixed statuses correctly', () => {
    const statuses: StoplightStatus[] = ['green', 'green', 'red', 'yellow', 'grey', 'green'];
    expect(getStatusCounts(statuses)).toEqual({ green: 3, yellow: 1, red: 1, grey: 1 });
  });

  it('counts all same status', () => {
    expect(getStatusCounts(['red', 'red', 'red'])).toEqual({ green: 0, yellow: 0, red: 3, grey: 0 });
  });
});

// ============================================================================
// Boundary value tests for latency thresholds
// ============================================================================
describe('latency threshold boundaries', () => {
  // warningLatencyMs = 1200, criticalLatencyMs = 3000

  it('P95 at exactly warningLatencyMs (1200) → yellow', () => {
    // Build array where P95 = exactly 1200
    const times = Array(100).fill(100);
    times[95] = 1200;
    times[96] = 1200;
    times[97] = 1200;
    times[98] = 1200;
    times[99] = 1200;
    const summary = makeSummary({
      histroyRecordCount: 100,
      statusSummary: { 200: 100 },
    });
    const result = calculateWatchStatusWithDetails(summary, makeHistory(times));
    expect(result.status).toBe('yellow');
  });

  it('P95 at exactly criticalLatencyMs (3000) → red', () => {
    const times = Array(100).fill(100);
    times[95] = 3000;
    times[96] = 3000;
    times[97] = 3000;
    times[98] = 3000;
    times[99] = 3000;
    const summary = makeSummary({
      histroyRecordCount: 100,
      statusSummary: { 200: 100 },
    });
    const result = calculateWatchStatusWithDetails(summary, makeHistory(times));
    expect(result.status).toBe('red');
  });

  it('P95 just below warningLatencyMs → green', () => {
    const times = Array(100).fill(100);
    times[99] = 1199;
    const summary = makeSummary({
      histroyRecordCount: 100,
      statusSummary: { 200: 100 },
    });
    const result = calculateWatchStatusWithDetails(summary, makeHistory(times));
    expect(result.status).toBe('green');
  });

  it('P95 just below criticalLatencyMs → yellow', () => {
    const times = Array(100).fill(2999);
    const summary = makeSummary({
      histroyRecordCount: 100,
      statusSummary: { 200: 100 },
    });
    const result = calculateWatchStatusWithDetails(summary, makeHistory(times));
    expect(result.status).toBe('yellow');
  });
});
