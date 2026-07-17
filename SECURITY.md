# Security policy

## Reporting

Report vulnerabilities privately through the GitHub account that owns this repository. Include the affected route or module, reproduction steps, impact, and any tested mitigation. Do not open a public issue containing credentials, personal data, or an active exploit.

## Supported version

Only the latest commit on `main` is supported.

## Security boundaries

- Audience input, retrieved pages, model output, and source URLs are untrusted data.
- OpenAI keys, D1 access, identity headers, budget configuration, and provider response details remain server-side.
- API routes enforce identity, ownership, input validation, and idempotency before mutation.
- Citations are accepted only when they map to normalized provider-returned sources.
- Failed or incomplete research operations do not commit a ready turn.
- Logs and diagnostics exclude prompt bodies, answer bodies, credentials, and raw provider payloads.
