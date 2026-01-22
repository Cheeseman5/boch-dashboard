/**
 * Application Configuration
 *
 * This file centralizes key settings that are commonly customized.
 * New developers can modify these values without diving into component code.
 */

import type { HistoryFilter } from "@/types/api";

// ============================================================================
// HISTORY FILTER OPTIONS
// ============================================================================
// Controls the dropdown options for filtering watch history records.
// - value: The filter value (number = last N records, 'all' = show all)
// - label: Display text shown in the dropdown

export const HISTORY_FILTER_OPTIONS: { value: HistoryFilter; label: string }[] = [
  { value: 30, label: "30" },
  { value: 90, label: "90" },
  { value: 180, label: "180" },
  { value: "all", label: "All" },
];

// Default filter applied to new watches
export const DEFAULT_HISTORY_FILTER: HistoryFilter = 30;

// ============================================================================
// STOPLIGHT THRESHOLDS
// ============================================================================
// Controls when watch status changes color based on P95 response time (in ms).
// - RED: P95 >= criticalLatencyMs (severe performance issue)
// - YELLOW: P95 >= warningLatencyMs (degraded performance)
// - GREEN: P95 < warningLatencyMs (healthy)

export const STOPLIGHT_THRESHOLDS = {
  /** P95 response time (ms) that triggers RED status */
  criticalLatencyMs: 2000,

  /** P95 response time (ms) that triggers YELLOW status */
  warningLatencyMs: 1000,
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
  statusScope: "filtered" as GlobalStatusScope,

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
export type StoplightStrobeScope = "all" | "watches" | "global" | "none";

export const STOPLIGHT_ANIMATION_SETTINGS = {
  /** Which stoplights should strobe/pulse */
  strobeScope: "all" as StoplightStrobeScope,

  /** Animation speed in seconds (lower = faster) */
  strobeSpeedSeconds: 2,
} as const;
