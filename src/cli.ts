#!/usr/bin/env node
import chalk from 'chalk';
import { brandColor } from './theme.js';
import { getAllSessions, analyzeDailyStats, analyzeMonthlyStats, analyzeSessionStats } from './parser.js';
import { formatDailyStats, formatMonthlyStats, formatSessionStats } from './formatter.js';

function showHelp(): void {
  console.log(brandColor.bold('\nneousage - Analyze Neovate Code usage statistics\n'));
  console.log('Usage: neousage [command]\n');
  console.log('Commands:');
  console.log('  daily      Show daily token usage (default)');
  console.log('  monthly    Show monthly aggregated report');
  console.log('  session    Show usage by conversation session');
  console.log('  help       Show this help message\n');
  console.log('Examples:');
  console.log('  neousage             # Show daily report');
  console.log('  neousage daily       # Show daily report');
  console.log('  neousage monthly     # Show monthly report');
  console.log('  neousage session     # Show session-based report\n');
}

const VALID_COMMANDS = ['daily', 'monthly', 'session'] as const;
const HELP_FLAGS = ['help', '--help', '-h'];

function showNoUsageDataMessage(): void {
  console.log(chalk.yellow('\nNo usage data found in sessions.'));
  console.log(chalk.gray('Sessions may not contain any assistant messages with usage data.\n'));
}

function main(): void {
  const command = process.argv[2] || 'daily';

  if (HELP_FLAGS.includes(command)) {
    showHelp();
    process.exit(0);
  }

  if (!VALID_COMMANDS.includes(command as typeof VALID_COMMANDS[number])) {
    console.log(chalk.red(`\nUnknown command: ${command}`));
    showHelp();
    process.exit(1);
  }

  console.log(brandColor.bold('Loading Neovate usage data...'));

  const sessions = getAllSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('\nNo Neovate sessions found.'));
    console.log(chalk.gray('Make sure you have used Neovate Code before.\n'));
    process.exit(0);
  }

  console.log(chalk.gray(`Found ${sessions.length} session(s)\n`));

  switch (command) {
    case 'daily': {
      const dailyStats = analyzeDailyStats(sessions);
      if (dailyStats.length === 0) {
        showNoUsageDataMessage();
        process.exit(0);
      }
      formatDailyStats(dailyStats);
      break;
    }
    case 'monthly': {
      const { stats: monthlyStats, monthTotalDays } = analyzeMonthlyStats(sessions);
      if (monthlyStats.length === 0) {
        showNoUsageDataMessage();
        process.exit(0);
      }
      formatMonthlyStats(monthlyStats, monthTotalDays);
      break;
    }
    case 'session': {
      const sessionStats = analyzeSessionStats(sessions);
      if (sessionStats.length === 0) {
        showNoUsageDataMessage();
        process.exit(0);
      }
      formatSessionStats(sessionStats);
      break;
    }
  }

  console.log();
}

try {
  main();
} catch (error) {
  console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
  console.log(chalk.gray('\nUse --help for usage information.\n'));
  process.exit(1);
}
