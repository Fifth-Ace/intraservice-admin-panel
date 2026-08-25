# IntraService Admin Panel — Community Edition

[Русский](README.md) | [English](README.en.md)

A standalone administration web-panel for the
**[IntraService Telegram Bot](https://github.com/Fifth-Ace/intraservice-telegram-bot)**.
It reads the bot's own databases and exposes a live dashboard: metrics, a queue
with cancel, service status, a journal and a safe configuration overview. It does **not**
replace the bot and does **not** connect to IntraService directly.

[![CI](https://github.com/Fifth-Ace/intraservice-admin-panel/actions/workflows/ci.yml/badge.svg)](https://github.com/Fifth-Ace/intraservice-admin-panel/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Fifth-Ace/intraservice-admin-panel)](https://github.com/Fifth-Ace/intraservice-admin-panel/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Independent community project. It is not affiliated with IntraService or
> Telegram developers.

> This is the public Community Edition. Everything sensitive (credentials, real
> DB paths, bot internals) is intentionally excluded. Point the panel at your own
> bot with environment variables.

## Features

- **Live metrics** from the bot's own SQLite databases (operations today, average
  API latency, needs-attention, created-by-channel);
- **Processing queue** with a **Cancel** action (only for tickets not yet created
  in IntraService);
- **Transport/service status lights** (Official API / Telegram intake /
  Mail watcher / AI analyzer / Playwright fallback);
- **Activity log** and a per-source operations chart;
- **Settings → Connection** — safely view IntraService and Telegram parameters
  without exposing tokens or passwords;
- **Settings → Access** — view the allowed-user list (name + Telegram ID);
- four visual themes (Aurora, Light, Dark, Minimal);
- **hash-based routing** — every page has its own URL (`#/queue`,
  `#/settings/connect`), survives reload and works with back/forward.

> Configuration writes are disabled by default. When explicitly enabled, changes
> require preview and confirmation, create a backup and are written atomically.

## Requirements

- Node.js >= 22.5;
- the bot's databases must be readable (`sqlite3` CLI available on the host);
- a running **intraservice-telegram-bot** (or an empty stub to inspect the UI).

## Quick start (as a module next to the bot)

Place the panel and the bot in **sibling directories** and point the panel at the
bot via environment variables:

```
parent/
├── intraservice-server-bot/     # the Telegram bot (any layout)
└── intraservice-admin-panel/    # this panel
```

```bash
cd intraservice-admin-panel
npm install
npm run bootstrap-admin   # creates data/auth.json, reads the initial password
```

The portable environment-variable reference is published as
[`.env.example`](.env.example). The panel does not load `.env` automatically;
pass values through the process environment or a systemd unit.

By default bot DB paths resolve relative to the panel as `../intraservice-server-bot`.
Override with environment variables if your layout differs:

| Env | Default | Purpose |
|---|---|---|
| `PANEL_BOT_DIR` | `../intraservice-server-bot` | bot root dir |
| `PANEL_BOT_DB` | `<bot>/data/intake.sqlite3` | intake / audit DB |
| `PANEL_MAIL_DB` | `<bot>/data/mail_watcher.sqlite3` | mail-watcher DB |
| `PANEL_HOST` | `0.0.0.0` | listen address |
| `PANEL_PORT` | `9120` | listen port |
| `PANEL_AUTH_FILE` | `data/auth.json` | auth store |
| `PANEL_TRUST_PROXY` | `0` | set `1` only behind a trusted reverse proxy |

## Run & verify

```bash
npm run check   # syntax-check all files
npm test        # auth self-test (no live data touched)
npm start
```

Default listener: `0.0.0.0:9120`. Override with `PANEL_HOST` and `PANEL_PORT`.

## Sections & routes

| Section | URL | What it shows |
|---|---|---|
| Dashboard | `#/` | Key metrics, chart, statuses, queue |
| Operations | `#/operations` | Per-source operations |
| Queue | `#/queue` | Awaiting-confirmation tickets + Cancel |
| Services | `#/services` | Transport & service status |
| Log | `#/log` | Audit events |
| Settings | `#/settings` | Tabs: Dashboard, Basic, Access, Connection |

## Documentation

| Document | Contents |
|---|---|
| [Полный мануал (русский)](docs/ru/MANUAL.md) | Установка, настройка, разделы, подключение, очередь, systemd, решение проблем |
| [Full manual (English)](docs/en/MANUAL.md) | Complete installation and administration guide |
| [SECURITY.md](SECURITY.md) | Security policy and vulnerability reporting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Change and pull-request requirements |
| [Releases](https://github.com/Fifth-Ace/intraservice-admin-panel/releases) | Published versions and release notes |

## Authentication & transport security

- local admin account, initial-password bootstrap (only an `scrypt` hash on
  disk);
- mandatory password change before dashboard access;
- 8-hour in-memory sessions in `HttpOnly` / `SameSite=Strict` cookies;
- CSRF protection on every state-changing request;
- login rate limiting and temporary lockout;
- restrictive security headers + `Cache-Control: no-store`.

Password submission/change is accepted only when the request is HTTPS, comes from
loopback, or a trusted proxy declares `X-Forwarded-Proto: https`
(`PANEL_TRUST_PROXY=1`). Do **not** set `PANEL_ALLOW_INSECURE_AUTH=1` outside
isolated tests.

## Cancelling a queued ticket

Cancel is a thin mirror of the bot's own two-row update: it can only cancel
tickets still in `preview` / `needs_clarification`. Already-created tickets (with
an `intra_id`) are **never** cancelled from the panel — closing them is the bot's
job.

## Safety boundary

The public edition reads bot databases except for queue cancellation. Optional
configuration writes are explicitly gated and limited to documented files. It never:

- writes into bot DBs beyond the documented cancel;
- returns or logs token/password values; local env backups created by the opt-in
  writer are mode `0600` under `data/config-backups`;
- connects to IntraService or performs mutations;
- exposes bot journals with ticket or personal data.

## License

MIT — see `LICENSE`.

## Related

- [IntraService Telegram Bot (public)](https://github.com/Fifth-Ace/intraservice-telegram-bot)
