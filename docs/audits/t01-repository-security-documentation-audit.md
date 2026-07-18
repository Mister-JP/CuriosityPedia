# T01 repository, security, hygiene, and documentation audit

**Audit date:** July 18, 2026<br>
**Repository:** `Mister-JP/CuriosityPedia` at `14ff102` (`main`)<br>
**Production surface checked:** `https://curiositypedia.jigs.chatgpt.site`<br>
**Status:** Audit deliverables ready for approval; remediation and core-document
rewrite have not been approved or applied.

## Executive summary

The repository has a sound basic server boundary: provider credentials are kept
server-side, D1 queries are parameterized, journey reads and writes generally
bind ownership, mutations check browser origin signals, CI uses read-only GitHub
permissions, and no high-confidence secret pattern was found in the current tree
or reachable Git history. A live negative test also showed the public Sites edge
stripping forged ChatGPT identity headers.

The largest risk is cost abuse, not a leaked key. Personalized starter generation
and question redraw call OpenAI without the live-research quota or project-budget
gate. The live-research gate is also a check against already-recorded usage, not
an atomic reservation. A caller can rotate guest cookies and issue parallel work
before spend is recorded. The documented `$25` project budget therefore is not a
reliable worst-case ceiling. This should move directly into T02 remediation.

Repository protections also need attention: `main` is unprotected; Dependabot
and vulnerability alerts are disabled; no code-scanning analysis exists; private
vulnerability reporting is disabled; and current dependencies produce twelve
`npm audit` findings, including six high-severity advisories concentrated in
development/build tooling.

The documentation system is technically useful but not ready for the proposed
CuriosityPedia audience. The README opens with framework and persistence details,
omits reader paths, and does not explain the experience in plain language. The
architecture guide omits the browser-to-Civitai trust boundary and overstates
quota coverage. Logging, retention, deletion, backups, secret rotation, incident
response, and operational ownership are incomplete or absent.

No tracked files were deleted and none of the five core documents were rewritten.
That is intentional: T01 requires the audit and structure to be approved first.

## Scope and method

The audit reviewed:

- the current worktree, reachable Git history, tracked and ignored paths, file
  sizes, exact duplicate hashes, imports, generated assets, and file modes;
- `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/architecture.md`, and
  generated `docs/code-index.md` as one system;
- server routes, identity resolution, origin checks, ownership predicates,
  provider transports, usage policy, diagnostics, retention behavior, schema,
  deployment packaging, CI, and public response headers;
- GitHub repository settings visible through the authenticated API;
- the public landing page, health endpoint, guest identity behavior, and a safe
  negative identity-header test;
- `npm audit`, the generated architecture check, and a redacted high-confidence
  secret-pattern scan across every reachable commit.

The audit did **not** inspect production D1 rows, OpenAI Sites administrative
settings, stored platform secrets, private infrastructure logs, backup consoles,
provider account settings, billing alerts, or deletion behavior in backups. It
did not run destructive, load, concurrency, or cost-consuming provider tests.
Those items require operator evidence and are marked accordingly.

### Severity and confidence

- **Critical:** immediate compromise, uncontrolled destructive access, or
  demonstrated unbounded material loss.
- **High:** practical unauthorized spend, sensitive-data exposure, or a missing
  control with significant impact.
- **Medium:** meaningful defense, privacy, operations, or integrity weakness that
  needs planned remediation.
- **Low:** hygiene or hardening issue with limited direct impact.
- **Confidence:** high means directly verified in code/configuration or by a safe
  live test; medium means strong evidence with an unverified platform assumption;
  low means a lead requiring more evidence.

## Security and repository findings

| ID | Severity | Confidence | Finding | Evidence and impact | Recommended action |
| --- | --- | --- | --- | --- | --- |
| T01-S01 | High | High | OpenAI-backed starter refresh and question redraw bypass usage and project-budget enforcement. | `app/api/starters/route.ts` accepts `refresh=1` on `GET`; `lib/starter-recommendations.ts` calls OpenAI on refresh or cache miss. `lib/live-redraw.ts` calls the user-selected model. Both record usage after the call but do not run the gates in `lib/live-repository.ts`. Repeated calls can spend the owner’s key outside the advertised ceiling. | Treat as the first T02 fix. Put every provider operation behind one atomic server-side authorization and spend-reservation service. Make refresh a mutation, rate-limit it, and constrain eligible models. |
| T01-S02 | High | High | The rolling project budget is not a hard ceiling under guest rotation or concurrency. | Guest identity is cookie-based and a missing cookie creates a new identity. Per-identity leases and limits do not aggregate callers. Project and identity spend are read before a request, while cost is recorded later. Parallel new identities can all pass the same preflight value. | Atomically reserve worst-case cost before every provider call, settle actual cost afterward, reject when available balance is insufficient, add per-IP/device abuse controls, and provide an emergency provider-disable switch. |
| T01-S03 | High | High | Current dependency graph has known advisories. | `npm audit` reported 12 vulnerabilities: 6 high, 5 moderate, 1 low, 0 critical. High findings flow mainly through direct development/build dependencies `@cloudflare/vite-plugin`, `vite`, and `wrangler`, with vulnerable `miniflare`, `undici`, and `ws`. No production exploitability was demonstrated. | Update the compatible direct tooling versions in a focused change, re-run the full test/build suite, triage the older `drizzle-kit` chain separately, and enable continuous alerts. |
| T01-S04 | Medium | High | GitHub repository safeguards are largely disabled. | Repository is public. `main` has no protection or ruleset. Vulnerability alerts and Dependabot alerts are disabled, private vulnerability reporting is disabled, and the code-scanning API reports no analysis. CI does use `permissions: contents: read`, which is good. | Require CI and review on `main`; block force pushes/deletion; enable vulnerability, Dependabot, secret scanning/push protection where available, private reporting, and CodeQL or equivalent. Pin third-party Actions to full commit SHAs. |
| T01-S05 | Medium | High | Data retention and deletion behavior is incomplete and differs from what a reader may infer. | Journey deletion is a soft delete only. Failed `research_requests`, identities, and several related records have no cleanup path. Provider usage cleanup is opportunistic on later writes; diagnostics merely stop displaying older failed requests. No backup-deletion lifecycle is documented. | Define the T03 data inventory and retention schedule, then implement scheduled hard deletion or documented retention exceptions. Distinguish UI hiding, soft deletion, database erasure, provider processing, logs, and backups. |
| T01-S06 | Medium | High | Civitai is an undocumented client-side external service and trust boundary. | Production config enables the gallery. The browser fetches `civitai.com/api/v1/images` and loads `image.civitai.com` assets directly. `docs/architecture.md` describes flows only to D1 and OpenAI and calls OpenAI the only enabled live provider. Remote tags and `nsfw=None` are used for moderation, but no product privacy or availability statement exists. | Add Civitai to the architecture/data-flow inventory, document browser IP/service exposure and local cache behavior, assess content/licensing/moderation expectations, and consider a first-party proxy or explicit preference. This also informs T09. |
| T01-S07 | Medium | High | Public web responses lack an explicit application security-header baseline. | The live landing response did not include Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, or a frame restriction. The research stream and export add `nosniff`, but ordinary HTML relies on platform defaults. | Define and test a compatible CSP and baseline headers at the Worker/app boundary. Include `frame-ancestors`, referrer policy, permissions policy, HSTS after domain ownership is confirmed, and `nosniff`. Account for fonts, Civitai, and Sites behavior. |
| T01-S08 | Medium | Medium | Logging is ad hoc and its privacy guarantees are not enforceable. | Code uses raw `console.error` with caught error objects. Citation mismatch logs consulted and cited URLs. There is no centralized field allowlist, redaction boundary, retention configuration, or documented log destination. The current security statement excludes some content categories but does not identify platform log behavior. | Introduce a structured safe logger with explicit fields and redaction tests. Obtain Sites/Cloudflare evidence for destination, access, retention, and deletion before making a public guarantee. |
| T01-S09 | Medium | High | The vulnerability-reporting instruction does not provide a working private channel. | `SECURITY.md` says to report “through the GitHub account that owns this repository,” but gives no address or form. GitHub private vulnerability reporting is disabled. | Enable private reporting or publish a monitored security address, response expectations, safe-harbor language, scope, and supported version policy. |
| T01-S10 | Low | High | A provider-costing action uses `GET`, and read routes create persistent guest identities. | `/api/starters?refresh=1` performs provider and D1 writes on `GET`. Any `query()` route can create and persist a guest identity when no cookie is supplied. This breaks safe-method expectations and enables database junk creation by crawlers or cookie-less clients. | Move refresh to a same-origin `POST`; avoid persisting an identity until state is needed, or add bounded anonymous-session cleanup and edge rate limits. |
| T01-S11 | Low | High | The health endpoint exposes more implementation detail than operationally necessary. | `/api/health` publicly returns product phase and a detailed capability map. This is not a secret, but it increases drift and reconnaissance value without proving dependency health. | Return a minimal liveness result publicly; place detailed readiness/version diagnostics behind operator access or a deployment manifest. |
| T01-S12 | Low | High | Repository root and history carry avoidable generated binary weight. | Reachable loose objects occupy about 65 MiB. Two root `.codex-redraw-*` screenshots are tracked and unreferenced. One artifact pair is byte-for-byte duplicate. Large historical image sets are not indexed or governed. | Apply the approved asset policy below. Add an asset manifest and lifecycle rule; keep editable sources and selected evidence, archive the rest, and delete only verified duplicates/junk. |

### Controls verified as present

- No high-confidence OpenAI, GitHub, AWS, or private-key pattern was found in the
  current tree or reachable history. Only `.env.example` appeared among
  secret-adjacent historical paths, and it contains placeholders.
- `.env.local`, build output, Wrangler state/logs, browser test artifacts, and
  TypeScript build metadata are ignored.
- `OPENAI_API_KEY` is read through the server runtime binding and is not prefixed
  for browser exposure. Provider calls set `store: false`.
- D1 statements reviewed use parameter binding. Journey access and mutations
  generally include `owner_identity_id` checks.
- Mutations reject cross-site browser requests and mismatched origins. Guest
  cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` outside local development.
- A forged public request containing all expected ChatGPT identity headers still
  resolved as a guest; the same request to diagnostics received `AUTH_REQUIRED`.
  This verifies edge stripping for the tested production path, not every future
  deployment topology.
- CI has a 15-minute timeout and repository read-only permission. The generated
  module index matched the current imports.
- No world-writable repository file, `eval`, `new Function`, or
  `dangerouslySetInnerHTML` use was found in the reviewed application code.

## Repository and asset disposition inventory

No item in this table has been moved or removed. “Delete” means the audit has
evidence that the item is redundant or generated junk; deletion still waits for
approval and a clean verification diff.

| Path or group | Disposition | Confidence | Reason / confirmation needed |
| --- | --- | --- | --- |
| `app/`, `lib/`, `db/`, `drizzle/`, `worker/`, `build/`, `tests/` | Keep | High | Current runtime, persistence, build, and test sources; all are represented in the generated dependency index or build config. |
| `scripts/architecture-index.mjs`, `docs/code-index.md` | Keep | High | Active generated reference with a passing freshness check. Preserve generator/source relationship. |
| `.github/workflows/ci.yml`, `.openai/hosting.json`, lock/config files | Keep and harden | High | Active build/deployment configuration. Add protection/scanning and document which values are identifiers versus secrets. |
| `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/architecture.md` | Update after approval | High | Current sources contain useful facts but have the audience, accuracy, and gap issues listed below. |
| `docs/code-index.md` heading and cross-links | Update through generator after name approval | High | Content is current; branding and documentation-index links will need generated changes, not hand edits. |
| `docs/CuriosityPedia_Final_Product_and_Engineering_Blueprint_v3_Research_First.docx` | Archive | High | Its own text calls it a planning baseline, while the app links it as “Product book.” Preserve as dated decision history, remove it from the live product’s primary help path, and replace that link with current user-facing material. |
| `design/**/*.excalidraw` and their generator scripts | Keep selected sources; archive superseded concepts | Medium | Editable source and reproducibility are valuable, but 24 boards mix current architecture, abandoned landing concepts, and exploration history. Product/design owner must mark the canonical current set. |
| `design/**/*.svg` and `design/**/*.png` | Keep one review format per canonical board; archive other exports | Medium | Most are generated exports and some are very large. Keep only the format needed for repository review once canonical boards are named. Do not delete while docs or design decisions may still depend on them. |
| `artifacts/answer-surface-audit/` | Archive after selecting final evidence | Medium | Eleven sequential screenshots document iteration but are not linked by an index. Keep the final comparison and any required evidence; archive intermediate captures. |
| `artifacts/journey-map-audit/`, `artifacts/journey-map-implementation/`, `artifacts/journey-graph-research/` | Archive after selecting final evidence | Medium | Thirty-two captures are historical QA/design evidence with no manifest. Several JPG/PNG variants appear visually related; only one exact duplicate is proven. |
| `artifacts/journey-map-implementation/04-mobile-full.jpg` | Delete after approval | High | Byte-for-byte identical to `03-mobile-full.jpg` (same SHA-256). Keep the earlier named file and verify no external link before removal. |
| `.codex-redraw-inline-comparison.jpg`, `.codex-redraw-inline-qa-1774x888.jpg` | Delete after approval | High | Generated QA captures at repository root, not referenced by code, docs, scripts, or app. They do not belong in the root even if retained elsewhere. |
| `public/og.png`, `app/icon.svg` | Keep and update with branding | High | Active product/social assets. Revisit only after the T04 name and brand decision. |
| `.env.example` inactive `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY` entries | Delete or move to a provider-development example after approval | High | No adapters consume them. Empty placeholders create noise and imply supported integrations. Keep only if a near-term provider plan has an owner. |
| Ignored local `dist/`, `.vinext/`, `.wrangler/`, `.playwright-cli/`, `output/`, `outputs/`, `audit/`, `tsconfig.tsbuildinfo` | Keep ignored; local cleanup optional | High | Correctly excluded generated/local evidence. They are not repository hygiene defects. Do not delete automatically because they may contain active local work. |
| Untracked `docs/post-reset-product-roadmap.md`, `docs/curiositypedia-user-experience.md` | Preserve | High | User-owned planning material present before this audit. The roadmap is the authority for T01; neither file was modified. Decide tracking separately. |

### Asset policy proposed

1. Add a small manifest for every retained design/audit collection: purpose,
   owner, created date, source file, generator, canonical output, and status.
2. Keep editable source plus one lightweight review export for current designs.
3. Move superseded but decision-relevant material under a dated `docs/archive/`
   index or external artifact storage; do not mix it with product reference.
4. Keep transient browser screenshots and iterative renders out of the repository
   unless a test, issue, or decision record names them as evidence.
5. Verify repository references and external links before every removal; run the
   full validation suite after the change.

## Documentation gap analysis

| Document | What works now | Gap or contradiction | Proposed role |
| --- | --- | --- | --- |
| `README.md` | Concise stack, setup, validation, layout, deployment, and policy links | First screen is technical rather than product-first; no audience paths; “browser calls only application routes” conflicts with direct Civitai requests; quota wording implies broader protection than exists; no data/privacy/limitations orientation | Product orientation and reader router, followed by minimal evaluator demo and contributor quick start |
| `SECURITY.md` | Identifies several untrusted inputs and server-side assets; tells reporters not to publish sensitive material | No usable private channel, response expectations, scope, safe harbor, dependency policy, or known assumptions; logging and quota claims are not evidence-linked | Vulnerability disclosure policy plus short security posture and links to detailed security explanation |
| `CONTRIBUTING.md` | Clear change/test workflow and compatibility constraints | No environment isolation guidance, secret scanning, dependency update process, docs-as-code rule, generated-asset policy, threat-model trigger, review requirements, or incident escalation | Contributor how-to and merge checklist |
| `docs/architecture.md` | Strong module, route, transaction, schema, localization, and build overview | Omits Civitai/browser storage, edge trust boundary, header provenance, cost paths outside live research, retention/deletion, log destination, backups, failure operations, and deployment verification owner | Explanation of system/context/trust boundaries with links to reference and operations |
| `docs/code-index.md` | Accurate, generated local module dependency map | Not an API/data/config reference; title is old brand; does not explain scripts/assets by design; lacks link to a docs index | Generated code reference only; never ask it to carry architecture or onboarding |
| Missing | — | No docs landing/index, user/evaluator guide, data inventory, retention schedule, threat model, environment/config reference, API reference, operations runbooks, incident/deletion/backup procedures, known limitations, decision record index, or asset manifest | Add only the approved pages in the information architecture below |

### Claims that require operator evidence

Before revised docs make these claims, the operator must provide or verify:

- where OpenAI Sites/Cloudflare request and application logs are visible, which
  fields they contain, who can access them, and their actual retention/deletion;
- where `OPENAI_API_KEY` and the D1 binding are configured, who can read/change
  them, how rotation and emergency revocation work, and whether audit records
  exist;
- production deployment permissions, release identity, rollback behavior, and
  whether the deployed version can be tied to an exact Git commit;
- D1 backup/restore behavior, backup retention, deletion propagation, recovery
  objectives, and the last successful restore test;
- edge rate limits, bot protection, billing alerts, provider project limits, and
  emergency disable controls outside this repository;
- ChatGPT identity-header guarantees for preview/custom-domain deployments, not
  only the tested production hostname;
- Civitai terms, licensing/attribution, moderation, caching, availability, and
  privacy expectations appropriate to this product.

## Proposed information architecture

The structure applies the project writing guide and uses reader journeys first,
then separates learning, procedures, explanation, and reference.

```text
README.md                         product story, experience, reader paths, quick start
SECURITY.md                       private reporting, supported scope, posture links
CONTRIBUTING.md                   safe change and review workflow
docs/
  index.md                        documentation map by reader and task
  getting-started.md              contributor tutorial
  experience.md                   user/evaluator explanation and limitations
  architecture.md                system, request, identity, and trust-boundary explanation
  data-and-privacy.md             data inventory, flows, retention, deletion, providers
  security/
    threat-model.md               assets, actors, boundaries, abuse cases, controls, assumptions
    secret-management.md          public-safe lifecycle and operator ownership
  operations/
    deployment.md                 build, deploy, verify, roll back
    monitoring-and-logs.md        signals, safe fields, access, retention, alerts
    cost-and-abuse-controls.md     quotas, reservations, rate limits, kill switch
    backup-restore-deletion.md     backup, restore test, deletion propagation
    incident-response.md           triage, containment, rotation, communication, recovery
  reference/
    configuration.md              environment variables and bindings
    api.md                        routes, methods, auth, mutation, errors, limits
    data-model.md                 D1 tables, ownership, lifecycle
  code-index.md                   generated module graph
  decisions/                      short dated architecture/operations decisions
  archive/index.md                superseded plans and design evidence, clearly labeled
```

Not all pages should be created empty. The first approved rewrite should create
the index and only the pages needed to make current claims accurate: experience,
architecture, data/privacy, threat model, configuration, cost/abuse operations,
and deployment/incident basics.

### Ownership rules

- README owns the plain-language product description and routing, not exhaustive
  setup, architecture, or policy.
- SECURITY owns reporting and supported scope; the threat model owns technical
  assumptions and control rationale.
- Architecture owns relationships and data flow; reference owns exact routes,
  fields, variables, tables, and defaults.
- CONTRIBUTING owns the development workflow; operations owns production actions.
- Data/privacy owns collection, purpose, access, retention, and deletion. Other
  pages link to it instead of restating drifting summaries.
- Code index remains generated and factual; decisions and history never masquerade
  as current reference.

## Proposed rewrite sequence

1. Remediate or explicitly limit T01-S01 and T01-S02 so documentation does not
   normalize a known false cost guarantee.
2. Obtain the operator evidence listed above and assign owners.
3. Approve the information architecture, archive policy, product description,
   and vocabulary. Continue using CuriosityPedia in current docs until T04 confirms
   the CuriosityPedia name, or label the proposed name clearly.
4. Rewrite the README first screen and add `docs/index.md` with audience paths.
5. Correct architecture and add the data/privacy, threat-model, configuration,
   and cost/abuse pages.
6. Expand SECURITY and CONTRIBUTING without duplicating the deeper pages.
7. Update the generated code-index template and regenerate it.
8. Have a non-technical reviewer describe the product and a technical reviewer
   locate architecture, data, secrets, logging, and operations without help.
9. Verify every deployment-specific claim against production and record the date.

## Approval decisions

The audit can move to remediation and rewrite when the owner decides:

1. **Cost-risk priority:** approve immediate T02 remediation for all provider
   operations and atomic spend reservation before documentation rewrite.
2. **Repository controls:** approve branch protection/rulesets, vulnerability and
   Dependabot alerts, code scanning, secret scanning/push protection where
   available, and private vulnerability reporting.
3. **Documentation structure:** approve the proposed information architecture and
   ownership rules.
4. **Asset lifecycle:** approve deletion of the one exact duplicate and two root
   QA screenshots, and choose repository archive versus external storage for
   superseded design/audit collections.
5. **Operational evidence:** name the person who can verify Sites, D1, provider,
   logging, backup, billing, and incident details.
6. **Brand timing:** decide whether the documentation rewrite waits for T04 or
   uses “CuriosityPedia (currently CuriosityPedia)” until the name is confirmed.

## Verification record

Commands and checks completed without printing secret values:

- `git status`, remote/default-branch inspection, reachable-history path scan,
  high-confidence redacted secret-pattern scan, file mode and duplicate checks;
- GitHub API checks for visibility, rulesets/branch protection, vulnerability
  alerts, Dependabot, code scanning, and private vulnerability reporting;
- `npm audit --json`;
- `npm run architecture:check`;
- `npm run lint` (passes with three pre-existing unused-variable warnings in
  design-generation scripts);
- `npm run typecheck`;
- `npm test` (production build and all 54 automated tests passed);
- static review of routes, repositories, identity, provider, usage, logging,
  schema, Worker, CI, and deployment package config;
- public response-header and health checks;
- safe negative identity-header test against bootstrap and diagnostics;
- live availability checks for every external source linked from the writing
  guide (all returned HTTP 200 on July 18, 2026).

The two new audit documents passed formatting, link, build, type, test, and
generated-index checks. Core documentation and repository settings remain
unchanged pending the decisions above.
