# Contributing

1. Fork the repository and create a focused branch.
2. Never use a real production helpdesk for tests.
3. Add or update deterministic self-tests.
4. Run `npm install && npm run ci`.
5. Confirm that no credentials, internal URLs, personal data, cookies, browser
   profiles, databases or logs are present in the diff.
6. Open a pull request describing safety implications.

The panel reads bot databases except for queue cancellation. Configuration writes
must stay explicitly gated and allowlisted, with preview, backup, atomic write,
CSRF protection and masked credentials. IntraService ticket mutations are out of scope.
