import type {
  Watch,
  AddWatchRequest,
  UpdateWatchRequest,
  HistoryResponse,
  HistorySummaryResponse,
} from '@/types/api';

const BASE_URL = 'https://boch.p.rapidapi.com';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
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
  await apiRequest(`/api/watch/${encodeURIComponent(watchName)}`, apiKey, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteWatch(apiKey: string, watchName: string): Promise<void> {
  await apiRequest(`/api/watch/${encodeURIComponent(watchName)}`, apiKey, {
    method: 'DELETE',
  });
}

export async function getHistory(
  apiKey: string,
  watchName: string,
  limit?: number
): Promise<HistoryResponse> {
  const params = limit ? `?limit=${limit}` : '';
  return apiRequest<HistoryResponse>(
    `/api/history/${encodeURIComponent(watchName)}${params}`,
    apiKey
  );
}

export async function getHistorySummary(
  apiKey: string,
  watchName: string
): Promise<HistorySummaryResponse> {
  return apiRequest<HistorySummaryResponse>(
    `/api/history/${encodeURIComponent(watchName)}/summary`,
    apiKey
  );
}

export { ApiError };
