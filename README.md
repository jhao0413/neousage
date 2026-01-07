# neousage

CLI tool to analyze Neovate Code usage statistics.

## Installation

```bash
cd neousage
npm install
```

## Usage

### Development
```bash
npm run dev             # Show daily report (default)
npm run dev daily       # Daily token usage
npm run dev monthly     # Monthly aggregated report
npm run dev session     # Usage by conversation session
```

### Build
```bash
npm run build
```

### Run (after build)
```bash
npx neousage            # Show daily report (default)
npx neousage daily      # Daily token usage
npx neousage monthly    # Monthly aggregated report
npx neousage session    # Usage by conversation session
```

## Features

- **Daily Statistics**: View token usage broken down by date, showing models used each day
- **Monthly Statistics**: See monthly aggregated usage with total days active per model
- **Session Statistics**: Analyze usage by individual conversation sessions
- **Token Metrics**: Track input tokens, output tokens, total tokens, and messages

## Commands

```bash
neousage [command]

Commands:
  daily      Show daily token usage (default)
  monthly    Show monthly aggregated report
  session    Show usage by conversation session
  help       Show help message
```

## Examples

```bash
# Show daily report (default)
npx neousage

# Show daily stats
npx neousage daily

# Show monthly stats
npx neousage monthly

# Show session-based stats
npx neousage session
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
