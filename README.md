# claude-session-limit-breaker

**English** | [日本語](README-ja.md)

Runs `claude -p` on a fixed daily schedule (default: 03:00 / 08:10 / 13:20 / 18:30 JST), sending one small random task each time. Written in [Purus](https://purus.work) and meant to run continuously on Linux under pm2.

For how it works internally (scheduling, limit-detection, i18n, etc.), see [CONTRIBUTING.md](CONTRIBUTING.md).

## Requirements

- Node.js 22+ (required by the [Purus](https://purus.work) compiler)
- [Claude Code CLI](https://code.claude.com/docs/ja/quickstart) installed and logged in as the user that will run this (pm2's user)

## Setup

```bash
git clone <this repo>
cd claude-session-limit-breaker
npm install
```

## Run

```bash
npm start        # foreground, Ctrl+C to stop
```

### Run with pm2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup       # follow the printed sudo command to enable on boot
```

```bash
pm2 logs claude-session-limit-breaker
pm2 restart claude-session-limit-breaker
pm2 stop claude-session-limit-breaker
```

## Configuration

Everything is in the `CONFIG` block at the top of [src/main.purus](src/main.purus) — edit and save, no build step needed (restart the process if it's already running).

```
const CONFIG be [
  times be [[3, 0], [8, 10], [13, 20], [18, 30]], -- [hour, minute] pairs, 24h
  timezone be //;Asia/Tokyo;//,
  model be //;haiku;//,
  tasksFile be //;tasks.yaml;//,
  discordWebhook be process.env.DISCORD_WEBHOOK,
  lang be detect-lang[]
]
```

### Tasks

Edit [tasks.yaml](tasks.yaml) — a flat YAML list, one task per line, `#` comments allowed:

```yaml
- Tell me one simple English word for your project idea
- Give me a number for your project idea
```

### Discord notifications (optional)

1. Create a webhook in your Discord channel settings (Integrations → Webhooks)
2. `cp .env.example .env` and set `DISCORD_WEBHOOK` to the webhook URL

Leave it unset and notifications are silently skipped.

### Language

Log and Discord message language is `en` by default; set `LANG=ja` in `.env` for Japanese. A project-local `.env` takes precedence over any OS-level `LANG`.

## License

[WTFPL](LICENSE)
