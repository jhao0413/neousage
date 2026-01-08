# neousage

CLI tool to analyze Neovate Code usage statistics.

![neousage](https://jhao413.oss-cn-beijing.aliyuncs.com/2025-11-14_22-1711.png)

## Installation

### Quick Start (Recommended)

You can run `neousage` directly without installation:

```bash
npx neousage

# Using bunx
bunx neousage
```

### Global Installation (Optional)

If you prefer to install globally:

```bash
npm install -g neousage
# or
bun install -g neousage
# or
pnpm install -g neousage
```

Then run directly:

```bash
neousage            # Show daily report (default)
neousage daily      # Daily token usage
neousage monthly    # Monthly aggregated report
neousage session    # Usage by conversation session
```

## Commands

```bash
neousage [command]

Commands:
  daily      Show daily token usage (default)
  monthly    Show monthly aggregated report
  session    Show usage by conversation session
  help       Show help message
```

## Output Columns

### Daily & Monthly Views
- **Model**: AI model name
- **Input**: Input tokens used
- **Output**: Output tokens generated
- **Total**: Total tokens (input + output)
- **Messages**: Number of messages
- **Days**: Number of days used (monthly view only)

### Session View
- **Last Used**: Date of last use
- **Session**: Session summary/description
- **Model**: AI model name
- **Input**: Input tokens
- **Output**: Output tokens
- **Total**: Total tokens
- **Messages**: Number of messages

## Data Source

This tool reads Neovate Code session data from `~/.neovate/projects/` directory.

## License

MIT
