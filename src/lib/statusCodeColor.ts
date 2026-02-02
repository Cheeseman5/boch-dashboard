import { STOPLIGHT_THRESHOLDS } from '@/config/app.config';
import type { StoplightStatus } from '@/types/api';

/**
 * Determine the interpreted color for a status code based on override lists and defaults.
 * Priority: red > yellow > green > default logic (2xx=green, 4xx/5xx/0=red, else=yellow)
 */
export function getStatusCodeColor(code: number): StoplightStatus {
  // Cast to number[] to handle readonly arrays from `as const`
  const redCodes = STOPLIGHT_THRESHOLDS.redStatusCodes as readonly number[];
  const yellowCodes = STOPLIGHT_THRESHOLDS.yellowStatusCodes as readonly number[];
  const greenCodes = STOPLIGHT_THRESHOLDS.greenStatusCodes as readonly number[];

  // Check overrides in priority order: red > yellow > green
  if (redCodes.includes(code)) return 'red';
  if (yellowCodes.includes(code)) return 'yellow';
  if (greenCodes.includes(code)) return 'green';

  // Default logic
  if (code >= 400 || code === 0) return 'red';
  if (code >= 200 && code < 300) return 'green';
  return 'yellow';
}

/**
 * Get the CSS class for a status code color.
 */
export function getStatusCodeColorClass(code: number): string {
  const status = getStatusCodeColor(code);
  switch (status) {
    case 'red': return 'text-red-500';
    case 'yellow': return 'text-yellow-500';
    case 'green': return 'text-green-500';
    default: return 'text-muted-foreground';
  }
}

/**
 * Get the HSL color string for a status code (for use in charts/SVGs).
 */
export function getStatusCodeHslColor(code: number): string {
  const status = getStatusCodeColor(code);
  switch (status) {
    case 'red': return 'hsl(var(--stoplight-red))';
    case 'yellow': return 'hsl(var(--stoplight-yellow))';
    case 'green': return 'hsl(var(--stoplight-green))';
    default: return 'hsl(var(--muted-foreground))';
  }
}
