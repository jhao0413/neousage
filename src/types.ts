export interface NormalizedMessage {
  type: 'message';
  role: string;
  content: any;
  timestamp: string;
  uuid: string;
  parentUuid: string | null;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export interface DailyStats {
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  messages: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM format
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  messages: number;
  days: number;
}

export interface MonthlyStatsGroup {
  month: string;
  stats: MonthlyStats[];
  totalDays: number; // Total unique days used in this month across all models
}

export interface SessionStats {
  sessionId: string;
  summary: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  messages: number;
  lastUsed: string;
}

export interface SummaryStats {
  totalDays: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalMessages: number;
  modelsUsed: string[];
  dateRange: { start: string; end: string };
}

export interface SessionInfo {
  sessionId: string;
  modified: Date;
  messageCount: number;
  summary?: string;
}
