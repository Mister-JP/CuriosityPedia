# CuriosityPedia documentation writing guide

> Proposed on July 18, 2026 as part of T01. This guide sets the standard for the
> documentation rewrite; it does not by itself approve or apply that rewrite.

## The promise

CuriosityPedia documentation should help a curious first-time reader understand
the product before asking them to understand its implementation. It should also
let contributors, operators, and security reviewers reach precise technical
information without hunting or relying on implied knowledge.

The project will write in layers:

1. Say what the product does in ordinary language.
2. Explain why a concept matters to the reader.
3. Link to the technical mechanism, procedure, or reference.
4. State uncertainty, limitations, and ownership explicitly.

This is progressive disclosure, not omission. Important risks and limitations
must remain easy to find even when implementation detail moves out of the README.

## Write for a reader with a job to do

Every document must name or clearly imply its primary reader and purpose.

| Reader | First question | Primary destination |
| --- | --- | --- |
| User or evaluator | What is this, and what happens when I use it? | `README.md` |
| Contributor | How do I make a safe, testable change? | `CONTRIBUTING.md` |
| Operator | How do I configure, deploy, monitor, stop, and recover it? | `docs/operations/` |
| Security reviewer | What is trusted, what is exposed, and how are incidents reported? | `SECURITY.md`, `docs/security/` |
| Technical reviewer | How do requests, identity, data, and providers fit together? | `docs/architecture.md`, reference docs |

Do not start a page with the history of the implementation when the reader first
needs an outcome. Do not mix several reader journeys into one uninterrupted wall
of text. Provide a short orientation and visible paths instead.

## Separate kinds of documentation

Use the [Diátaxis](https://diataxis.fr/start-here/) distinction deliberately:

- **Tutorials** are learning experiences. They take a new contributor through a
  safe, successful first run.
- **How-to guides** are goal-oriented procedures, such as rotating a key,
  deploying a version, deleting user data, or handling an incident.
- **Reference** is factual and complete: routes, environment variables, schema,
  configuration, ownership, and generated code indexes.
- **Explanation** builds understanding: architecture, trust boundaries, data
  flow, security assumptions, and design decisions.

A page may contain a brief bridge to another kind, but should not force readers
to extract a procedure from an architecture essay or infer architecture from a
setup checklist. Do not create empty category directories merely to look
complete; add a page when it answers a real reader need.

## Put the important thing first

- Lead with the reader's outcome or the system's behavior.
- On the first screen of the README, answer: what is CuriosityPedia, who is it
  for, how does exploration work, and where should each reader go next?
- Prefer short paragraphs, descriptive headings, tables for exact mappings, and
  diagrams only when relationships are clearer visually.
- Use the same term for the same concept. Define unavoidable product or platform
  terms on first use.
- Use active voice and name the actor: “The server checks journey ownership,”
  not “ownership is checked.”
- Use descriptive link text rather than “here” or a raw URL.
- Give procedures prerequisites, ordered steps, a verification step, failure or
  rollback guidance, and an owner.
- Mark generated documents and state the command and source of truth.

These choices follow the scannability and plain-language recommendations in the
[Google developer documentation style highlights](https://developers.google.com/style/highlights),
[Microsoft's guidance on scannable headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings),
and the audience-first approach described by
[The Good Docs Project](https://www.thegooddocsproject.dev/tactic/ia-guide).

## Document security without publishing an exploit recipe

Public documentation should explain the security contract, not provide active
credentials, secret values, private administrative URLs, detection thresholds,
or step-by-step bypass instructions.

Document publicly:

- the assets being protected and the main trust boundaries;
- which operations require guest, signed-in, or operator identity;
- where authorization is enforced and what ownership means;
- categories of data sent to each external service;
- the intended retention and deletion behavior;
- the existence and scope of rate limits, quotas, and cost ceilings;
- how secrets are injected, scoped, redacted, rotated, and revoked;
- safe failure behavior, known limitations, and security assumptions;
- a working private vulnerability-reporting channel and supported versions.

Keep restricted operational material outside the public repository when it would
meaningfully help an attacker, including actual secret identifiers, privileged
account details, recovery codes, exact alert thresholds when sensitive, and
incident evidence containing personal or provider data. The public runbook may
name the responsible role and safe high-level procedure, then point authorized
operators to the restricted system of record.

Security claims must be testable and qualified. Prefer “The public Sites edge
stripped forged identity headers in the July 18, 2026 verification” over “headers
cannot be forged.” Prefer “provider requests set `store: false`” over a broader
claim about provider retention that the application cannot prove.

This policy adopts the lifecycle and least-privilege practices in the
[OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html),
the data-minimization and sanitization guidance in the
[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html),
the verification practices in the
[NIST Secure Software Development Framework](https://csrc.nist.gov/projects/ssdf),
and CISA's expectation of transparent security ownership in
[Secure by Design](https://www.cisa.gov/securebydesign).

## Treat data-flow statements as contracts

For every stored or transmitted data class, documentation should answer:

| Question | Required detail |
| --- | --- |
| What? | Concrete fields or categories, not “usage data” alone |
| Why? | Product, security, billing, or operational purpose |
| Where? | Browser, D1, provider, platform log, or other service |
| Who? | Guest, signed-in user, operator, platform, or provider access |
| How long? | Active retention, deletion trigger, and backup lifecycle |
| How removed? | Soft delete, hard delete, expiry, or provider-controlled deletion |
| What is uncertain? | Decision owner and verification needed |

Distinguish application records from infrastructure logs, browser storage,
provider-side processing, and backups. “Not shown in diagnostics” does not mean
“not stored.” “Deleted from the interface” does not mean “physically erased.”

## Keep docs true

- Link important claims to code, configuration, a test, or an operator-owned
  source of truth.
- Add a “verified on” date to deployment-specific facts.
- Review documentation in the same change as behavior, schema, route, provider,
  secret, retention, or operational changes.
- Run the generated architecture-index check in CI.
- Use a lightweight quarterly audit for links, owner names, version claims,
  security controls, retention, and stale screenshots.
- Remove a document only after its replacement or historical status is clear.
- Archive decision history; do not present a superseded plan as current product
  documentation.

An exemplary large project can make different needs discoverable without forcing
them into one page: the [Kubernetes documentation](https://kubernetes.io/docs/home/)
separates tutorials, concepts, tasks, and reference. The principle—not its scale
or exact navigation—is what CuriosityPedia should adopt.

## Review checklist

Before merging documentation, verify:

- The intended reader and outcome are clear in the opening.
- A non-technical reader can understand the plain-language layer.
- Technical terms are defined or linked.
- Procedures are executable and include verification.
- Security and privacy claims are no broader than the evidence.
- External services and transmitted data are named.
- Retention and deletion language distinguishes UI, database, logs, provider,
  and backups.
- Limitations and unknowns are visible.
- Links, commands, routes, environment variables, and file paths are current.
- No secret, personal data, private endpoint, or exploit-enabling detail appears.
- The change names an owner or source of truth for facts likely to drift.

## Research basis

Sources studied for T01, accessed July 18, 2026:

- Daniele Procida, [Diátaxis in five minutes](https://diataxis.fr/start-here/)
  and [Applying Diátaxis](https://diataxis.fr/application/): organize around
  tutorials, how-to guides, reference, and explanation, each serving a distinct
  user need.
- Jared Bhatti, Sarah Corleissen, Jen Lambourne, David Nuñez, and Heidi
  Waterhouse, [*Docs for Developers*](https://docsfordevelopers.com/): treat
  documentation as a designed product and plan it around audience journeys.
- The Good Docs Project,
  [Let your readers be the guide](https://www.thegooddocsproject.dev/tactic/ia-guide):
  identify readers and their goals before selecting document types.
- Gretchen Hargis et al., [*Developing Quality Technical Information* sample](https://ptgmedia.pearsoncmg.com/images/9780133118971/samplepages/9780133118971.pdf):
  use patterns and progressive disclosure to create clear paths through complex
  information.
- Google, [Developer documentation style guide highlights](https://developers.google.com/style/highlights),
  and Microsoft, [Headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings):
  write conversationally, accessibly, consistently, and for scanning.
- Write the Docs, [Documentation principles](https://www.writethedocs.org/guide/writing/docs-principles/):
  make documentation part of design and implementation rather than a late
  transcription step.
- OWASP, [Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
  and [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html):
  document secret ownership and rotation; minimize, sanitize, protect, and make
  retention explicit for logs.
- NIST, [Secure Software Development Framework 1.1](https://csrc.nist.gov/projects/ssdf):
  maintain evidence, verify software, protect artifacts, and respond to
  vulnerabilities as part of the development lifecycle.
- GitHub, [Secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning):
  scan the full reachable history and use continuous detection rather than
  relying only on `.gitignore`.
- CISA, [Secure by Design](https://www.cisa.gov/securebydesign): make product
  owners accountable for secure defaults and communicate security outcomes
  transparently.

