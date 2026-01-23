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

export type ApiHeaderType = 'key' | 'user';

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
  options: RequestInit = {},
  headerType: ApiHeaderType = 'key'
): Promise<T> {
  const headerName = headerType === 'user' ? 'X-RapidAPI-User' : 'X-RapidAPI-Key';
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      [headerName]: apiKey,
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

export async function getWatches(apiKey: string, headerType: ApiHeaderType = 'key'): Promise<Watch[]> {
  return apiRequest<Watch[]>('/api/watch', apiKey, {}, headerType);
}

export async function addWatch(apiKey: string, data: AddWatchRequest, headerType: ApiHeaderType = 'key'): Promise<void> {
  await apiRequest('/api/watch', apiKey, {
    method: 'POST',
    body: JSON.stringify(data),
  }, headerType);
}

export async function updateWatch(
  apiKey: string,
  watchName: string,
  data: UpdateWatchRequest,
  headerType: ApiHeaderType = 'key'
): Promise<void> {
  await apiRequest(`/api/watch/${encodePathSegment(watchName)}`, apiKey, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, headerType);
}

export async function deleteWatch(apiKey: string, watchName: string, headerType: ApiHeaderType = 'key'): Promise<void> {
  await apiRequest(`/api/watches/${encodePathSegment(watchName)}`, apiKey, {
    method: 'DELETE',
  }, headerType);
}

export async function getHistory(
  apiKey: string,
  watchName: string,
  headerType: ApiHeaderType = 'key'
): Promise<HistoryResponseRaw> {
  return apiRequest<HistoryResponseRaw>(
    `/api/history/${encodePathSegment(watchName)}`,
    apiKey,
    {},
    headerType
  );
}

export async function getHistorySummary(
  apiKey: string,
  watchName: string,
  headerType: ApiHeaderType = 'key'
): Promise<HistorySummaryResponse> {
  return apiRequest<HistorySummaryResponse>(
    `/api/history/${encodePathSegment(watchName)}/summary`,
    apiKey,
    {},
    headerType
  );
}

export { ApiError };
