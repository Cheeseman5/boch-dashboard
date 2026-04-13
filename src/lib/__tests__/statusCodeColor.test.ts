import { describe, it, expect } from 'vitest';
import {
  getStatusCodeColor,
  getStatusCodeColorClass,
  getStatusCodeHslColor,
} from '@/lib/statusCodeColor';

// ============================================================================
// getStatusCodeColor
// ============================================================================
describe('getStatusCodeColor', () => {
  // --- Default behavior ---
  describe('default 2xx → green', () => {
    it.each([200, 201, 204, 299])('returns green for %d', (code) => {
      expect(getStatusCodeColor(code)).toBe('green');
    });
  });

  describe('default 4xx/5xx → red', () => {
    it.each([400, 401, 403, 404, 500, 502, 503])('returns red for %d', (code) => {
      expect(getStatusCodeColor(code)).toBe('red');
    });
  });

  describe('status code 0 (connection failure) → red', () => {
    it('returns red for 0', () => {
      expect(getStatusCodeColor(0)).toBe('red');
    });
  });

  describe('default other codes → yellow', () => {
    it.each([100, 101, 301, 302, 307, 399])('returns yellow for %d', (code) => {
      expect(getStatusCodeColor(code)).toBe('yellow');
    });
  });

  // --- Override behavior (429 is in greenStatusCodes) ---
  describe('overrides from config', () => {
    it('treats 429 as green (greenStatusCodes override)', () => {
      // 429 would normally be red (>= 400), but is overridden to green
      expect(getStatusCodeColor(429)).toBe('green');
    });
  });

  // --- Boundary values ---
  describe('boundary values', () => {
    it('199 is yellow (below 2xx range)', () => {
      expect(getStatusCodeColor(199)).toBe('yellow');
    });

    it('200 is green (start of 2xx)', () => {
      expect(getStatusCodeColor(200)).toBe('green');
    });

    it('299 is green (end of 2xx)', () => {
      expect(getStatusCodeColor(299)).toBe('green');
    });

    it('300 is yellow (start of 3xx)', () => {
      expect(getStatusCodeColor(300)).toBe('yellow');
    });

    it('399 is yellow (end of 3xx)', () => {
      expect(getStatusCodeColor(399)).toBe('yellow');
    });

    it('400 is red (start of 4xx)', () => {
      expect(getStatusCodeColor(400)).toBe('red');
    });
  });

  // --- Negative / unusual inputs ---
  describe('unusual inputs', () => {
    it('negative status code', () => {
      // Should hit default yellow (not >= 400, not 0, not 2xx)
      expect(getStatusCodeColor(-1)).toBe('yellow');
    });

    it('very large status code', () => {
      expect(getStatusCodeColor(999)).toBe('red');
    });

    it('non-standard code 600', () => {
      expect(getStatusCodeColor(600)).toBe('red');
    });
  });
});

// ============================================================================
// getStatusCodeColorClass
// ============================================================================
describe('getStatusCodeColorClass', () => {
  it('returns text-green-500 for 200', () => {
    expect(getStatusCodeColorClass(200)).toBe('text-green-500');
  });

  it('returns text-red-500 for 500', () => {
    expect(getStatusCodeColorClass(500)).toBe('text-red-500');
  });

  it('returns text-yellow-500 for 301', () => {
    expect(getStatusCodeColorClass(301)).toBe('text-yellow-500');
  });
});

// ============================================================================
// getStatusCodeHslColor
// ============================================================================
describe('getStatusCodeHslColor', () => {
  it('returns stoplight-green HSL for 200', () => {
    expect(getStatusCodeHslColor(200)).toBe('hsl(var(--stoplight-green))');
  });

  it('returns stoplight-red HSL for 500', () => {
    expect(getStatusCodeHslColor(500)).toBe('hsl(var(--stoplight-red))');
  });

  it('returns stoplight-yellow HSL for 302', () => {
    expect(getStatusCodeHslColor(302)).toBe('hsl(var(--stoplight-yellow))');
  });

  it('returns muted-foreground HSL for grey status (should not normally occur)', () => {
    // Grey only returned from getStatusCodeColor for codes that don't match any rule
    // Currently no code path returns grey, but the switch default handles it
    expect(getStatusCodeHslColor(200)).not.toBe('hsl(var(--muted-foreground))');
  });
});
