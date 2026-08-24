# IntraService Admin Panel — Manual

A standalone administration web-panel for the
**[IntraService Telegram Bot](https://github.com/Fifth-Ace/intraservice-telegram-bot)**.
The panel reads the bot's own databases and exposes a live dashboard; it does
**not** modify tickets in IntraService directly and does **not** replace the bot.

This manual covers the **Community Edition**. Connection and access tabs are
read-only; edit those values in the bot's own configuration.

## Contents

1. Features
2. Requirements
3. Installation
4. Environment
5. Run & verify
6. Interface sections
7. Routing
8. Themes
9. Connecting to the bot
10. Queue & cancelling a ticket
11. systemd
12. Updating
13. Data & backups
14. Testing
15. Troubleshooting
16. Security
17. Current limitations
18. Project layout
19. License

## 1. Features

- **Live metrics** from the bot's DBs:
  - operations today (from `audit_log`);
  - average IntraService API latency;
  - needs-attention count;
  - "created by channel" — Telegram / Mail / Manual;
- **Processing queue**: tickets awaiting confirmation plus a **Cancel** action;
- **Transport/service status lights** (Official API, Playwright fallback,
  Telegram intake, Mail watcher, AI analyzer);
- **Activity log** and a per-source operations chart;
- **Connection settings**: IntraService and Telegram parameters;
- **Access settings**: who (name + Telegram ID) may use the bot;
- **4 themes** (Aurora, Light, Dark, Minimal);
- **Hash-based routing** — each page has its own URL, back/forward works, and
  reload keeps you on the same page.

## 2. Requirements

- Node.js **>= 22.5**;
- the `sqlite3` CLI available on the host (the panel reads DBs through it in
  read-only mode);
- a running **intraservice-telegram-bot** (or an empty stub to inspect the UI).

## 3. Installation

Place the panel and the bot in **sibling directories**:

```
parent/
├── intraservice-server-bot/     # Telegram bot
└── intraservice-admin-panel/    # this panel
```

```bash
cd intraservice-admin-panel
npm install
```

There are no runtime dependencies — installation is optional but recommended.
Create the administrator account:

```bash
npm run bootstrap-admin
```

The script reads the initial password interactively (no echo) and **refuses to
overwrite** an existing `data/auth.json`.

## 4. Environment

By default, bot DB paths resolve relative to the panel from a sibling
`../intraservice-server-bot`. Point them elsewhere via environment variables if
needed.

| Env | Default | Purpose |
|---|---|---|
| `PANEL_BOT_DIR` | `../intraservice-server-bot` | bot root directory |
| `PANEL_BOT_DB` | `<bot>/data/intake.sqlite3` | intake / audit DB |
| `PANEL_MAIL_DB` | `<bot>/data/mail_watcher.sqlite3` | mail-watcher DB |
| `PANEL_HOST` | `0.0.0.0` | listen address |
| `PANEL_PORT` | `9120` | listen port |
| `PANEL_AUTH_FILE` | `data/auth.json` | auth store |
| `PANEL_TRUST_PROXY` | `0` | set `1` only behind a trusted reverse proxy |

See `systemd/intraservice-admin-panel-preview.service` and `.env.example`.

## 5. Run & verify

```bash
npm run check   # syntax-check all files
npm test        # auth self-test
npm start       # run the panel
```

The panel listens on `0.0.0.0:9120` by default. Health check:

```bash
curl http://127.0.0.1:9120/healthz
# {"ok":true,"mode":"authenticated-live","authConfigured":true}
```

## 6. Interface sections

| Section | Purpose |
|---|---|
| Dashboard | Key metrics, queue, service statuses, chart |
| Operations | Per-source operations (Official API / Playwright / …) |
| Queue | Tickets awaiting confirmation plus the Cancel button |
| Services | Transport & service status lights |
| Log | Audit events (no personal data) |
| Settings | Tabs: Dashboard, Basic, Access, Connection |

## 7. Routing

| Page | URL |
|---|---|
| Dashboard | `#/` |
| Operations | `#/operations` |
| Queue | `#/queue` |
| Services | `#/services` |
| Log | `#/log` |
| Settings | `#/settings` |
| Settings → Basic | `#/settings/basic` |
| Settings → Access | `#/settings/access` |
| Settings → Connection | `#/settings/connect` |

Menu navigation updates the URL; reload stays on the same section; the browser
back/forward buttons work.

## 8. Themes

The theme switcher is at the top right and in Settings → Dashboard. Variants:
**Aurora**, **Light**, **Dark**, **Minimal**. The choice is stored in
`localStorage`.

## 9. Connecting to the bot

Settings → Connection (`#/settings/connect`) shows two groups:

- **IntraService settings** — system URL, login, password (password is masked);
- **Telegram settings** — bot token (masked), admin Chat ID.

The token and password are read **masked** (only "set / not set" is visible) and
are never echoed in responses or logs. This tab does not save changes; edit the
values in the bot's own configuration.

## 10. Queue & cancelling a ticket

The Queue section lists tickets in `preview` / `needs_clarification` (awaiting
creation confirmation). The **Cancel** action:

- exactly mirrors the bot's own two-row update;
- is allowed only for tickets that are not yet created;
- **never** touches already-created tickets (with an `intra_id`) — closing them is
  the bot's job;
- requires a session and a CSRF token.

## 11. systemd

A sample unit lives in `systemd/`. Adjust the working paths for your profile (the
public edition uses `/opt/intraservice-admin-panel`):

```ini
[Service]
Type=simple
WorkingDirectory=/opt/intraservice-admin-panel
ExecStart=/usr/bin/node server.mjs
Environment=PANEL_HOST=127.0.0.1
Environment=PANEL_PORT=9120
Environment=PANEL_TRUST_PROXY=1
Restart=on-failure
```

Then:

```bash
cp systemd/intraservice-admin-panel-preview.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now intraservice-admin-panel-preview.service
systemctl --user status intraservice-admin-panel-preview.service
```

## 12. Updating

```bash
git pull origin main
npm run check
systemctl --user restart intraservice-admin-panel-preview.service
```

`data/auth.json` is not tracked (in `.gitignore`), so the password survives updates.

## 13. Data & backups

The panel creates **no own ticket data** — it reads the bot's databases. Backup
the bot's DBs with the bot's own tooling (e.g. `safe-backup`). The panel auth
store is `data/auth.json` (copy it when migrating).

## 14. Testing

```bash
npm run check        # syntax of server.mjs, auth.mjs, tools/*
npm test             # auth-self-test: login, CSRF, logout — no live data touched
```

Tests never create or modify IntraService tickets.

## 15. Troubleshooting

### Panel does not start / DB read error

- Ensure `sqlite3` is on `PATH`.
- Verify `PANEL_BOT_DB` / `PANEL_MAIL_DB` point to existing files.
- Read is done with `-readonly`; the panel process must be able to read files.

### `/api/config` and settings sections are empty

- The panel cannot read the bot's `config.json` / `intraservice.env` — check
  `PANEL_BOT_DIR`.
- Secrets are intentionally masked: an empty password/token field means "not set"
  or "hidden".

### Cancel buttons inactive / failing

- Requires a logged-in session and a CSRF token.
- Only `preview` / `needs_clarification` can be cancelled; created tickets have no
  button.

### Reload goes back to the dashboard

- Make sure the hash router is used (URLs like `#/queue`). If the URL becomes
  `#/queue`, the panel stays on the section.

### Light is off although the text says "online"

- The dot reflects real service activity (operations within the window); green /
  yellow / grey mean works / fallback (Playwright) / idle. Read the label next to
  the light.

### Port 9120 is busy

- Set another port via `PANEL_PORT`. Check: `ss -ltnp | grep 9120`.

## 16. Security

- admin account with initial-password bootstrap (only an `scrypt` hash on disk);
- mandatory password change before dashboard access;
- 8-hour in-memory sessions in `HttpOnly` / `SameSite=Strict` cookies;
- CSRF protection on every state-changing request;
- login rate limiting and temporary lockout;
- restrictive security headers + `Cache-Control: no-store`;
- credentials are never echoed in logs or responses.

Password submission/change is accepted only over HTTPS, from loopback, or when a
trusted proxy declares `X-Forwarded-Proto: https` (`PANEL_TRUST_PROXY=1`). Do **not**
enable `PANEL_ALLOW_INSECURE_AUTH=1` outside isolated tests.

## 17. Current limitations

- connection and access management are read-only in the public edition;
- the panel never performs IntraService mutations;
- the mail queue counts unique tickets in `mail_watcher.sqlite3` over the last 24
  hours;
- routing is hash-based (works on any static hosting without server rewrites).

## 18. Project layout

```
intraservice-admin-panel/
├── server.mjs                     # HTTP server, bot-DB reads, endpoints
├── auth.mjs                       # scrypt passwords, sessions, CSRF, rate-limit
├── auth-pages.mjs                 # login / setup / change-password pages
├── docs/
│   ├── index.html                 # single-page dashboard
│   ├── ru/MANUAL.md               # Russian manual
│   └── en/MANUAL.md               # this English manual
├── tools/
│   ├── bootstrap-admin.mjs        # create the admin account
│   └── auth-self-test.mjs         # auth self-test
├── systemd/intraservice-admin-panel-preview.service
├── package.json
├── .env.example
└── .gitignore
```

## 19. License

MIT — see `LICENSE`.

---

Related: [IntraService Telegram Bot (public)](https://github.com/Fifth-Ace/intraservice-telegram-bot)
