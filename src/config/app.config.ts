/**
 * Application Configuration
 *
 * This file centralizes key settings that are commonly customized.
 * New developers can modify these values without diving into component code.
 */

// ============================================================================
// HISTORY FILTER OPTIONS
// ============================================================================
// Controls the dropdown options for filtering watch history records.
// - value: The filter value (number = last N records, 'all' = show all)
// - label: Display text shown in the dropdown

export const HISTORY_FILTER_OPTIONS = [
  { value: 30, label: "30" },
  { value: 90, label: "90" },
  { value: 180, label: "180" },
  { value: 400, label: "400" },
  { value: 1000, label: "1000" },
  { value: 5000, label: "5000" },
  { value: "all", label: "All" },
] as const;

// Type derived from the options array above (single source of truth)
export type HistoryFilter = (typeof HISTORY_FILTER_OPTIONS)[number]["value"];

// Default filter applied to new watches
export const DEFAULT_HISTORY_FILTER: HistoryFilter = 30;

// ============================================================================
// STOPLIGHT THRESHOLDS
// ============================================================================
// Controls when watch status changes color based on percentile response time.

/**
 * Percentile algorithm for latency calculations.
 * Any value from 1-100 is valid. Common values:
 * - 95: P95 (95th percentile) - balanced view, filters top 5% outliers
 * - 98: P98 (98th percentile) - stricter, only filters top 2% outliers
 * - 99: P99 (99th percentile) - strictest, catches near-worst-case latency
 * - 90: P90 (90th percentile) - more lenient, filters top 10% outliers
 * - 50: P50 (median) - typical user experience
 */
export type PercentileValue = number;

/**
 * Graph aggregation method for bucket calculations.
 * Determines how each bucket's data point is calculated:
 * - 'max': Use the maximum response time in the bucket
 * - 'min': Use the minimum response time in the bucket
 * - 'avg': Use the average response time in the bucket
 * - 'percentile': Use the configured percentile value (from STOPLIGHT_THRESHOLDS.percentile)
 */
export type GraphAggregationMethod = "max" | "min" | "avg" | "percentile";

/**
 * Data scope for watch-level calculations.
 * Used by both stoplight status and summary metrics to determine their data source.
 * - 'total': Always use the complete dataset (all history records for the watch)
 * - 'filtered': Use only the currently filtered/viewed dataset (respects history dropdown)
 */
export type WatchDataScope = "total" | "filtered";

/** @deprecated Use WatchDataScope instead */
export type SummaryMetricsScope = WatchDataScope;
export const STOPLIGHT_THRESHOLDS = {
  /** Which percentile to use for latency calculations (e.g., 95 = P95). Any value 1-100. */
  percentile: 95 as PercentileValue,

  /** Percentile response time (ms) that triggers RED status */
  criticalLatencyMs: 3000,

  /** Percentile response time (ms) that triggers YELLOW status */
  warningLatencyMs: 1000,

  /** How to aggregate response times for each graph bucket */
  graphAggregation: "percentile" as GraphAggregationMethod,

  /**
   * Data scope for watch-level STOPLIGHT STATUS (the colored indicator).
   * - 'total': Status reflects the entire watch history (default behavior)
   * - 'filtered': Status reflects only the currently viewed/filtered records
   */
  watchStatusScope: "total" as WatchDataScope,

  /**
   * Data scope for watch-level SUMMARY METRICS (Min, Avg, Max values).
   * - 'total': Metrics reflect the entire watch history
   * - 'filtered': Metrics reflect only the currently viewed/filtered records
   */
  summaryMetricsScope: "total" as WatchDataScope,

  /**
   * Status code overrides: Force specific HTTP status codes to be treated as a particular status.
   * Priority order: red > yellow > green (red overrides yellow/green, yellow overrides green).
   * Any status code in these lists will bypass normal latency-based status calculation.
   * Example: redStatusCodes: [500, 502, 503] forces those codes to always show red.
   */
  redStatusCodes: [] as number[],
  yellowStatusCodes: [429] as number[],
  greenStatusCodes: [] as number[],
} as const;

// ============================================================================
// GLOBAL SUMMARY BEHAVIOR
// ============================================================================
// Controls how the global health status section behaves.

/**
 * Global status scope: determines which data drives the global status
 * - 'default': Uses all data from watches (not affected by per-card filters)
 * - 'filtered': Global status changes to match the currently viewed/filtered state
 */
export type GlobalStatusScope = "default" | "filtered";

/**
 * Inactive watch inclusion: determines if inactive watches count in global summary
 * - 'always': Always include inactive watches in global health
 * - 'never': Never include inactive watches in global health
 * - 'dynamic': Only include inactive watches if showInactive toggle is enabled
 */
export type InactiveWatchInclusion = "always" | "never" | "dynamic";

export const GLOBAL_SUMMARY_SETTINGS = {
  /** Which data scope to use for global status calculation */
  statusScope: "default" as GlobalStatusScope,

  /** How to handle inactive watches in global health counts */
  inactiveWatchInclusion: "never" as InactiveWatchInclusion,
} as const;

// ============================================================================
// STOPLIGHT ANIMATION SETTINGS
// ============================================================================
// Controls the pulsing/strobing animation on stoplights.

/**
 * Stoplight strobe scope: determines which stoplights animate
 * - 'all': Both watch stoplights and global stoplight strobe
 * - 'watches': Only individual watch stoplights strobe
 * - 'global': Only the global health stoplight strobes
 * - 'none': No strobing animations
 */
export type StoplightStrobeScope = "all" | "watches" | "summary" | "none";

export const STOPLIGHT_ANIMATION_SETTINGS = {
  /** Which stoplights should strobe/pulse */
  strobeScope: "all" as StoplightStrobeScope,

  /** Animation speed in seconds (lower = faster) */
  strobeSpeedSeconds: 0.5,

  /** Which status states should strobe (true = strobe enabled) */
  strobeStates: {
    red: true,
    yellow: true,
    green: false,
    grey: false,
  },
} as const;
