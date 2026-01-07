#!/usr/bin/env node
import chalk from 'chalk';
import { getAllSessions, analyzeDailyStats, analyzeMonthlyStats, analyzeSessionStats } from './parser';
import { formatDailyStats, formatMonthlyStats, formatSessionStats } from './formatter';

function showHelp() {
  console.log(chalk.bold.cyan('\nneousage - Analyze Neovate Code usage statistics\n'));
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

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'daily';

  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (!['daily', 'monthly', 'session'].includes(command)) {
    console.log(chalk.red(`\nUnknown command: ${command}`));
    showHelp();
    process.exit(1);
  }

  console.log(chalk.bold.blue('Loading Neovate usage data...'));

  const sessions = getAllSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('\nNo Neovate sessions found.'));
    console.log(chalk.gray('Make sure you have used Neovate Code before.\n'));
    process.exit(0);
  }

  console.log(chalk.gray(`Found ${sessions.length} session(s)\n`));

  if (command === 'daily') {
    const dailyStats = analyzeDailyStats(sessions);
    if (dailyStats.length === 0) {
      console.log(chalk.yellow('\nNo usage data found in sessions.'));
      console.log(chalk.gray('Sessions may not contain any assistant messages with usage data.\n'));
      process.exit(0);
    }
    formatDailyStats(dailyStats);
  } else if (command === 'monthly') {
    const monthlyStats = analyzeMonthlyStats(sessions);
    if (monthlyStats.length === 0) {
      console.log(chalk.yellow('\nNo usage data found in sessions.'));
      console.log(chalk.gray('Sessions may not contain any assistant messages with usage data.\n'));
      process.exit(0);
    }
    formatMonthlyStats(monthlyStats);
  } else if (command === 'session') {
    const sessionStats = analyzeSessionStats(sessions);
    if (sessionStats.length === 0) {
      console.log(chalk.yellow('\nNo usage data found in sessions.'));
      console.log(chalk.gray('Sessions may not contain any assistant messages with usage data.\n'));
      process.exit(0);
    }
    formatSessionStats(sessionStats);
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
