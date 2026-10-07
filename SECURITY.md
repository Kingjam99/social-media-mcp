# Security

For a vulnerability, use this repository's **Security → Report a vulnerability** private reporting flow when available. For account support, use the support channel on [Publinio](https://www.publinio.com).

Do not disclose credentials or exploit details in a public issue. Describe the affected version, boundary, expected/actual behavior and a redacted reproduction.

## Example boundaries

- The examples call only the configured Publinio HTTPS origin and reject redirects to other destinations.
- OAuth uses PKCE and a validated, single-use state callback bound to loopback.
- Tokens and verifiers are kept in memory; callbacks and token responses are not logged.
- Each example requests its specific scopes and rejects unexpected permission expansion.
- Drafts and scheduling require explicit flags; X reservation has a separate credit flag.
- The hosted service enforces brand access, policy, revision checks, spending and provider validation.

Local input/results may contain private content. Keep them out of commits. Tests are local and perform no paid action or social post. Do not test a vulnerability against customer accounts.
