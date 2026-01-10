import chalk from 'chalk';
import Table from 'cli-table3';
import { brandColor } from './theme.js';
import type { DailyStats, MonthlyStats, SessionStats } from './types.js';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '..';
}

function formatNumber(num: number): string {
  if (num === 0) return '-';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toString();
}

function sumStats<T extends { inputTokens: number; outputTokens: number; totalTokens: number; messages: number }>(
  items: T[]
): { inputTokens: number; outputTokens: number; totalTokens: number; messages: number } {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let messages = 0;

  for (const item of items) {
    inputTokens += item.inputTokens;
    outputTokens += item.outputTokens;
    totalTokens += item.totalTokens;
    messages += item.messages;
  }

  return { inputTokens, outputTokens, totalTokens, messages };
}

export function formatDailyStats(stats: DailyStats[]): void {
  console.log(brandColor.bold('\n📅 Daily Usage Statistics\n'));

  if (stats.length === 0) {
    console.log(chalk.yellow('No usage data found.'));
    return;
  }

  // Group stats by date
  const dateMap = new Map<string, DailyStats[]>();
  for (const stat of stats) {
    const existing = dateMap.get(stat.date) || [];
    existing.push(stat);
    dateMap.set(stat.date, existing);
  }

  // Sort dates in descending order (newest first)
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

  for (const date of sortedDates) {
    const dayStats = dateMap.get(date)!;
    const dayTotal = sumStats(dayStats);

    console.log(chalk.bold.yellow(`\n${date}`));

    const table = new Table({
      head: [
        brandColor('Model'),
        brandColor('Input'),
        brandColor('Output'),
        brandColor('Total'),
        brandColor('Messages'),
      ],
      colWidths: [45, 12, 12, 12, 10],
    });

    for (const stat of dayStats) {
      table.push([
        truncate(stat.model, 43),
        formatNumber(stat.inputTokens),
        formatNumber(stat.outputTokens),
        formatNumber(stat.totalTokens),
        stat.messages.toString(),
      ]);
    }

    // Add daily total row if there are multiple models
    if (dayStats.length > 1) {
      table.push([
        chalk.bold('Total'),
        chalk.bold(formatNumber(dayTotal.inputTokens)),
        chalk.bold(formatNumber(dayTotal.outputTokens)),
        chalk.bold(formatNumber(dayTotal.totalTokens)),
        chalk.bold(dayTotal.messages.toString()),
      ]);
    }

    console.log(table.toString());
  }
}

export function formatMonthlyStats(stats: MonthlyStats[], monthTotalDays: Map<string, number>): void {
  console.log(brandColor.bold('\n📆 Monthly Usage Statistics\n'));

  if (stats.length === 0) {
    console.log(chalk.yellow('No usage data found.'));
    return;
  }

  // Group stats by month
  const monthMap = new Map<string, MonthlyStats[]>();
  for (const stat of stats) {
    const existing = monthMap.get(stat.month) || [];
    existing.push(stat);
    monthMap.set(stat.month, existing);
  }

  // Sort months in descending order (newest first)
  const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));

  for (const month of sortedMonths) {
    const monthStats = monthMap.get(month)!;
    const monthTotal = sumStats(monthStats);
    const totalDays = monthTotalDays.get(month) || 0;

    console.log(chalk.bold.yellow(`\n${month} (${totalDays} days)`));

    const table = new Table({
      head: [
        brandColor('Model'),
        brandColor('Input'),
        brandColor('Output'),
        brandColor('Total'),
        brandColor('Messages'),
        brandColor('Days'),
      ],
      colWidths: [40, 12, 12, 12, 10, 8],
    });

    for (const stat of monthStats) {
      table.push([
        truncate(stat.model, 38),
        formatNumber(stat.inputTokens),
        formatNumber(stat.outputTokens),
        formatNumber(stat.totalTokens),
        stat.messages.toString(),
        stat.days.toString(),
      ]);
    }

    // Add monthly total row if there are multiple models
    if (monthStats.length > 1) {
      table.push([
        chalk.bold('Total'),
        chalk.bold(formatNumber(monthTotal.inputTokens)),
        chalk.bold(formatNumber(monthTotal.outputTokens)),
        chalk.bold(formatNumber(monthTotal.totalTokens)),
        chalk.bold(monthTotal.messages.toString()),
        chalk.bold(totalDays.toString()),
      ]);
    }

    console.log(table.toString());
  }
}

export function formatSessionStats(stats: SessionStats[]): void {
  console.log(brandColor.bold('\n💬 Session-based Usage Statistics\n'));

  if (stats.length === 0) {
    console.log(chalk.yellow('No usage data found.'));
    return;
  }

  const table = new Table({
    head: [
      brandColor('Last Used'),
      brandColor('Session'),
      brandColor('Model'),
      brandColor('Input'),
      brandColor('Output'),
      brandColor('Total'),
      brandColor('Messages'),
    ],
    colWidths: [12, 35, 30, 12, 12, 12, 10],
  });

  for (const stat of stats) {
    table.push([
      stat.lastUsed,
      truncate(stat.summary, 33),
      truncate(stat.model, 28),
      formatNumber(stat.inputTokens),
      formatNumber(stat.outputTokens),
      formatNumber(stat.totalTokens),
      stat.messages.toString(),
    ]);
  }

  console.log(table.toString());

  const totals = sumStats(stats);
  const uniqueSessions = new Set(stats.map((s) => s.sessionId)).size;

  console.log(chalk.gray(`\nTotal: ${uniqueSessions} sessions, ${totals.messages} messages, ${formatNumber(totals.totalTokens)} tokens`));
}
