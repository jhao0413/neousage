import fs from 'fs';
import os from 'os';
import path from 'pathe';
import type { DailyStats, MonthlyStats, SessionStats, NormalizedMessage, SessionInfo, SummaryStats } from './types.js';

function getNeovateProjectsPath(): string {
  return path.join(os.homedir(), '.neovate', 'projects');
}

export function getAllSessions(): SessionInfo[] {
  const projectsPath = getNeovateProjectsPath();

  if (!fs.existsSync(projectsPath)) {
    return [];
  }

  const sessions: SessionInfo[] = [];

  const readProjects = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        readProjects(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const stats = fs.statSync(fullPath);
        const sessionId = path.basename(entry.name, '.jsonl');

        let messageCount = 0;
        let summary = '';

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n').filter(Boolean);
          messageCount = lines.length;

          if (lines.length > 0) {
            try {
              const firstEntry = JSON.parse(lines[0]);
              if (firstEntry.type === 'config' && firstEntry.config?.summary) {
                summary = firstEntry.config.summary;
              }
            } catch {
              summary = extractFirstUserMessageSummary(lines);
            }
          }
        } catch {
          messageCount = 0;
        }

        sessions.push({
          sessionId,
          modified: stats.mtime,
          messageCount,
          summary: summary.slice(0, 50),
        });
      }
    }
  };

  readProjects(projectsPath);

  return sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

function extractFirstUserMessageSummary(lines: string[]): string {
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'message' && entry.role === 'user' && typeof entry.content === 'string') {
        return entry.content;
      }
    } catch {
      continue;
    }
  }
  return '';
}

export function parseSession(filePath: string): NormalizedMessage[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);

  const messages: NormalizedMessage[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'message') {
        messages.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return messages;
}

let sessionPathCache: Map<string, string> | null = null;

function buildSessionPathCache(): Map<string, string> {
  if (sessionPathCache !== null) {
    return sessionPathCache;
  }

  sessionPathCache = new Map<string, string>();
  const projectsPath = getNeovateProjectsPath();

  const findInDir = (dir: string, relativePath: string = ''): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        findInDir(fullPath, path.join(relativePath, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const sessionId = path.basename(entry.name, '.jsonl');
        const sessionRelativePath = path.join(relativePath, entry.name);
        sessionPathCache!.set(sessionId, sessionRelativePath);
      }
    }
  };

  if (fs.existsSync(projectsPath)) {
    findInDir(projectsPath);
  }

  return sessionPathCache;
}

function findSessionPath(sessionId: string): string {
  const cache = buildSessionPathCache();
  return cache.get(sessionId) || `${sessionId}.jsonl`;
}

function processAllMessages(
  sessions: SessionInfo[],
  messageHandler: (message: NormalizedMessage) => void
): void {
  const projectsPath = getNeovateProjectsPath();
  buildSessionPathCache();

  for (const session of sessions) {
    const sessionPath = path.join(projectsPath, findSessionPath(session.sessionId));
    const messages = parseSession(sessionPath);

    for (const message of messages) {
      if (message.role === 'assistant' && message.model && message.usage) {
        messageHandler(message);
      }
    }
  }
}

function accumulateUsage(
  existing: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    totalTokens: number;
    messages: number;
  },
  usage: NormalizedMessage['usage']
): void {
  if (!usage) return;

  existing.inputTokens += usage.input_tokens || 0;
  existing.outputTokens += usage.output_tokens || 0;
  existing.cacheReadTokens += usage.cache_read_input_tokens || 0;
  existing.cacheCreationTokens += usage.cache_creation_input_tokens || 0;
  existing.totalTokens += (usage.input_tokens || 0) + (usage.output_tokens || 0);
  existing.messages += 1;
}

export function analyzeDailyStats(sessions: SessionInfo[]): DailyStats[] {
  const statsMap = new Map<string, DailyStats>();

  processAllMessages(sessions, (message) => {
    const date = message.timestamp.split('T')[0];
    const model = message.model!;
    const key = `${date}|${model}`;

    const existing = statsMap.get(key) || {
      date,
      model,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      totalTokens: 0,
      messages: 0,
    };

    accumulateUsage(existing, message.usage);
    statsMap.set(key, existing);
  });

  return Array.from(statsMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function calculateSummary(stats: DailyStats[]): SummaryStats {
  const modelsSet = new Set<string>();
  const datesSet = new Set<string>();

  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalMessages = 0;

  for (const stat of stats) {
    modelsSet.add(stat.model);
    datesSet.add(stat.date);
    totalTokens += stat.totalTokens;
    totalInputTokens += stat.inputTokens;
    totalOutputTokens += stat.outputTokens;
    totalCacheReadTokens += stat.cacheReadTokens;
    totalCacheCreationTokens += stat.cacheCreationTokens;
    totalMessages += stat.messages;
  }

  const sortedDates = Array.from(datesSet).sort();

  return {
    totalDays: datesSet.size,
    totalTokens,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
    totalMessages,
    modelsUsed: Array.from(modelsSet).sort(),
    dateRange: {
      start: sortedDates[0] || '-',
      end: sortedDates[sortedDates.length - 1] || '-',
    },
  };
}

export function analyzeMonthlyStats(sessions: SessionInfo[]): { stats: MonthlyStats[]; monthTotalDays: Map<string, number> } {
  const statsMap = new Map<string, MonthlyStats & { daysSet: Set<string> }>();
  const monthDaysMap = new Map<string, Set<string>>(); // Track all unique days per month

  processAllMessages(sessions, (message) => {
    const date = message.timestamp.split('T')[0];
    const month = date.slice(0, 7); // YYYY-MM
    const model = message.model!;
    const key = `${month}|${model}`;

    const existing = statsMap.get(key) || {
      month,
      model,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      totalTokens: 0,
      messages: 0,
      days: 0,
      daysSet: new Set<string>(),
    };

    accumulateUsage(existing, message.usage);
    existing.daysSet.add(date);
    statsMap.set(key, existing);

    // Track all unique days for this month across all models
    if (!monthDaysMap.has(month)) {
      monthDaysMap.set(month, new Set<string>());
    }
    monthDaysMap.get(month)!.add(date);
  });

  // Convert daysSet to days count and remove daysSet
  const stats: MonthlyStats[] = Array.from(statsMap.values()).map((stat) => ({
    month: stat.month,
    model: stat.model,
    inputTokens: stat.inputTokens,
    outputTokens: stat.outputTokens,
    cacheReadTokens: stat.cacheReadTokens,
    cacheCreationTokens: stat.cacheCreationTokens,
    totalTokens: stat.totalTokens,
    messages: stat.messages,
    days: stat.daysSet.size,
  }));

  // Convert monthDaysMap to monthTotalDays
  const monthTotalDays = new Map<string, number>();
  for (const [month, daysSet] of monthDaysMap.entries()) {
    monthTotalDays.set(month, daysSet.size);
  }

  return {
    stats: stats.sort((a, b) => b.month.localeCompare(a.month)),
    monthTotalDays,
  };
}

export function analyzeSessionStats(sessions: SessionInfo[]): SessionStats[] {
  const projectsPath = getNeovateProjectsPath();
  const result: SessionStats[] = [];

  // Build cache once for all sessions
  buildSessionPathCache();

  for (const session of sessions) {
    const sessionPath = path.join(projectsPath, findSessionPath(session.sessionId));
    const messages = parseSession(sessionPath);

    // Group by model within each session
    const modelMap = new Map<
      string,
      {
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        cacheCreationTokens: number;
        totalTokens: number;
        messages: number;
        lastTimestamp: string;
      }
    >();

    for (const message of messages) {
      if (message.role === 'assistant' && message.model && message.usage) {
        const model = message.model;
        const existing = modelMap.get(model) || {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalTokens: 0,
          messages: 0,
          lastTimestamp: message.timestamp,
        };

        accumulateUsage(existing, message.usage);

        // Keep the latest timestamp
        if (message.timestamp > existing.lastTimestamp) {
          existing.lastTimestamp = message.timestamp;
        }

        modelMap.set(model, existing);
      }
    }

    // Create a SessionStats entry for each model used in this session
    for (const [model, data] of modelMap.entries()) {
      result.push({
        sessionId: session.sessionId,
        summary: session.summary || 'No summary available',
        model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cacheReadTokens: data.cacheReadTokens,
        cacheCreationTokens: data.cacheCreationTokens,
        totalTokens: data.totalTokens,
        messages: data.messages,
        lastUsed: data.lastTimestamp.split('T')[0],
      });
    }
  }

  // Sort by last used date (most recent first)
  return result.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
}
