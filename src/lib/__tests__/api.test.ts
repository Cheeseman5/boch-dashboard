import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the module's internal logic, so we import everything
// and mock fetch globally
import { ApiError } from '@/lib/api';

// ============================================================================
// ApiError
// ============================================================================
describe('ApiError', () => {
  it('extends Error', () => {
    const err = new ApiError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('has correct name', () => {
    const err = new ApiError(500, 'Server error');
    expect(err.name).toBe('ApiError');
  });

  it('stores status and message', () => {
    const err = new ApiError(403, 'Forbidden');
    expect(err.status).toBe(403);
    expect(err.message).toBe('Forbidden');
  });
});

// ============================================================================
// API functions with mocked fetch
// ============================================================================
describe('API functions', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(response: { ok: boolean; status?: number; body?: any; text?: string }) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      text: vi.fn().mockResolvedValue(
        response.text ?? (response.body ? JSON.stringify(response.body) : '')
      ),
      json: vi.fn().mockResolvedValue(response.body),
    });
  }

  describe('getWatches', () => {
    it('calls correct endpoint with key header', async () => {
      mockFetch({ ok: true, body: [{ name: 'test' }] });
      const { getWatches } = await import('@/lib/api');
      const result = await getWatches('test-key');
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://boch.p.rapidapi.com/api/watch',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-RapidAPI-Key': 'test-key',
          }),
        })
      );
      expect(result).toEqual([{ name: 'test' }]);
    });

    it('uses X-RapidAPI-User header when headerType is "user"', async () => {
      mockFetch({ ok: true, body: [] });
      const { getWatches } = await import('@/lib/api');
      await getWatches('test-user', 'user');
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-RapidAPI-User': 'test-user',
          }),
        })
      );
    });

    it('throws ApiError on non-OK response', async () => {
      mockFetch({ ok: false, status: 401, text: 'Unauthorized' });
      const { getWatches } = await import('@/lib/api');
      
      await expect(getWatches('bad-key')).rejects.toThrow(ApiError);
      await expect(getWatches('bad-key')).rejects.toThrow();
    });
  });

  describe('deleteWatch', () => {
    it('encodes watch name in URL', async () => {
      mockFetch({ ok: true, body: {} });
      const { deleteWatch } = await import('@/lib/api');
      await deleteWatch('test-key', 'my watch/name');
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('my%20watch%2Fname'),
        expect.any(Object)
      );
    });

    it('throws on empty watch name', async () => {
      const { deleteWatch } = await import('@/lib/api');
      await expect(deleteWatch('key', '')).rejects.toThrow('Missing watch name');
      await expect(deleteWatch('key', '   ')).rejects.toThrow('Missing watch name');
    });
  });

  describe('updateWatch', () => {
    it('sends PUT with correct body', async () => {
      mockFetch({ ok: true, body: {} });
      const { updateWatch } = await import('@/lib/api');
      await updateWatch('key', 'test-watch', { active: false });
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/watch/test-watch'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ active: false }),
        })
      );
    });
  });

  describe('addWatch', () => {
    it('sends POST with correct body', async () => {
      mockFetch({ ok: true, body: {} });
      const { addWatch } = await import('@/lib/api');
      await addWatch('key', { name: 'new', fullUrl: 'https://example.com', intervalMinutes: 5 });
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/watch'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('API key sanitization', () => {
    it('strips non-ISO-8859-1 characters from API key', async () => {
      mockFetch({ ok: true, body: [] });
      const { getWatches } = await import('@/lib/api');
      // Key with invisible unicode characters
      await getWatches('test\u200Bkey\u2060');
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-RapidAPI-Key': 'testkey', // Unicode stripped
          }),
        })
      );
    });
  });

  describe('empty response handling', () => {
    it('returns empty object for empty response body', async () => {
      mockFetch({ ok: true, text: '' });
      const { getWatches } = await import('@/lib/api');
      const result = await getWatches('key');
      expect(result).toEqual({});
    });
  });
});
