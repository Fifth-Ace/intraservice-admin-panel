# IntraService Admin Panel

Standalone administration web-panel for the **IntraService Telegram Bot**
([intraservice-telegram-bot](https://github.com/Fifth-Ace/intraservice-telegram-bot)).
It reads the bot's state and exposes a live dashboard — it does **not** replace
the bot and does **not** connect to IntraService itself.

> This is the public, community edition. Everything sensitive (credentials,
> real DB paths, bot internals) is intentionally excluded. Point the panel at
> your own bot with environment variables.

## What it does

- live metrics from the bot's own SQLite databases (operations today, average API
  latency, needs-attention, created-by-channel counters);
- processing queue with the **cancel** action (only for tickets that are not yet
  created in IntraService);
- transport/service status lights (Official API / Telegram intake / Mail watcher /
  AI analyzer / Playwright fallback);
- activity log, per-source operations chart;
- section **Settings → Connection** to view/configure IntraService and Telegram
  connection parameters;
- section **Settings → Access** to manage who can use the bot (names + Telegram IDs);
- four visual themes (Aurora, Light, Dark, Minimal);
- hash-based routing — every page has its own URL (`#/queue`, `#/settings/connect`)
  and survives reload and browser back/forward.

## Requirements

- Node.js ≥ 22.5
- the bot's databases must be readable (`sqlite3` CLI available on the host)
- a running **intraservice-telegram-bot** deployment (or an empty stub for a look)

## Install as a module next to the bot

Put this panel and the bot in **sibling directories**, then point the panel at
the bot via environment variables:

```
parent/
├── intraservice-server-bot/     # the Telegram bot (any repo layout)
└── intraservice-admin-panel/    # this panel
```

```bash
cd intraservice-admin-panel
npm install        # no deps at runtime, but set up anyway
npm run bootstrap-admin   # creates data/auth.json, reads the initial password interactively
```

Default bot paths resolve to `../intraservice-server-bot` relative to the panel.
Override with environment variables if your layout differs:

| Env | Default | Meaning |
|---|---|---|
| `PANEL_BOT_DIR` | `../intraservice-server-bot` | root dir of the bot |
| `PANEL_BOT_DB` | `<bot>/data/intake.sqlite3` | intake / audit database |
| `PANEL_MAIL_DB` | `<bot>/data/mail_watcher.sqlite3` | mail-watcher database |
| `PANEL_HOST` | `0.0.0.0` | listen host |
| `PANEL_PORT` | `9120` | listen port |
| `PANEL_AUTH_FILE` | `data/auth.json` | auth store location |
| `PANEL_TRUST_PROXY` | `0` | set `1` only behind a trusted reverse proxy |

```bash
npm run check   # syntax checks
npm test        # auth self-test
npm start
```

## Commands

- `npm run check` — syntax lint of all sources;
- `npm test` — authentication self-test (no live data touched);
- `npm run bootstrap-admin` — create the local admin account (refuses to overwrite);
- `npm start` — run the panel.

## Authentication & transport security

- local admin account, initial password bootstrap (only a salted `scrypt` hash
  stored on disk);
- mandatory password change before dashboard access;
- in-memory eight-hour sessions in `HttpOnly` / `SameSite=Strict` cookies;
- CSRF protection on every state-changing request;
- login rate limiting and temporary lockout;
- restrictive security headers + `Cache-Control: no-store`.

Password submission / password change is accepted only when the request is HTTPS,
arrives from loopback, or a trusted proxy declares `X-Forwarded-Proto: https`
(`PANEL_TRUST_PROXY=1`). Do **not** set `PANEL_ALLOW_INSECURE_AUTH=1` outside
isolated tests.

## Cancelling a queued ticket

The cancel action is a thin mirror of the bot's own two-row update: it can only
cancel tickets still in `preview` / `needs_clarification`. Already-created tickets
(with an `intra_id`) are **never** cancelled from the panel — closing those is the
bot's job.

## Safety boundary

The public edition is read-only with respect to the bot except for the explicit
queue-cancel action. It never:

- writes into bot databases beyond the documented cancel;
- holds bot credentials (token / password are read masked and are never echoed);
- connects to IntraService or performs mutations;
- exposes bot journals with ticket/personal data.

## License

MIT — see `LICENSE`.

## Related

- [IntraService Telegram Bot (public)](https://github.com/Fifth-Ace/intraservice-telegram-bot)
