export interface AddWatchRequest {
  name: string;
  fullUrl?: string;
  customHeaders?: string;
  intervalMinutes: number;
}

export interface UpdateWatchRequest {
  name?: string;
  url?: string;
  customHeaders?: string;
  intervalMinutes?: number;
  active?: boolean;
}

export interface CheckEndpointRequest {
  fullUrl: string;
  customHeaders?: string;
}

export interface CheckEndpointResponse {
  responseCode: number;
  responseTimeMs: number;
  context: string;
}

export interface HistoryRaw {
  dateTime: string;
  statusCode: number;
  responseTimeMs: number;
  peekResponseContent: string;
}

// Stripped version without peekResponseContent to reduce memory
export interface History {
  dateTime: string;
  statusCode: number;
  responseTimeMs: number;
}

export interface HistoryResponse {
  watchName: string;
  records: History[];
}

export interface HistorySummaryResponse {
  watchName: string;
  histroyRecordCount: number;
  firstEventTime: string;
  lastEventTime: string;
  responseTime: ResponseTimeSummary;
  statusSummary: Record<number, number>;
}

export interface ResponseTimeSummary {
  min: number;
  max: number;
  avg: number;
}

export interface Watch {
  name: string;
  url: string;
  customHeaders?: string;
  intervalMinutes: number;
  active: boolean;
}

export type StoplightStatus = 'green' | 'yellow' | 'red' | 'grey';

export type HistoryFilter = 30 | 90 | 180 | 360 | 400 | 'all';

export interface WatchWithData extends Watch {
  summary?: HistorySummaryResponse;
  history?: History[];
  status: StoplightStatus;
  isLoading: boolean;
}
