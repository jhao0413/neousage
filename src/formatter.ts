import chalk from 'chalk';
import Table from 'cli-table3';
import { brandColor } from './theme';
import type { DailyStats, MonthlyStats, SessionStats } from './types';

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

    // Calculate daily totals
    const dayTotal = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      messages: 0,
    };

    for (const stat of dayStats) {
      dayTotal.inputTokens += stat.inputTokens;
      dayTotal.outputTokens += stat.outputTokens;
      dayTotal.totalTokens += stat.totalTokens;
      dayTotal.messages += stat.messages;
    }

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

    // Add each model's stats
    for (const stat of dayStats) {
      table.push([
        stat.model.length > 43 ? stat.model.slice(0, 43) + '..' : stat.model,
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

function formatNumber(num: number): string {
  if (num === 0) return '-';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
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

    // Calculate monthly totals
    const monthTotal = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      messages: 0,
    };

    for (const stat of monthStats) {
      monthTotal.inputTokens += stat.inputTokens;
      monthTotal.outputTokens += stat.outputTokens;
      monthTotal.totalTokens += stat.totalTokens;
      monthTotal.messages += stat.messages;
    }

    // Get total unique days for this month across all models
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

    // Add each model's stats
    for (const stat of monthStats) {
      table.push([
        stat.model.length > 38 ? stat.model.slice(0, 38) + '..' : stat.model,
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
    const shortSummary = stat.summary.length > 33 ? stat.summary.slice(0, 33) + '..' : stat.summary;
    const shortModel = stat.model.length > 28 ? stat.model.slice(0, 28) + '..' : stat.model;

    table.push([
      stat.lastUsed,
      shortSummary,
      shortModel,
      formatNumber(stat.inputTokens),
      formatNumber(stat.outputTokens),
      formatNumber(stat.totalTokens),
      stat.messages.toString(),
    ]);
  }

  console.log(table.toString());

  // Show summary
  const totalTokens = stats.reduce((sum, stat) => sum + stat.totalTokens, 0);
  const totalMessages = stats.reduce((sum, stat) => sum + stat.messages, 0);
  const uniqueSessions = new Set(stats.map((s) => s.sessionId)).size;

  console.log(chalk.gray(`\nTotal: ${uniqueSessions} sessions, ${totalMessages} messages, ${formatNumber(totalTokens)} tokens`));
}
