import type {
  Watch,
  AddWatchRequest,
  UpdateWatchRequest,
  HistoryRaw,
  HistorySummaryResponse,
} from '@/types/api';

export interface HistoryResponseRaw {
  watchName: string;
  records: HistoryRaw[];
}

const BASE_URL = 'https://boch.p.rapidapi.com';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function encodePathSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Missing watch name');
  return encodeURIComponent(trimmed);
}

async function apiRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  if (import.meta.env.DEV) {
    // Never log API keys; endpoint is enough to confirm what watch name is being requested.
    console.debug('[boch] request', endpoint);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'boch.p.rapidapi.com',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Request failed');
    throw new ApiError(response.status, message);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text);
}

export async function getWatches(apiKey: string): Promise<Watch[]> {
  return apiRequest<Watch[]>('/api/watch', apiKey);
}

export async function addWatch(apiKey: string, data: AddWatchRequest): Promise<void> {
  await apiRequest('/api/watch', apiKey, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWatch(
  apiKey: string,
  watchName: string,
  data: UpdateWatchRequest
): Promise<void> {
  await apiRequest(`/api/watch/${encodePathSegment(watchName)}`, apiKey, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteWatch(apiKey: string, watchName: string): Promise<void> {
  await apiRequest(`/api/watches/${encodePathSegment(watchName)}`, apiKey, {
    method: 'DELETE',
  });
}

export async function getHistory(
  apiKey: string,
  watchName: string
): Promise<HistoryResponseRaw> {
  return apiRequest<HistoryResponseRaw>(
    `/api/history/${encodePathSegment(watchName)}`,
    apiKey
  );
}

export async function getHistorySummary(
  apiKey: string,
  watchName: string
): Promise<HistorySummaryResponse> {
  return apiRequest<HistorySummaryResponse>(
    `/api/history/${encodePathSegment(watchName)}/summary`,
    apiKey
  );
}

export { ApiError };
