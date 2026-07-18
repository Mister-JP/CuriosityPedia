# T02 Guest Abuse and Operational Requirements Assessment

**Status:** Bounded assessment and the approved discovery pass were completed July 18, 2026. Policy approval and implementation remain pending.

**Scope:** Remaining cost-abuse exposure created by unauthenticated guest access, the admission surfaces for OpenAI-backed work, and the minimum operational controls needed to run those surfaces safely.

**Out of scope:** Runtime changes; quota amounts; prices; model access; retries; redraw behavior; guest or ChatGPT identity policy; privacy or retention policy; raw-IP collection; device fingerprinting; T01B Slice 10; and restructuring `lib/live-repository.ts`.

## Executive finding

The three completed T02 control slices materially reduce cost and concurrency risk:

- `lib/usage-policy.ts` defines the current guest and ChatGPT model, spend, live-run, and library policy.
- `lib/provider-cost-control.ts` atomically admits every OpenAI call against per-identity and rolling project spend, then settles known usage or retains an uncertain hold.
- foreground live research has a renewable fenced lease, single-winner targeted takeover, cooperative cancellation, and stale-worker commit rejection.

The remaining high-confidence gap is not another lease or provider-call accounting problem. A caller can omit, delete, or replace `wd_guest`; the next API request creates a new guest identity, and all per-identity allowances begin again. Atomic project reservation prevents parallel guest identities from collectively reserving beyond the configured rolling project threshold, subject to documented single-call envelope limitations, but one caller can consume that shared allowance and deny service to other users. No application-level control currently groups multiple guest identities by a privacy-reviewed caller signal.

Operational readiness is also incomplete. The application has an emergency OpenAI switch and durable cost records, but it has no operator-only aggregate cost/abuse view, automated alert path, documented incident owner, verified provider-account hard limit, or approved retention design for any future abuse signal. The signed-in diagnostics route is an identity-scoped product feature, not an operations console.

No identity, privacy, retention, quota, or request-admission behavior should change until the policy groups below are explicitly approved.

## Verified behavior

The following statements describe the repository inspected on July 18, 2026.

### Guest identifier lifecycle

- `lib/viewer.ts` uses a 32-byte cryptographically random guest token in the `wd_guest` cookie. D1 stores a SHA-256-derived subject, not the raw token.
- A newly issued cookie is `HttpOnly`, `SameSite=Lax`, path-wide, and has a 30-day `Max-Age`. It is marked `Secure` when the request is considered HTTPS. No application code reads a raw IP address, forwarded client-IP header, or device fingerprint to resolve the viewer.
- A missing or unknown cookie creates a new guest identity immediately. There is no proof-of-work, challenge, edge admission assertion, network bucket, or other caller-level gate before that write.
- Deleting or withholding the cookie therefore creates a new `identity_id`. Live-run counts, identity spend, starter cache, preferences, saved journeys, the active foreground lease, and provider-cost reservations are all scoped to the new identity.
- The stored `identities.expires_at` value is presented to the browser, but guest lookup does not require it to be in the future. Normal browser expiry removes the cookie after 30 days; replay of the same still-valid token is not rejected by the application solely because the D1 expiry has passed. There is no direct characterization test for this identity-resolution path.
- Signing in does not silently merge guest data. If the browser still has the guest cookie, the signed-in viewer can explicitly transfer eligible journeys. A successful transfer clears the guest cookie. Other guest-scoped records and their cost history are not reassigned by that journey transfer.
- Cookie rotation would not by itself solve quota evasion. Rotating a strong token while retaining the same identity can improve session hygiene, but a caller can still discard it. Binding the guest to a stable fingerprint would create a new privacy and identity policy and is not authorized.

### Provider-call admission

- Every current OpenAI operation reserves cost through `lib/provider-cost-control.ts`: live research, its separately admitted retries and repair/recovery work, starter generation, and question redraw.
- Admission uses one conditional D1 insert against both the identity allowance and the rolling project allowance. Settled, reserved, and uncertain cost is counted; released reservations are not. Reservation persistence is fail-closed.
- A known provider usage payload settles to actual estimated cost even when it exceeds the original hold. An ambiguous outcome keeps the full hold. The provider cannot be given a maximum-dollar limit, so the rolling project threshold is a strong admission bound, not proof of an exact billing ceiling.
- The project allowance is shared across identities. This contains aggregate parallel reservation despite guest churn, but it also makes budget exhaustion a project-wide denial of service.
- Live research additionally has a rolling per-identity request count and one active fenced lease. Failed live requests do not consume that live-run count, although any provider attempts remain represented by cost reservations.
- Starter generation and redraw use the identity/project spend gate but do not consume the live-research count. This is internally consistent with the current policy, but means the spend allowance is their only current abuse ceiling.
- `GET /api/starters` can cause provider work on a cache miss, and `refresh=1` deliberately bypasses the cache. A fresh guest identity has no cache. The route is read-shaped and does not run the same-origin mutation check. Generation failures fall back to static starters after recording or retaining the cost outcome.
- Question redraw is a same-origin mutation and requires an owned journey. Live research is also a same-origin mutation. Same-origin checks reduce browser cross-site mutation risk but do not authenticate an automated client or prevent cookie churn.
- Idempotency and unique provider call keys prevent accidental replay within their intended scope; they do not stop a caller from supplying fresh keys. Starter reservations intentionally include a new random component for each generation attempt.

### Privacy and stored signals

- The application database contains identity, request, provider-call, journey, and usage records that can support aggregate cost analysis. None of those records groups newly created guest identities into one caller.
- Application code does not currently collect raw IP addresses or device fingerprints for abuse control. This assessment does not establish what OpenAI Sites, Cloudflare, the provider, or other platform logs may collect; that requires vendor and deployment evidence.
- `provider_usage_events` is opportunistically deleted after 30 days when a later provider event is written. `research_requests`, identities, provider cost reservations, and most related records have no equivalent cleanup in the inspected path.
- Raw `console.error` calls remain. Their destination, access controls, redaction, and retention are not established in repository evidence, so application logs should not become the abuse-control data store.
- Guest users cannot open `/api/diagnostics`. Signed-in diagnostics show only the current identity's failed live requests and selected provider metadata; they do not report project-wide spend, guest churn, or abuse patterns.

### Configuration and operations

- `CURIOSITYPEDIA_OPENAI_ENABLED=false` stops every OpenAI-backed operation through the shared transport/admission boundary. Missing or unrecognized values leave OpenAI enabled.
- `CURIOSITYPEDIA_DAILY_BUDGET_USD` configures the rolling project admission threshold. A missing, non-finite, zero, or negative value falls back to the current default rather than disabling spend.
- The public health route reports static capabilities. It does not verify D1 connectivity, provider availability, migration level, current budget consumption, reservation settlement health, or the emergency-switch state.
- The repository has CI validation but no repository-defined scheduled monitor, aggregate alert, automated budget response, or abuse incident runbook.
- Deployments containing these controls must apply `drizzle/0010_condemned_red_ghost.sql` and then `drizzle/0011_bent_wind_dancer.sql` before the application version serves traffic.

## Threat and cost-abuse model

| Actor or failure | Current containment | Remaining exposure |
| --- | --- | --- |
| Curious user clears the guest cookie | Each provider call still reserves against the project allowance | Per-identity allowances reset and prior library/session continuity is lost |
| Script creates many guest identities | Atomic project reservation and the emergency switch bound admission | One caller can consume the shared allowance; no challenge or cross-identity caller bucket exists |
| Parallel requests race | Atomic cost reservation and live-research lease select bounded winners | Non-live provider operations have no caller concurrency control beyond spend admission |
| Cross-site page induces work | Mutation routes check origin/site; cookie is `SameSite=Lax` | Starter generation is reachable through a GET, including explicit refresh and fresh-identity cache miss |
| Provider response is ambiguous | Full reservation remains held for the rolling window | Actual external charge can differ; frequent ambiguity can exhaust availability without an alert |
| Worker crashes after reservation | The hold remains authoritative and ages out of the rolling window | There is no automated reconciliation or alert for unusually old `reserved` rows |
| Guest session token is replayed after its displayed expiry | Random token secrecy remains the authorization factor | D1 expiry is not enforced during lookup; intended expiry semantics are undefined |
| Shared network contains many legitimate users | No IP-based blocking currently harms them | A future per-IP hard identity limit could create false positives and must not be assumed safe |
| Application-level budget is misconfigured or exhausted | Default threshold and emergency switch exist | Invalid configuration silently falls back; no pre-deploy assertion or operator notification is defined |

## Proposed policy for approval

The following is a recommendation, not authorization to implement it.

### 1. Preserve the existing identity and cost boundaries

- Keep the strong random guest cookie as the guest library/session credential. Do not turn IP address, user agent, or a fingerprint into a durable identity.
- Keep per-provider-call atomic cost reservation authoritative and separate from caller abuse admission.
- Keep the foreground lease scoped to one resolved identity. Do not add network or device semantics to `lib/live-repository.ts`.
- Treat cookie security rotation, guest expiry, guest-data retention, and cross-identity abuse admission as separate decisions. They may share an operational rollout, but they do not share one correctness mechanism.

### 2. Add a privacy-minimized caller admission layer before expensive work

Preferred order:

1. Evaluate a managed edge rate-limit/bot-challenge control that can protect expensive route classes without exposing raw network identifiers to application code. Before approval, verify what the platform observes, stores, exposes, retains, and permits operators to access.
2. If the platform cannot provide the required control, design an edge-only, short-lived pseudonymous bucket. A possible design is a keyed digest over a coarse network signal and a rotating time epoch, with the raw input never written to D1 or application logs. The exact input, truncation, secret custody, rotation, collision behavior, retention, access, and user appeal path require privacy/security approval.
3. Use graduated response: allow ordinary traffic, throttle bursts, then challenge or temporarily reject. Do not equate one network bucket with one person, because schools, libraries, workplaces, carriers, VPNs, and households share addresses.
4. Do not use canvas, font, hardware, behavioral, or other stable device fingerprinting for this task.

This admission layer should distinguish route cost classes, at minimum:

- guest identity creation and bootstrap/read traffic;
- starter cache reads versus provider-backed starter generation;
- foreground live-research acquisition;
- question redraw; and
- automatic supplemental calls, which remain admitted internally through the owning workflow and cost reservation rather than as new public requests.

Exact rates, bursts, challenge thresholds, and exemptions are quota/request-admission policy and remain unapproved. They should be selected from observed legitimate traffic and the owner's loss/availability budget, not copied from the existing per-identity amounts.

### 3. Make provider-backed starter generation an explicit mutation

- Keep cached/static starter reads safe and inexpensive.
- Move manual refresh and any request that may generate a new provider response behind a same-origin mutation contract with a bounded idempotency key.
- Return the fallback set without provider dispatch when the caller admission layer or cost reservation rejects generation.
- Preserve the current model, output, cache lifetime, and fallback behavior unless separately approved.

This closes a request-semantics gap; it is not a substitute for caller abuse admission because scripts can make valid same-origin requests directly.

### 4. Decide guest expiry semantics explicitly

Recommended policy question: is 30 days an absolute authorization lifetime, an inactivity lifetime, or only a browser-cookie lifetime?

- If absolute expiry is approved, reject an expired guest subject during lookup and issue a new guest identity/cookie without silently moving data.
- If inactivity renewal is approved, define the renewal event and maximum absolute lifetime; do not let ordinary reads move the displayed date indefinitely by accident.
- If token rotation is approved, rotate within the same identity so rotation itself does not reset quotas, and define overlap/replay behavior.
- Keep journey transfer explicit. Decide deletion/retention of the expired or upgraded guest's non-journey records under T03 rather than as an abuse-control side effect.

The current code and UI imply a scheduled 30-day lifetime but do not enforce it server-side. Correcting that mismatch changes identity and data-access policy and therefore needs owner approval.

### 5. Define operator safeguards before public scaling

Minimum production requirements:

- a named owner for provider spend and abuse incidents, with a tested path to set `CURIOSITYPEDIA_OPENAI_ENABLED=false`;
- a verified provider-project billing limit or equivalent external loss control, plus provider-side alerts independent of the application;
- pre-deploy validation of the emergency-switch value, project threshold, D1 binding, and migration level;
- aggregate, operator-only views of rolling reserved/uncertain/settled project cost, remaining allowance, operations by type and viewer mode, guest identity creation rate, provider failure/ambiguity rate, and admission rejections;
- alerts at approved percentages of the project allowance and for abnormal guest-identity creation, refresh/generation volume, uncertain holds, settlement failures, and sustained provider errors;
- a runbook for observe, contain, preserve evidence, rotate provider credentials if needed, recover, and review;
- post-deploy smoke checks proving that one low-cost admitted call settles, denied calls do not reach the provider, and the emergency switch blocks every OpenAI-backed operation; and
- periodic reconciliation between D1 reservation/settlement totals and provider billing, acknowledging that local estimates and provider invoices may differ.

Exact alert thresholds, recipients, paging hours, billing limits, and automated shutoff behavior remain approval decisions. The application switch should not be automated until false-positive impact and recovery ownership are defined.

### 6. Keep abuse telemetry separate from product analytics

- Collect only signals tied to an explicit security or cost decision.
- Keep operator-only security counters out of user profiling and personalization.
- Do not expose raw or stable caller identifiers in dashboards.
- Define retention, access, deletion, legal basis, vendor processing, and incident-preservation exceptions before storing any new signal.
- Prefer short aggregate windows. If pseudonymous buckets are approved, make rotation and deletion technically enforced rather than documented aspirations.
- Address raw application error logging through the separate safe-logging work; do not enrich `console.error` with network or cookie data.

## Approval groups

Implementation should not begin until the owner approves or revises each group independently:

1. **Caller admission:** managed-edge versus application/edge pseudonymous control, protected route classes, graduated response, and treatment of shared networks.
2. **Request semantics:** provider-backed starter generation becomes a same-origin mutation; cached/static reads remain GET.
3. **Guest lifetime:** absolute versus inactivity expiry, whether token rotation is needed, replay/overlap behavior, and the user-visible recovery path.
4. **Privacy:** permitted input signals, transformation location, prohibition or allowance of raw access, retention, access control, vendor handling, and user disclosures.
5. **Operations:** provider-account loss control, metrics, alert thresholds, incident ownership, emergency-switch procedure, reconciliation, and deployment checks.
6. **Testing and rollout:** shadow/observe phase if privacy-approved, false-positive review, staged enforcement, rollback, and success criteria.

Approval of one group does not implicitly authorize a quota amount, stable fingerprint, raw-IP database, retention schedule, or T01B Slice 10.

## Discovery evidence and decision options

This section records the policy-only discovery authorized after the assessment. It does not approve an edge control, a new log source, a quota, a route change, guest expiry enforcement, identity changes, or automated shutoff.

### Evidence boundary

- The Sites project is active and public at its Sites-managed `chatgpt.site` hostname. It has no attached custom domain. The Sites inspection surface exposes public/custom access policy, saved versions, environment management, deployment status, and bounded recent Worker-log reads. It does not expose a project-level WAF, rate-limit, bot-management, Turnstile, Logpush, log-retention, or traffic-analytics configuration.
- A read-only query for production Worker errors over the preceding hour returned no events. That proves only that the bounded query returned no recent errors; it does not prove that all requests are logged, that logging is complete, that no successful abuse occurred, or what fields and retention apply behind the Sites abstraction.
- The latest saved Sites version is version 30 from commit `14ff1021f3342be8c0deedd13ebcea91e9589702`. That source contains migrations only through `0009`; it does not contain `provider_cost_reservations` or the fenced-lease migration. The uncommitted control implementation and migrations `0010` and `0011` therefore must not be treated as current production telemetry. No deployment or migration was performed during discovery.
- No authorized production D1 query surface was available in this session. Current production traffic and cost distributions were not measured. This is a material evidence gap, not a zero-traffic or zero-cost finding.
- Cloudflare documents zone-level rate-limiting rules with path/method and other request matching, plan-dependent counting characteristics, and `block`, challenge, or `log` actions. Free and Pro counting is IP-based; Business adds IP-with-NAT-support, while headers, cookies, fingerprints, and custom characteristics require higher plans or features. These are Cloudflare zone capabilities, not evidence that the current Sites-managed hostname grants the owner access to them. See [Cloudflare rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) and [rate limiting parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/).
- Cloudflare recommends Turnstile pre-clearance for protecting API calls because full challenge pages can break `fetch`/XHR flows. Pre-clearance requires a Turnstile widget whose hostname matches the WAF-protected zone, and the application must still validate the one-time token through Siteverify. This makes it a possible custom-zone design, not a drop-in control verified for the current Sites hostname. See [Cloudflare challenge clearance](https://developers.cloudflare.com/cloudflare-challenges/concepts/clearance/) and [challenge-page compatibility](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/).
- Cloudflare Workers Logs can collect invocation logs, application logs, errors, and exceptions, supports head-based sampling, and has plan-dependent retention of up to seven days. Workers Trace Events can include request metadata and headers. Any direct use therefore requires field, access, sampling, retention, and vendor-processing review; it is not automatically a privacy-minimized aggregate source. See [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [Workers Logs pricing and retention](https://developers.cloudflare.com/workers/platform/pricing/#workers-logs), and [Workers Trace Events fields](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/account/workers_trace_events/).
- OpenAI project monthly budgets are explicitly soft thresholds: requests continue after the budget is exceeded. Project owners can configure notification thresholds and additional alerts, and organization/project owners receive them. This is useful independent alerting but is not an external hard loss cap. See [OpenAI project budgets](https://help.openai.com/en/articles/9186755-managing-your-work-in-the-api-platform-with-projects) and [production cost monitoring](https://developers.openai.com/api/docs/guides/production-best-practices#managing-costs).
- OpenAI exposes organization Costs and Usage APIs that can aggregate by project and other billing dimensions. They require an organization Admin API key and are suitable for reconciliation; they do not replace the application's reservation ledger or create a hard cap. See the [Costs API](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs) and [usage/cost monitoring example](https://developers.openai.com/cookbook/examples/completions_usage_api).

### Evidence available from existing application records

The following aggregates can be computed without selecting provider subjects, emails, names, prompts, questions, answers, URLs, raw provider envelopes, IP addresses, user agents, or device signals. Production values remain unmeasured until an authorized query path exists and the relevant schema is deployed.

| Evidence | Existing source | What it can support | What it cannot support |
| --- | --- | --- | --- |
| Accounted project cost by hour/day, operation, model, status, and viewer mode | `provider_cost_reservations` joined to `identities.provider` | Settled versus active/uncertain holds, operation mix, guest versus ChatGPT share, oldest unresolved holds, release rate, and reservation-to-settlement lag | Provider invoice truth, exact single-call maximum, rejected admissions, or one caller behind multiple guests |
| Provider outcome and estimated-cost trend | `provider_usage_events` joined to `identities.provider` | Completed/failure/ambiguity mix, latency, token/search counts, starter/redraw volume, and comparison with settled reservations | Authoritative spend admission, edge traffic, cache-hit traffic, or records older than opportunistic retention preserves |
| Live-research request volume and outcomes | `research_requests` joined to `identities.provider` | Accepted create/advance volume, committed/failed mix, duration, and identities active in each aggregate window | Requests rejected before insertion, all HTTP traffic, or distinct people/devices/networks |
| Guest identity creation and return activity | `identities` grouped by time and provider | New guest identities per hour/day, last-seen recency, upgrade counts, and a cookie-churn warning signal when interpreted with provider-call volume | Whether multiple identities are one caller, whether churn is malicious, or an edge rate-limit key |
| Committed research cost and content-production volume | `usage_events`, `journeys`, and `research_runs` | Cost per committed turn, model/preset mix, successful output volume, and local-estimate trends | Failed/provider-only work, total application requests, or external billed cost |

Important gaps remain even after those aggregates are available:

- no current table records cost-admission rejection attempts because the conditional insert creates no row on denial;
- no current table records total HTTP requests, bootstrap traffic, static/cached starter reads, or edge rejections;
- application identity counts are not caller counts and must not be relabeled as unique users;
- the application cannot derive IP/device collision or shared-network false-positive rates without a separately approved signal; and
- local estimated cost must be reconciled with OpenAI project cost data because pricing snapshots, ambiguous outcomes, and provider billing can differ.

### Options for the six approval groups

These options narrow the next owner decisions. They do not express an implementation preference where platform or privacy evidence is still missing.

| Approval group | Evidence-backed options | Decision needed before implementation |
| --- | --- | --- |
| 1. Caller admission | **A.** Keep current application-only admission and accept cookie-churn denial-of-service risk while usage remains private/small. **B.** Ask the Sites owner/support channel whether a managed, route-scoped rate-limit/challenge product exists for this exact Sites project, including its keying, logs, retention, plan, and operator access. **C.** Evaluate an owner-controlled custom Cloudflare zone using zone WAF rate limiting and, if interactive challenge is needed, Turnstile pre-clearance. **D.** Consider an edge-only pseudonymous bucket only if A-C cannot meet the requirement and privacy/security separately approve its design. | Choose the hosting/control path and protected route classes. Do not choose rates, collect an identifier, or assume the custom-zone design is compatible until verified end to end. |
| 2. Request semantics | **A.** Leave `/api/starters` unchanged while admission evidence is gathered. **B.** Later authorize a split in which cached/static reads remain GET and provider-backed generation becomes a same-origin idempotent mutation. **C.** Approve that split only as part of the selected caller-admission rollout. | Decide whether the semantics change is independently desirable and when it may be implemented. Discovery did not authorize the route change. |
| 3. Guest lifetime | **A.** Treat 30 days as browser-cookie lifetime only and document that server authorization can outlive the browser cookie. **B.** Approve absolute server expiry. **C.** Approve inactivity expiry with a maximum absolute lifetime. Token rotation remains a separate optional decision within the same identity. | Define authorization, recovery, overlap/replay, and data-retention effects. Edge admission evidence does not resolve this identity-policy choice. |
| 4. Privacy | **A.** Keep raw network/device signals unavailable to application code and use only existing D1 aggregates plus OpenAI billing aggregates. **B.** Permit vendor-managed edge processing only after reviewing exact fields, logs, retention, access, DPA/vendor terms, and disclosures. **C.** Permit a short-lived edge-only derived bucket under an explicit design and deletion contract. Stable device fingerprinting remains out of scope. | Approve permitted signals and processing locations. Raw-IP collection is not the default and has not been approved. |
| 5. Operations | **A.** Configure OpenAI project budget alerts as independent soft notifications and manually reconcile Costs API totals with D1. **B.** Add an operator-owned scheduled reconciliation/alert process after recipients, cadence, credentials, and retention are approved. **C.** Seek a separately verified organization/account hard loss control; do not label the project budget as one. Keep emergency shutoff manual unless automation is separately approved. | Name the incident owner, verify alert recipients and thresholds, define the manual switch/runbook, and confirm whether any true provider hard cap exists for this account. |
| 6. Testing and rollout | **A.** Establish a baseline from existing aggregate D1 records after deployment and an authorized query path. **B.** If the selected edge product supports a privacy-approved `log`/observe mode, run it before enforcement and review shared-network false positives. **C.** Stage route classes separately with a manual rollback that leaves atomic cost reservation and lease fencing intact. | Approve baseline duration, minimum evidence, false-positive criteria, staged order, rollback owner, and success criteria. No shadow logging should begin before group 4 approval. |

### Discovery conclusion

The most defensible immediate operations step is to verify and configure OpenAI project alerts while explicitly treating them as soft, then establish an authorized aggregate D1 query/reconciliation path after migrations `0010` and `0011` are deployed in that order. The caller-admission choice remains open: the current Sites surface does not prove access to managed edge rate limiting, while an owner-controlled Cloudflare zone could provide it but would introduce hosting, plan, challenge-flow, logging, and privacy decisions. No enforcement or new telemetry should be implemented until the six groups are approved independently.

## Required characterization before implementation

- Guest-cookie absent, unknown, expired, rotated, and replayed cases, including exact D1 writes and public viewer/cookie results.
- Multiple new guest identities consuming one project allowance while per-identity allowances remain separate.
- Starter cache hit, cache miss, forced refresh, fallback, idempotent replay, admission denial, and provider-cost settlement.
- Caller admission under concurrency, shared-network collisions, IPv4/IPv6 changes, proxy/CDN trust, challenge failure, and edge/application disagreement.
- Proof that raw network inputs do not enter D1, application logs, analytics, diagnostics, provider prompts, or public errors under the approved design.
- Operator aggregate queries and alerts against settled, reserved, uncertain, and released cost states without treating diagnostics as authoritative admission data.
- Emergency-switch tests covering primary research, retries, repair/recovery, starter generation, and redraw.
- Migration-chain and deployment validation preserving the order `0010` then `0011`; any new migration must follow them without rewriting history.
- Rollback that can disable the new admission path without weakening provider-cost reservation, lease fencing, or stale-worker commit rejection.

## Recommended next decision

Review and approve, revise, or defer each of the six groups independently using the discovery record above. Before choosing thresholds, authorize a read-only production aggregate/reconciliation path and confirm the OpenAI project alert configuration. Do not implement raw-IP collection, pseudonymous caller storage, guest expiry enforcement, starter-route mutation, new quotas, automatic shutoff, privacy/retention changes, or identity-policy changes without the corresponding explicit approvals.

## Deferred TODO

- With explicit owner authorization, verify the OpenAI project budget-alert configuration read-only. Treat project budgets and their notifications as soft alerts, not a hard spending cap. No alert configuration change is approved by this TODO.
