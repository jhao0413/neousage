import fs from 'fs';
import os from 'os';
import path from 'pathe';
import type { DailyStats, MonthlyStats, SessionStats, NormalizedMessage, SessionInfo, SummaryStats } from './types';

export function getNeovateProjectsPath(): string {
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
          summary: summary ? summary.slice(0, 50) + '...' : '',
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
        return entry.content.length > 50 ? entry.content.slice(0, 50) + '...' : entry.content;
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

export function analyzeDailyStats(sessions: SessionInfo[]): DailyStats[] {
  const projectsPath = getNeovateProjectsPath();
  const statsMap = new Map<string, DailyStats>();

  for (const session of sessions) {
    const sessionPath = path.join(projectsPath, findSessionPath(session.sessionId));
    const messages = parseSession(sessionPath);

    for (const message of messages) {
      if (message.role === 'assistant' && message.model && message.usage) {
        const date = message.timestamp.split('T')[0];
        const model = message.model;
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

        existing.inputTokens += message.usage.input_tokens || 0;
        existing.outputTokens += message.usage.output_tokens || 0;
        existing.cacheReadTokens += message.usage.cache_read_input_tokens || 0;
        existing.cacheCreationTokens += message.usage.cache_creation_input_tokens || 0;
        existing.totalTokens += (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
        existing.messages += 1;

        statsMap.set(key, existing);
      }
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function findSessionPath(sessionId: string): string {
  const projectsPath = getNeovateProjectsPath();

  const findInDir = (dir: string): string | null => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const result = findInDir(fullPath);
        if (result) {
          return path.join(entry.name, result);
        }
      } else if (entry.isFile() && entry.name === `${sessionId}.jsonl`) {
        return entry.name;
      }
    }

    return null;
  };

  return findInDir(projectsPath) || `${sessionId}.jsonl`;
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

export function analyzeMonthlyStats(sessions: SessionInfo[]): MonthlyStats[] {
  const projectsPath = getNeovateProjectsPath();
  const statsMap = new Map<string, MonthlyStats & { daysSet: Set<string> }>();

  for (const session of sessions) {
    const sessionPath = path.join(projectsPath, findSessionPath(session.sessionId));
    const messages = parseSession(sessionPath);

    for (const message of messages) {
      if (message.role === 'assistant' && message.model && message.usage) {
        const date = message.timestamp.split('T')[0];
        const month = date.slice(0, 7); // YYYY-MM
        const model = message.model;
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

        existing.inputTokens += message.usage.input_tokens || 0;
        existing.outputTokens += message.usage.output_tokens || 0;
        existing.cacheReadTokens += message.usage.cache_read_input_tokens || 0;
        existing.cacheCreationTokens += message.usage.cache_creation_input_tokens || 0;
        existing.totalTokens += (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
        existing.messages += 1;
        existing.daysSet.add(date);

        statsMap.set(key, existing);
      }
    }
  }

  // Convert daysSet to days count and remove daysSet
  const result: MonthlyStats[] = Array.from(statsMap.values()).map((stat) => ({
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

  return result.sort((a, b) => b.month.localeCompare(a.month));
}

export function analyzeSessionStats(sessions: SessionInfo[]): SessionStats[] {
  const projectsPath = getNeovateProjectsPath();
  const result: SessionStats[] = [];

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

        existing.inputTokens += message.usage.input_tokens || 0;
        existing.outputTokens += message.usage.output_tokens || 0;
        existing.cacheReadTokens += message.usage.cache_read_input_tokens || 0;
        existing.cacheCreationTokens += message.usage.cache_creation_input_tokens || 0;
        existing.totalTokens += (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
        existing.messages += 1;

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
