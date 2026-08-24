# Contributing

1. Fork the repository and create a focused branch.
2. Never use a real production helpdesk for tests.
3. Add or update deterministic self-tests.
4. Run `npm install && npm run ci`.
5. Confirm that no credentials, internal URLs, personal data, cookies, browser
   profiles, databases or logs are present in the diff.
6. Open a pull request describing safety implications.

The panel reads the bot's databases read-only except for the explicit
queue-cancel action. Any change must preserve that boundary: no new writes into
bot databases, no IntraService mutations, and credentials must stay masked in
responses and logs.
