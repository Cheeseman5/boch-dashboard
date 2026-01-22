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
  { value: 360, label: "360" },
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
