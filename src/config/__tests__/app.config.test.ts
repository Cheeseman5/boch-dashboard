import { describe, it, expect } from 'vitest';
import {
  isHourFilter,
  parseFilterToMinutes,
  parseHourFilter,
  HISTORY_FILTER_OPTIONS,
  HISTORY_FILTER_HOURS_OPTIONS,
  HISTORY_FILTER_COUNT_OPTIONS,
  DEFAULT_HISTORY_FILTER,
  STOPLIGHT_THRESHOLDS,
  GLOBAL_SUMMARY_SETTINGS,
  STOPLIGHT_ANIMATION_SETTINGS,
  type HistoryFilter,
} from '@/config/app.config';

// ============================================================================
// isHourFilter
// ============================================================================
describe('isHourFilter', () => {
  describe('valid hour filters', () => {
    it.each(['1H', '3H', '12H', '24H', '0.5H', '1.5H'])(
      'returns true for "%s"',
      (filter) => {
        expect(isHourFilter(filter)).toBe(true);
      }
    );
  });

  describe('valid minute filters', () => {
    it.each(['30M', '90M', '5M', '0.5M'])(
      'returns true for "%s"',
      (filter) => {
        expect(isHourFilter(filter)).toBe(true);
      }
    );
  });

  describe('case sensitivity', () => {
    it('accepts lowercase h', () => {
      expect(isHourFilter('1h')).toBe(true);
    });
    it('accepts lowercase m', () => {
      expect(isHourFilter('30m')).toBe(true);
    });
  });

  describe('invalid filters', () => {
    it('returns false for "all"', () => {
      expect(isHourFilter('all')).toBe(false);
    });
    it('returns false for numeric values', () => {
      expect(isHourFilter(100 as any)).toBe(false);
    });
    it('returns false for empty string', () => {
      expect(isHourFilter('')).toBe(false);
    });
    it('returns false for just a letter', () => {
      expect(isHourFilter('H')).toBe(false);
    });
    it('returns false for no suffix', () => {
      expect(isHourFilter('24')).toBe(false);
    });
    it('returns false for invalid suffix', () => {
      expect(isHourFilter('24X')).toBe(false);
    });
    it('returns false for letters before number', () => {
      expect(isHourFilter('abc3H')).toBe(false);
    });
  });
});

// ============================================================================
// parseFilterToMinutes
// ============================================================================
describe('parseFilterToMinutes', () => {
  it('parses hours correctly', () => {
    expect(parseFilterToMinutes('1H')).toBe(60);
    expect(parseFilterToMinutes('24H')).toBe(1440);
    expect(parseFilterToMinutes('0.5H')).toBe(30);
  });

  it('parses minutes correctly', () => {
    expect(parseFilterToMinutes('30M')).toBe(30);
    expect(parseFilterToMinutes('90M')).toBe(90);
  });

  it('handles lowercase', () => {
    expect(parseFilterToMinutes('1h')).toBe(60);
    expect(parseFilterToMinutes('30m')).toBe(30);
  });

  it('handles fractional hours', () => {
    expect(parseFilterToMinutes('1.5H')).toBe(90);
  });

  it('handles zero', () => {
    expect(parseFilterToMinutes('0H')).toBe(0);
    expect(parseFilterToMinutes('0M')).toBe(0);
  });
});

// ============================================================================
// parseHourFilter (backward compat wrapper)
// ============================================================================
describe('parseHourFilter', () => {
  it('returns hours from hour filter', () => {
    expect(parseHourFilter('24H')).toBe(24);
    expect(parseHourFilter('1H')).toBe(1);
  });

  it('returns fractional hours from minute filter', () => {
    expect(parseHourFilter('30M')).toBe(0.5);
    expect(parseHourFilter('90M')).toBe(1.5);
  });
});

// ============================================================================
// HISTORY_FILTER_OPTIONS consistency
// ============================================================================
describe('HISTORY_FILTER_OPTIONS', () => {
  it('always starts with "all" option', () => {
    expect(HISTORY_FILTER_OPTIONS[0]).toEqual({ value: 'all', label: 'All' });
  });

  it('has no null/undefined entries', () => {
    HISTORY_FILTER_OPTIONS.forEach((opt) => {
      expect(opt).toBeDefined();
      expect(opt.value).toBeDefined();
      expect(opt.label).toBeDefined();
    });
  });

  it('includes all hour options', () => {
    HISTORY_FILTER_HOURS_OPTIONS.forEach((hourOpt) => {
      expect(HISTORY_FILTER_OPTIONS.some((o) => o.value === hourOpt.value)).toBe(true);
    });
  });

  it('has unique values', () => {
    const values = HISTORY_FILTER_OPTIONS.map((o) => o.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('has unique labels', () => {
    const labels = HISTORY_FILTER_OPTIONS.map((o) => o.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});

// ============================================================================
// DEFAULT_HISTORY_FILTER
// ============================================================================
describe('DEFAULT_HISTORY_FILTER', () => {
  it('is a valid filter option', () => {
    const validValues = HISTORY_FILTER_OPTIONS.map((o) => o.value);
    expect(validValues).toContain(DEFAULT_HISTORY_FILTER);
  });
});

// ============================================================================
// STOPLIGHT_THRESHOLDS sanity
// ============================================================================
describe('STOPLIGHT_THRESHOLDS', () => {
  it('warning < critical latency', () => {
    expect(STOPLIGHT_THRESHOLDS.warningLatencyMs).toBeLessThan(
      STOPLIGHT_THRESHOLDS.criticalLatencyMs
    );
  });

  it('warning latency is positive', () => {
    expect(STOPLIGHT_THRESHOLDS.warningLatencyMs).toBeGreaterThan(0);
  });

  it('percentile is between 1 and 100', () => {
    expect(STOPLIGHT_THRESHOLDS.percentile).toBeGreaterThanOrEqual(1);
    expect(STOPLIGHT_THRESHOLDS.percentile).toBeLessThanOrEqual(100);
  });

  it('graphAggregation is a valid method', () => {
    expect(['max', 'min', 'avg', 'percentile']).toContain(
      STOPLIGHT_THRESHOLDS.graphAggregation
    );
  });

  it('watchStatusScope is valid', () => {
    expect(['total', 'filtered']).toContain(STOPLIGHT_THRESHOLDS.watchStatusScope);
  });

  it('summaryMetricsScope is valid', () => {
    expect(['total', 'filtered']).toContain(STOPLIGHT_THRESHOLDS.summaryMetricsScope);
  });

  it('status code override arrays do not overlap', () => {
    const red = new Set(STOPLIGHT_THRESHOLDS.redStatusCodes);
    const yellow = new Set(STOPLIGHT_THRESHOLDS.yellowStatusCodes);
    const green = new Set(STOPLIGHT_THRESHOLDS.greenStatusCodes);

    // No code should be in multiple lists
    for (const code of red) {
      expect(yellow.has(code)).toBe(false);
      expect(green.has(code)).toBe(false);
    }
    for (const code of yellow) {
      expect(green.has(code)).toBe(false);
    }
  });
});

// ============================================================================
// GLOBAL_SUMMARY_SETTINGS sanity
// ============================================================================
describe('GLOBAL_SUMMARY_SETTINGS', () => {
  it('statusScope is valid', () => {
    expect(['default', 'filtered']).toContain(GLOBAL_SUMMARY_SETTINGS.statusScope);
  });

  it('inactiveWatchInclusion is valid', () => {
    expect(['always', 'never', 'dynamic']).toContain(
      GLOBAL_SUMMARY_SETTINGS.inactiveWatchInclusion
    );
  });
});

// ============================================================================
// STOPLIGHT_ANIMATION_SETTINGS sanity
// ============================================================================
describe('STOPLIGHT_ANIMATION_SETTINGS', () => {
  it('strobeScope is valid', () => {
    expect(['all', 'watches', 'summary', 'none']).toContain(
      STOPLIGHT_ANIMATION_SETTINGS.strobeScope
    );
  });

  it('strobeSpeedSeconds is positive', () => {
    expect(STOPLIGHT_ANIMATION_SETTINGS.strobeSpeedSeconds).toBeGreaterThan(0);
  });

  it('strobeStates has all four status keys', () => {
    expect(STOPLIGHT_ANIMATION_SETTINGS.strobeStates).toHaveProperty('red');
    expect(STOPLIGHT_ANIMATION_SETTINGS.strobeStates).toHaveProperty('yellow');
    expect(STOPLIGHT_ANIMATION_SETTINGS.strobeStates).toHaveProperty('green');
    expect(STOPLIGHT_ANIMATION_SETTINGS.strobeStates).toHaveProperty('grey');
  });
});
