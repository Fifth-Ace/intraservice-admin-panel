# Security policy

## Reporting a vulnerability

Do not open a public issue for credential exposure or an access-control bypass.
Use GitHub private vulnerability reporting for this repository.

## Secrets

Never commit `.env`, `config.json`-like credentials, SQLite databases of the
bot, logs, or Telegram/IntraService credentials. The examples and `.env.example`
contain placeholders only. The admin panel masks bot credentials and never echoes
tokens or passwords in responses or logs.

## Admin access

The dashboard is protected by a local admin account (salted `scrypt` hash on
disk), an initial-password bootstrap, mandatory password change, 8-hour
`HttpOnly`/`SameSite=Strict` sessions, CSRF on every state-changing request, and
login rate limiting. Password submission is accepted only over HTTPS, from
loopback, or when a trusted proxy declares `X-Forwarded-Proto: https`
(`PANEL_TRUST_PROXY=1`). Do not enable `PANEL_ALLOW_INSECURE_AUTH=1` outside
isolated tests.

## Queue-cancel safety

The panel can cancel only tickets still in `preview` / `needs_clarification`.
It never cancels or closes already-created tickets (those without an `intra_id`
are the only ones reachable). Cancellation mirrors the bot's own two-row update
and requires a session plus a CSRF token.

## Boundary

The public edition is read-only by default except for queue cancellation. The
optional configuration writer is explicitly gated, allowlisted, CSRF-protected,
previewed, backed up and atomic. It never performs IntraService ticket mutations
or exposes secret values and personal journals.
