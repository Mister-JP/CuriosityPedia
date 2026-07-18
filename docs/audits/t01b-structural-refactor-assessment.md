# T01B structural refactor assessment and incremental plan

**Assessment date:** July 18, 2026  
**Repository baseline:** `14ff102` (`main`)  
**Status:** Slices 1–9D complete; T01B is ready to close  
**Next boundary:** Defer Slice 10 and `lib/live-repository.ts` restructuring until T02 defines the cost and abuse policy

## Executive recommendation

Slices 1–9D completed the safe structural work identified by this assessment.
Ownership is now explicit for the journey graph and map, low-effect leaf views,
research prompt/response/stream/validation concerns, journey reads and comparison,
research status, preferences, journey management, and snapshots/export. The
compatibility facades remain where they preserve stable imports or deliberately
retained behavior.

Slice 8B is closed as an intentional no-move decision. Its characterization
protects the unreachable legacy fixture-create path and the mixed fixture/live
advance and redraw boundary. Removing, restoring, or reorganizing that behavior
requires separate authorization rather than further T01B cleanup.

Do not begin with `lib/live-repository.ts`. It contains the cost, lease,
authorization, idempotency, optimistic-concurrency, and atomic-commit boundary.
T01 found that the existing spend check is not an atomic ceiling. Moving that code
before T02 defines the intended policy would risk preserving an unsafe boundary or
accidentally changing billing behavior under the label of refactoring.

## Operating constraints

- This assessment changed no application source, schema, migration, dependency,
  route, or public contract.
- Large files were treated as candidates, not automatic design failures.
- Later movement must be governed by characterization tests and observable
  behavior, not line-count targets.
- Generated catalogs, the declarative database schema, and cohesive contracts are
  not split merely because they are substantial.
- Every implementation slice requires its own approval and must leave the app
  runnable.
- Success means clearer ownership and safer local change, not a larger file count.

## Baseline verification

### Working tree

The baseline branch is `main`, aligned with `origin/main` at `14ff102`. There were
no tracked modifications before or after the assessment. These pre-existing
untracked documentation paths were preserved:

- `docs/audits/`
- `docs/documentation-writing-guide.md`
- `docs/post-reset-product-roadmap.md`
- `docs/refactoring-playbook.md`
- `docs/curiositypedia-user-experience.md`

This report is intentionally added inside the already-untracked `docs/audits/`
directory. Build output and Wrangler logs remain ignored.

### Runtime and toolchain

| Item | Baseline |
| --- | --- |
| Node.js | `v22.15.0` |
| npm | `10.9.2` |
| TypeScript | `5.9.3` |
| React | `19.2.6` |
| Next compatibility package | `16.2.6` |
| Vinext | `0.0.50` |
| Vite | `8.0.13` |
| Wrangler | `4.92.0` |

### Required commands

| Command | Result | Baseline note |
| --- | --- | --- |
| `npm run build` | Pass | Vinext built all five environments. It emitted the existing experimental-glob notice and route-classification caveat. |
| `npm test` | Pass | Production build plus 54 tests passed: 3 rendered/build tests, 12 client/catalog/localization/route tests, and 39 server research/usage tests. |
| `npm run typecheck` | Pass | No errors. |
| `npm run lint` | Pass with 3 warnings | Existing unused `arrow` values in two design generators and unused `pill` in one design generator; no errors. |
| `npm run architecture:check` | Pass | The generated local-import index matches the source tree. |

The three lint warnings are pre-existing and outside T01B. They are not a reason
to mix design-script cleanup into a refactoring slice.

## Current runtime and contract map

### Principal flows

| Flow | Entry and state owner | Policy and orchestration | External effects | Durable result |
| --- | --- | --- | --- | --- |
| Application load | `CuriosityPediaExperience`; URL plus React state | `refreshSession`, bootstrap catalog/preferences, route reconciliation | `/api/session`, `/api/bootstrap`, starter request, local-storage bookmark read | Viewer, summaries, preferences, and starters in client state |
| Start research | `StartStage` -> `create` | Client library precheck; `prepareLiveResearch`; route retry loop; `runLiveResearch` | D1 identity/request reservation, OpenAI Responses stream, provider-usage writes | Atomic journey/turn/options/evidence/usage commit |
| Advance research | `PerformanceStage` or map -> `advance` | Selected-option resolution exists in both client and server; request normalization validates ownership/version | Same provider and D1 effects as create | Child turn, action, graph edges, usage, updated journey version |
| Redraw options | `advance("reject")` | `advanceJourney` chooses fixture or injected live redraw | Optional OpenAI redraw call, provider-usage write, D1 batch | Rejected option set plus replacement set and action |
| Load saved journey | URL effect or library selection | Route parser; `getJourney` ownership query and row assembly | D1 reads | `JourneyDetail` projected into active journey, active turn, and library summary |
| Navigation/map | URL plus `view`, `activeJourney`, `activeTurnId` | `presentJourney`, `navigate`, graph projection/folding/layout | Router history; research abort on navigation | URL is durable navigation source; view state mirrors it |
| Preferences | `SettingsView` callback | Client preview; server validation in `product-repository` | D1 upsert; starter regeneration may call OpenAI | Stored preferences; client locale/text size updated |
| Usage/quota | Usage screen and research preparation | `usage-policy`; non-atomic checks currently live in `prepareLiveResearch` | D1 aggregate reads and provider-usage writes | Rolling summary and request admission/rejection |
| Identity/session | Every API helper via `resolveViewer` | ChatGPT header trust, guest cookie/token lookup, ownership predicates | Header/cookie access and D1 identity writes | `ViewerContext`; optional guest cookie |
| Diagnostics/errors | Route catch paths, research stream, client banners | `RepositoryError`, `publicError`, provider usage metadata | D1 diagnostic reads/writes and ad hoc `console.error` | Bounded public error; privacy-filtered signed-in report |

### Public and behavior-sensitive contracts to preserve

| Contract | Current owner | Preservation requirement |
| --- | --- | --- |
| Page and API paths | `app/routes.ts`, `app/api/**/route.ts` | No path, HTTP method, query, redirect, or deep-link change during pure refactoring. |
| JSON envelopes and error codes | `lib/contracts.ts`, `lib/api.ts`, `lib/errors.ts` | Preserve status codes, `ApiSuccess`/`ApiFailure`, retryability, messages where tested, and diagnostic IDs. |
| Research SSE | research route, `LiveResearchStreamEvent`, `app/client-api.ts` | Preserve event names/order, heartbeat, retry count/backoff, completion-only success, cancellation, and error semantics. |
| Research request shapes | `LiveResearchRequest` | Preserve create/advance fields, idempotency behavior, version checks, and selected-option semantics. |
| Journey response shape | `JourneyDetail` and `getJourney` | Preserve sorting, legacy JSON fallbacks, source relations, metadata defaults, action mapping, and exactly two current options. |
| Authorization | `resolveViewer` plus repository predicates | Every private read/write remains bound to the resolved identity; edge-header assumptions do not move client-side. |
| Quotas and usage | `usage-policy`, live repository, provider usage | Preserve current behavior until T02 explicitly changes it; do not imply that current non-atomic checks are a hard ceiling. |
| Persistence | SQL in repository modules and `db/schema.ts` | No schema, migration, table, column, transaction ordering, soft-delete, idempotency, or optimistic-concurrency change. |
| Provider calls | OpenAI helpers and research modules | Preserve model, prompt version, tools, `store: false`, safety identifier, limits, retry behavior, repair/recovery calls, and usage recording. |
| Rendered behavior | experience component and CSS | Preserve text, accessibility attributes, loading/errors, map geometry, bookmark storage key, routing, and reduced-motion behavior. |
| Localization | `app/i18n.tsx`, locale catalogs, stored locales | Preserve message keys/placeholders, direction, output locale, and existing source-scanning test behavior. |

One behavior is ambiguous and must not be silently corrected during refactoring:
`normalizeRequest` currently forces `imagePreference: "prefer"` for both live
create and advance requests even when a create request carries another valid
preference. The request type, settings UI, prompt builder, and tests expose all
three choices. Whether forcing `prefer` is intentional product policy requires a
separate decision.

## Responsibility and dependency map

```text
pages / routed-experience-page
  -> CuriosityPediaExperience
       -> browser transport + SSE parser
       -> route parser / URL builders
       -> catalogs + localization
       -> direct Civitai browser integration
       -> localStorage bookmarks

API route adapters
  -> viewer + origin / input helpers
  -> journey repositories
  -> research request reservation / commit
  -> live research and redraw generators
       -> OpenAI transport
       -> provider-usage recording

repositories
  -> D1 binding
  -> catalogs / request validation / localization
  -> shared journey contracts

schema and migrations
  <- persistence SQL must continue to conform to these declarative contracts
```

The intended dependency direction is mostly present, but three back-pressure
points stand out:

1. React rendering and page-level application orchestration share one module, so
   changes to a leaf screen require navigating async research and route state.
2. `live-research.ts` is both an OpenAI workflow coordinator and the owner of
   prompt policy, SSE parsing, evidence normalization, repair, validation, media
   policy, diagnostic recording, and final cost calculation.
3. `repository.ts` and `live-repository.ts` each own parts of journey validation,
   mutation policy, SQL statement construction, evidence persistence, and
   response reloading; the boundary reflects fixture/live history more than a
   stable domain responsibility.

## Hotspot assessment

Ranks use **value / risk / confidence** on a High, Medium, Low scale. Risk means
implementation risk, not defect severity.

| Candidate | Actual finding | Value | Risk | Confidence | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `app/curiositypedia-experience.tsx` (3,090 lines) | Mixed page orchestration and seven major UI surfaces; pure graph algorithms are embedded beside network, routing, local-storage, and async state. | High | Medium | High | Refactor first, beginning only with pure graph logic; then move leaf views without changing state ownership. |
| `lib/live-research.ts` (2,055) | Mixed provider streaming, prompts/schemas, evidence and media policy, repairs, diagnostics, usage recording, and draft assembly. Tests strongly protect many pure decisions. | High | High | High for pure seams; Medium for transport | Extract pure validation/normalization and prompt policy before touching orchestration. |
| `lib/repository.ts` (1,306) | Read model, fixture create/advance commands, compare projection, validation, idempotency, SQL builders, and legacy row parsing share one module. | High | High | Medium | Add repository characterization coverage before separating reads, pure mapping, and fixture commands. |
| `lib/live-repository.ts` (958) | Request normalization, authorization, quota checks, lease/idempotency, create/advance commits, evidence SQL, and failure lifecycle share one security-sensitive boundary. | High | Very high | High finding; Low boundary confidence before T02 | Defer cost/lease extraction until T02 policy is approved; first isolate pure request normalization only after repository tests exist. |
| `lib/product-repository.ts` (272) | Cohesive small operations, but its generic name hides preferences, journey management, snapshots/export, and research status; it imports the core repository. | Medium | Medium | Medium | Split only as consumers move; do not prioritize by size. |
| `lib/contracts.ts` (429) | Broad but cohesive public/domain contract catalog with no runtime effects or imports. Splitting now would create widespread import churn without hiding complexity. | Low | Medium | High | Keep intact until stable feature-owned modules exist. |
| `db/schema.ts` (563) | Cohesive declarative schema and legacy-table record. | Low | High | High | Keep intact; never split merely for length. |

### `app/curiositypedia-experience.tsx`

**Responsibilities and state.** The top-level component owns URL reconciliation,
viewer/bootstrap loading, library summaries, active journey/turn projection,
research lifecycle and cancellation, error recovery, usage refresh, preferences,
bookmark persistence, management mutations, navigation, and rendering selection.
The same file also owns the landing surface, buffering screen, answer/evidence
surface, journey graph algorithms and map, library, bookmarks, usage, Civitai
gallery/dev settings, settings, loading, and empty states.

**Incoming/outgoing dependencies.** It is reached only through
`routed-experience-page.tsx`, but imports browser transport, route helpers,
catalog policy, shared contracts, localization, Civitai access, React, Next
navigation, and the icon library. It directly mutates browser history,
`document.documentElement`, local storage, fetch-driven React state, and abort
controllers.

**Duplicated or hidden decisions.** Selected-option resolution is repeated in the
client and live repository. A journey summary is rebuilt in client `upsertSummary`
and repository mapping. Route and React view state intentionally mirror each
other, but ownership is not summarized by a reducer or explicit controller
contract. Create, advance, and takeover repeat live-research state construction
and completion/error transitions.

**Tests and gaps.** Rendered tests protect only the server shell and deep-link
fallback. Client tests protect transport error codes and retry event behavior.
Route and localization tests protect helpers/catalog completeness. There are no
direct tests for graph construction/layout, navigation reconciliation, abort and
stale-response behavior, bookmarks, view-specific rendering, or mutation state.

**Seams.** The graph projection/path/folding/layout functions are pure and already
communicate through explicit values. The major leaf views communicate by props
and can later move without taking ownership of page state. The top-level
orchestrator should remain the canonical state owner until its transitions have
characterization coverage; introducing a new state library is not justified.

### `lib/live-research.ts`

**Responsibilities and effects.** It defines the generated-turn schema; builds
performer/system and request prompts; opens and parses the provider stream;
emits user-visible research events; handles timeout/abort/provider failures;
records every provider outcome; extracts/deduplicates sources and images; runs
image-note and citation repair/recovery calls; validates citations, prose, media,
handoff, and next questions; and assembles usage/cost and the persisted draft.

**Mixed levels.** `runLiveResearch` moves repeatedly between HTTP stream frames,
user-visible activity wording, provider diagnostics, editorial policy, pure URL
matching, recovery workflow, and cost arithmetic. That makes it difficult to
change provider mechanics without loading evidence policy, and vice versa.

**Sensitive behavior.** It uses the server identity in a provider safety
identifier, sets `store: false`, records privacy-filtered diagnostics, controls
timeouts and tool limits, validates citations against provider-returned sources,
and calculates committed usage. It also uses raw `console.error`, matching T01-S08.

**Tests and gaps.** `tests/live-research.test.mjs` strongly characterizes source
normalization, images, validation, prompts, citation repair/recovery, incomplete
responses, and several full mocked provider workflows. Test access currently
depends on a catch-all `liveResearchTestHooks` object. Missing coverage includes
SSE parser edge cases as an independent contract, abort/timeout races, every
provider error branch, usage-write failure semantics, and coordination with D1
commit/retry behavior.

**Seams.** Prompt/schema policy, provider-response normalization, and turn
validation/repair application are pure or nearly pure. Extract those before a
provider adapter. Keep the repair/recovery coordinator with `runLiveResearch`
until its call-order behavior has explicit characterization tests.

### `lib/repository.ts`

**Responsibilities and effects.** It creates deterministic fixture journeys,
lists and hydrates journeys, lists rejected questions, advances or redraws
fixture journeys, soft-deletes, compares, validates commands, maps legacy JSON
rows, constructs research/evidence statements, enforces ownership/version, and
handles idempotency.

**Duplicated decisions.** Catalog/request validation overlaps live-request
normalization. Fixture and live repositories repeat journey/turn/option/action/
edge/research/source/event persistence shapes. `getJourney` is also a dependency
of `product-repository` and `live-repository`, making this file the implicit read
model for unrelated operations.

**Sensitive behavior.** Ownership predicates, soft deletion, idempotency,
optimistic concurrency, source provenance, legacy-row fallbacks, and batch order
must not drift. A seemingly harmless shared SQL helper could change atomicity or
authorization.

**Tests and gaps.** There is no direct repository test. Current build and route
tests prove imports/rendering but do not execute these D1 queries. This is the
largest safety-net gap in T01B.

**Seams.** Pure row-to-domain mapping and comparison projection can be
characterized first. Read queries can then move behind a journey read-model
module. Fixture commands should remain separate from live commits rather than
being prematurely unified through a generic mutation abstraction.

### `lib/live-repository.ts`

**Responsibilities and effects.** It validates and normalizes create/advance
requests; reloads journeys to resolve branch policy; checks library, spend, run,
and active-lease limits; reserves/takes over research requests; marks failures;
and atomically commits live create/advance batches including usage and evidence.

**Sensitive behavior.** This is the most concentrated authorization, cost,
idempotency, concurrency, and persistence boundary. T01-S01/S02 show that its
spend gate is incomplete and non-atomic. Its batch statement order and
conditional predicates are part of observable integrity behavior.

**Tests and gaps.** There are no direct tests for request normalization, lease
takeover, quota boundaries, idempotent replay/conflict, authorization predicates,
conditional batch rollback, failure marking, or create/advance commit shape.

**Seams and deferral.** `ancestorTopicTrail` and much of normalized-request
construction can become pure after selected journey data is supplied explicitly.
Do not extract a generic quota service or commit writer until T02 establishes the
correct atomic reservation contract and D1 characterization tests exist.

## Change-coupling evidence

Recent history confirms functional coupling rather than just visual size:

- `app/curiositypedia-experience.tsx` changed in 17 commits, `live-research.ts` in
  15, `contracts.ts` in 13, `live-repository.ts` in 9, `repository.ts` in 8, and
  `product-repository.ts` in 4 across the inspected history.
- Major research changes repeatedly changed the experience, contracts, live
  research, both repository paths, and `tests/live-research.test.mjs` together.
- Visual evidence changes repeatedly paired the experience, live-research
  validation, contracts, and research tests.
- Route/deep-link work changed the experience and rendered tests without needing
  repository changes, supporting a UI/navigation seam.
- Prompt-only changes changed `live-research.ts` and its test, supporting a
  prompt-policy seam.

This evidence argues for feature-responsibility boundaries, not a single generic
`services` or `utils` layer.

## Proposed target structure

This is a responsibility map. Names should be confirmed in the slice that creates
them; empty directories and placeholder interfaces should not be added.

```text
app/
  curiositypedia-experience.tsx        page/application state and screen selection
  experience/
    journey-graph.ts                pure graph projection, path, folding, layout
    journey-map.tsx                 map-only interaction and rendering
    start-stage.tsx                 landing/start presentation and local form state
    journey-stage.tsx               answer/evidence and option presentation
    research-progress.tsx           live research progress/error presentation
    library-view.tsx                library presentation
    bookmarks-view.tsx              device bookmark presentation
    usage-view.tsx                  usage presentation
    settings-view.tsx               settings presentation and local draft state

lib/
  live-research.ts                  research workflow coordinator (stable export)
  research/
    prompt-policy.ts                schemas, instructions, and request prompt input
    provider-response.ts            SSE/provider source/image/usage normalization
    turn-validation.ts              evidence, media, handoff, and option validation
    evidence-repair.ts              pure repair application and pruning policy
  repository.ts                     temporary compatibility facade while slices move
  journeys/
    read-model.ts                   owned journey reads and row-to-domain mapping
    fixture-commands.ts             deterministic create/advance persistence
    comparison.ts                   pure comparison projection
    live-request.ts                 normalized request/branch policy (after tests)
    live-commit.ts                  live D1 commit boundary (after T02)
  preferences-repository.ts         preference reads/writes
  snapshots-repository.ts           snapshot/export operations
  research-status-repository.ts     observable request status
```

### Dependency rules

- `curiositypedia-experience.tsx` owns canonical page state and passes explicit
  values/callbacks to view components. Views do not import API transport or D1.
- `journey-graph.ts` imports only domain contracts and has no React, DOM, router,
  storage, network, clock, or random dependency.
- `live-research.ts` coordinates provider calls; pure research modules do not
  import provider transport, D1, React, or route code.
- Route handlers remain thin and continue importing stable public functions while
  compatibility facades prevent large one-shot import churn.
- Journey read mapping does not call provider code or own mutation policy.
- Live commit code owns D1 atomicity; it accepts already validated domain inputs
  and does not decide provider/editorial policy.
- `lib/contracts.ts` and `db/schema.ts` remain stable shared references until
  feature boundaries prove a smaller contract split would reduce coupling.

### Rejected alternatives

| Alternative | Reason rejected |
| --- | --- |
| Split every file above a line threshold | Size does not identify policy, state, effects, or a safe interface. It would split cohesive contracts/schema and create navigation cost. |
| Rewrite the experience around a new reducer or state library first | Current state transitions are under-tested; a new dependency/pattern would combine behavior change with movement. |
| Create generic `components`, `services`, `helpers`, or `utils` buckets | Those names hide ownership and recreate the current ambiguity across more files. |
| Unify fixture and live persistence immediately | Similar SQL does not mean identical atomicity, authorization, usage, idempotency, or failure semantics. Temporary duplication is safer. |
| Extract one universal provider gateway before T02 | The intended cross-operation quota/reservation policy is not yet approved; the abstraction would encode disputed behavior. |
| Split `contracts.ts` by type category now | It would change imports broadly without isolating runtime complexity or side effects. |
| Split `db/schema.ts` by table | It is cohesive declarative data and the migration relationship is more important than file size. |

## Behavior-preservation and test-gap matrix

| Area | Existing protection | Important gap before movement | Required safety net |
| --- | --- | --- | --- |
| Graph projection/layout | Build and manual UI history only | Chosen/open/orphan branches, counts, folds, paths, desktop/mobile geometry | Pure characterization tests before extraction (Slice 1). |
| Experience navigation/state | Route helper, client API, SSR shell tests | Back/forward reconciliation, abort, stale completion, view fallbacks, mutation collisions | Component/controller characterization before changing state ownership. |
| Leaf UI views | SSR loading shell and locale-key scan | Accessibility and callbacks for each ready-state surface | Render-focused tests where feasible; otherwise scoped manual checks plus unchanged prop contracts. |
| Live prompts/schema | Strong direct tests through hooks | Public internal ownership obscured by test-hook bucket | Move tests to direct named module exports without weakening assertions. |
| Provider stream | Several full mocked runs | Frame boundaries, malformed events, abort/timeout races, diagnostic-write failure | Dedicated adapter/parser characterization before extraction. |
| Evidence/media validation | Strong direct and workflow tests | Some locale/media edge cases | Preserve test vectors; add only boundary cases exposed by movement. |
| Journey read model | No direct D1 coverage | Ownership, ordering, legacy JSON, defaults, joins, action/source/event mapping | D1-compatible characterization harness plus pure mapper tests. |
| Fixture commands | Fixture-domain tests only | SQL authorization, idempotency, version race, batch atomicity | Command-level repository tests before moving SQL. |
| Live request/commit | No direct tests | Quota edges, lease takeover, replay, conditional commits, usage atomicity | T02-approved policy tests and D1 integration/contract tests. |
| Public routes/SSE | Route parser and client SSE tests | Server status/header/event-order/error paths | Route tests around stable adapter seam before route orchestration movement. |
| Localization | Catalog completeness and helper tests | Extracted component keys may escape source scan | Update scanner inputs or centralize key discovery in the same slice. |

## Ordered implementation slices

Each slice is independently reviewable. A later slice may be consciously deferred
when its prerequisite or roadmap decision is not ready.

### Slice 1 — Characterize and extract the pure journey graph model

**Objective.** Give journey graph projection and layout one explicit, testable
owner without changing the map component or page state.

**In scope.** `GraphDensity`, graph node/layout types, `buildJourneyGraph`,
`findGraphNode`, `findGraphPath`, `visibleJourneyGraph`,
`desktopGraphLayout`, and `mobileGraphLayout` from
`app/curiositypedia-experience.tsx`; new `app/experience/journey-graph.ts`; new
`tests/journey-graph.test.ts`; test script registration; generated code index and
architecture ownership description.

**Out of scope.** JSX/CSS, `JourneyMap`, navigation, graph redesign, labels,
responsive breakpoints, dependencies, contracts, and feature changes.

**Preserve.** Node IDs/kinds/counts/order, action-to-result mapping, orphan-child
fallback, folding thresholds, route visibility, dimensions/coordinates, mobile
two-child limit, and current runtime errors for malformed empty journeys.

**Safety net.** Before movement, add fixtures for a root with two open paths, a
chosen descendant, an unchosen branch, an unmatched persisted child, cluster
folding at each density, selected paths, and deterministic desktop/mobile
coordinates. Assert the current outputs.

**Transformation.** Add tests against temporarily exported logic; move the exact
types/functions without rewrite; import them into the unchanged component; remove
temporary access if unnecessary; regenerate the dependency index.

**Validation.** Focused graph test, `npm run typecheck`, `npm run lint`,
`npm run architecture:check`, `npm run build`, and `npm test`. Manually compare
one desktop and one narrow map only if automated output cannot cover SVG geometry.

**Rollback.** Re-inline the unchanged block and remove the new module/test/import;
regenerate the index. No data rollback is required.

**T01 revalidation.** Confirm the extracted module has no storage, network,
identity, provider, logging, or secret access; confirm no authorization, quota,
cost, persistence, or Civitai path changed.

**Completion evidence.** Characterization output is identical, full baseline is
maintained, the map component reads as rendering/interaction rather than graph
construction, and the graph logic can be changed/tested without loading React.

### Slice 2 — Move the map rendering surface behind its existing prop contract

**Objective.** Make the journey map a cohesive UI module while keeping page state
and router ownership in the experience shell.

**In scope.** `JourneyMap`, map-only local state/effects, and map-only helpers that
are not part of graph policy; reuse Slice 1 module.

**Out of scope.** Map redesign, new interactions, responsive changes, global CSS
reorganization, or moving active-turn ownership.

**Safety net.** Add render/interaction characterization for selection, continue,
choose, density/view toggles, path focus, clusters, and empty open nodes.

**Validation/rollback.** Focused UI and graph tests, full baseline, then restore
the component block if prop/output parity fails. Revalidate accessibility,
routing, localization discovery, and absence of new browser effects.

### Slice 3 — Move low-effect leaf views out of the experience shell

**Objective.** Reduce UI navigation cost without changing application state.

**In scope.** One view per review unit, in this order: `UsageView`, `Library`,
`BookmarksView`, `SettingsView`. Pass current values and callbacks unchanged.

**Out of scope.** `StartStage`, live buffering, answer/evidence, Civitai behavior,
API calls, or a new state architecture.

**Safety net.** Characterize accessible headings/actions, busy/empty/error states,
callback payloads, bookmark ordering, and settings draft/save behavior. Update
localization key scanning as files move.

**Validation/rollback.** Focused view tests plus full baseline after each view;
each view can be re-inlined independently. Revalidate no data, privacy, quota,
identity, or external-service behavior moved into presentation.

### Slice 4 — Separate pure research prompt and schema policy

**Objective.** Give editorial/provider request policy a testable owner independent
of streaming mechanics.

**In scope.** `TURN_SCHEMA`, density schema, instructions, research input,
density/image directions, and related pure limits/types in
`lib/research/prompt-policy.ts`.

**Out of scope.** Prompt text changes, model/tool limits, provider requests,
repair calls, result validation, or T02 policy.

**Safety net.** Preserve every existing prompt/schema assertion via direct named
exports and add snapshots or exact structural assertions for tool/schema inputs.

**Validation/rollback.** Research tests plus full baseline; re-inline exact code
if provider request construction differs. Revalidate prompt privacy (topic trail
only), `store: false` at the caller, output locale, and cost-bound token limits.

### Slice 5 — Separate provider result normalization and turn validation

**Objective.** Isolate pure provider-envelope interpretation and evidence/media
policy from network orchestration.

**In scope.** Source/image extraction, canonical URL matching, usage counters,
generated-turn parsing, validation/mapping, and pure repair application/pruning.

**Out of scope.** Network calls, repair/recovery sequencing, user-visible activity
events, provider retries, error-message redesign, or relaxed evidence rules.

**Safety net.** Move the existing extensive test vectors to direct module tests;
add malformed-envelope, citation alias, source relation, media provenance, and
legacy visual-note compatibility cases where absent.

**Validation/rollback.** Live-research focused tests plus full baseline; retain a
compatibility export temporarily if needed. Revalidate citation membership, safe
public image URLs, no raw provider envelope persistence, and diagnostics fields.

**Implemented boundary decision.** Slice 5 characterization found that
`parseModelTurn` accepted `[]` because the shared record predicate treats every
non-null JavaScript object, including arrays, as a record. The generated-turn
schema and the function's existing failure wording both define the payload as an
object-shaped turn, and an array cannot satisfy the downstream turn contract or
be persisted successfully. With explicit authorization, Slice 5 therefore
rejects array-shaped JSON at the parsing boundary. This is a narrow validation
correction rather than a relaxed policy: valid object turns are unchanged,
malformed JSON keeps the same public error, and provider transport, retries,
repair/recovery order, citations, quotas, usage, and persistence are unaffected.

### Slice 6 — Characterize and extract provider streaming mechanics

**Objective.** Hide OpenAI SSE/timeout/abort mechanics behind one meaningful
research-stream interface while leaving workflow policy in `runLiveResearch`.

**In scope.** SSE frame parsing, response completion/incomplete/failure handling,
transport diagnostics, timeout/abort wiring, and provider request invocation.

**Out of scope.** A multi-provider framework, retry policy in the API route,
prompts, evidence repair order, quota admission, or dependency changes.

**Safety net.** Add exact tests for split frames, missing trailing blank line,
malformed frames, missing body/terminal event, HTTP errors, abort versus timeout,
and one-and-only-one usage outcome record.

**Validation/rollback.** Mocked-provider tests and full baseline. Revalidate
server-only credential use, `store: false`, safety identifier, no secret/raw-body
logging, timeouts, and provider usage recording.

**Implemented boundary decision.** Slice 6 characterization confirmed that the
stream parser retains frames split across chunks, processes a final frame without
a trailing blank line, ignores malformed non-JSON frames while counting them for
diagnostics, and records one provider-usage outcome for each terminal stream
result. It also confirmed the existing public behavior that both an external
disconnect and the internal foreground deadline map to `PROVIDER_TIMEOUT`; the
extraction preserves that behavior rather than redesigning cancellation policy.
`lib/research/provider-stream.ts` now owns primary OpenAI request invocation, SSE
parsing, timeout/abort wiring, terminal transport handling and diagnostics, and
the primary request's provider-usage outcome. `lib/live-research.ts` continues to
assemble the full request policy (including `store: false`, safety identity,
tools, and limits), translate minimal progress signals into user-visible activity
events, coordinate repair/recovery order, and assemble aggregate usage, costs,
and the persistence-facing draft.

### Slice 7 — Build repository characterization seams and extract the read model

**Objective.** Give owned journey reads and row-to-domain mapping a clear owner
before moving mutation SQL.

**In scope.** A D1-compatible test seam, `listJourneys`, `getJourney`, pure row/
legacy JSON mappers, and `listRejectedQuestions` in `lib/journeys/read-model.ts`;
temporary re-exports from `lib/repository.ts`.

**Out of scope.** Query/schema changes, authorization changes, mutation SQL,
stored data, migrations, deletion, or performance optimization.

**Safety net.** Characterize ownership predicates, row ordering, exactly current
option sets, legacy answer/handoff fallbacks, source/event/action mapping,
metadata defaults, not-found behavior, and summaries.

**Validation/rollback.** Repository tests, affected route tests, and full
baseline; revert facade/module without data migration. Revalidate ownership,
soft-delete filtering, privacy, source provenance, and public response shapes.

**Implemented boundary decision.** Slice 7 characterization now exercises the
current D1 statement/bind contract through a scripted D1-compatible harness. It
confirms identity-bound and soft-delete-filtered parent reads, no child hydration
after a not-found parent, list and hydration ordering, current option-set joins,
legacy answer and handoff fallbacks, source/event/action mapping, metadata
defaults, empty-library behavior, and the existing full-journey authorization
step before rejected-question reads. `lib/journeys/read-model.ts` now owns those
three read operations and their row-to-domain mapping without changing their SQL,
bind order, query sequence, stored data, or public errors. `lib/repository.ts`
remains the compatibility facade and continues to own deterministic mutations;
existing routes, product operations, and live commit code retain their imports.

### Slice 8 — Separate comparison and deterministic fixture commands

**Objective.** Remove pure comparison projection and fixture-only mutation policy
from the compatibility repository without unifying them with live commits.

**In scope.** `compareJourneys` projection, fixture create/advance, fixture SQL
builders, validators owned only by fixture commands, and temporary re-exports.

**Out of scope.** Live requests, provider behavior, route contracts, schema,
redraw product behavior, or shared generic SQL abstractions.

**Safety net.** Characterize comparison observations/confounders, fixture
idempotency, library limit, reject redraw, branch/delegate, authorization,
optimistic concurrency, options/actions/edges, and soft delete separately.

**Validation/rollback.** Repository/route tests and full baseline. Revalidate
ownership, idempotency, concurrency, stored shapes, evidence relations, and no
live-model access through the fixture route.

**Implemented boundary decision (Slice 8A).** Comparison characterization now
pins same-ID rejection before reads, authorization-gated reads for both journeys,
topic-set ordering, decorated action and cost totals, timelines, exact observation
messages and values, and confounder ordering. `lib/journeys/comparison.ts` owns the
pure projection from two already-authorized `JourneyDetail` values.
`lib/repository.ts` retains the public `compareJourneys` facade, same-ID validation,
and both owned reads. Deterministic fixture commands remain in the facade for a
separate Slice 8B review because `advanceJourney` also coordinates live-journey
redraw commits; no mutation, redraw, SQL, authorization, stored-data, quota, cost,
persistence, or T02 policy moved in Slice 8A.

**Slice 8B characterization finding.** The assessed deterministic-create boundary
is stale under the current runtime catalog. Every published model is live: those
models pass request validation and are then rejected by `createJourney` with the
existing foreground-route error. The legacy `fixture-terra` identifier is absent
from both `ModelId` and `MODELS`, so it is rejected as unsupported before any D1
access. The successful create path, its library-limit and idempotency branches,
and its fixture persistence SQL therefore cannot be reached through the current
public contract. `advanceJourney` also remains a mixed boundary: legacy fixture
choose/delegate behavior shares its coordinator with live redraw commits. Moving
these blocks under `fixture-commands.ts` would imply an ownership contract the
runtime no longer has and would lack the required public characterization seam.
Slice 8B stops at a test that pins this reachability behavior. Restoring fixture
creation, deleting the unreachable path, or redesigning redraw ownership would be
a separate behavior/policy decision rather than a T01B structural refactor.

**Slice 8B disposition.** The safe option is approved: retain the legacy fixture
create and advance implementation in `lib/repository.ts`, preserve its current
public errors and stored-data compatibility, and make no extraction. The added
reachability characterization remains as protection against an accidental change.
Slice 8B is closed as an intentional no-move decision; any future removal,
restoration, or redraw-boundary redesign requires separate authorization and
behavior-level safety criteria.

### Slice 9 — Split generic product repository operations by owner

**Objective.** Replace the historically generic `product-repository` boundary
with preferences, snapshots/export, journey management, and research-status
owners as their consumers become stable.

**In scope.** One operation group per review unit with compatibility re-exports.

**Out of scope.** Behavior, SQL, route shape, deletion semantics, data retention,
or broad repository interfaces.

**Safety net.** Direct tests for preferences validation/defaults, snapshot
authorization/capacity, export shape, management changes, and research status
privacy. Run full baseline and revalidate ownership/data exposure for each unit.

**Implemented boundary decision (Slice 9A).** Research-status characterization
pins the identity-bound request query and bind order, ready/pending/failed field
projection, null handling, and the indistinguishable not-found result for absent
or unauthorized requests. `lib/research-status-repository.ts` now owns this
single read-only operation. Its route imports the explicit owner, while
`lib/product-repository.ts` retains a compatibility re-export. Preferences,
journey management, snapshots/export, live request lifecycle, SQL semantics,
stored data, retention, quotas, costs, and T02 policy are unchanged.

**Implemented boundary decision (Slice 9B).** Preference characterization pins
the identity-bound read and default fallback, stored-field projection, locale
normalization, validation errors before D1 access, upsert SQL and bind order, and
the current behavior that reads and writes `imagePreference: "prefer"` regardless
of the stored or requested image preference. `lib/preferences-repository.ts` now
owns preference defaults, validation, reads, and writes. Bootstrap, preferences,
and starter routes import that explicit owner, while `lib/product-repository.ts`
retains compatibility re-exports. No image policy, SQL semantics, stored-data
shape, authorization, quota, cost, retention, or T02 behavior changed.

**Implemented boundary decision (Slice 9C).** Journey-management
characterization pins request validation before D1 access, title normalization,
omitted-value preservation, the initial identity-bound and soft-delete-filtered
journey read, exact update SQL and bind order, optimistic version increment, the
retryable version-conflict result, and the final authorized reread after success.
`lib/journey-management-repository.ts` now owns this single management mutation.
The PATCH route imports that explicit owner, while `lib/product-repository.ts`
retains a compatibility re-export and continues to own snapshots/export. No
authorization, SQL/query semantics, stored data, deletion or retention,
mutation/version behavior, quotas, costs, persistence semantics, or T02 policy
changed.

**Implemented boundary decision (Slice 9D).** Snapshot/export characterization
pins identity- and soft-delete-bound journey authorization, the additional
snapshot-owner predicate, exact insert/list SQL and bind order, label whitespace
normalization and local `en-US` default-date formatting, summary wording and
fallback selection, stored JSON property shape, UUID and clock behavior, and the
current absence of snapshot capacity, eviction, or retention enforcement. It
also pins the export version, catalog version, ISO timestamp, privacy text,
snapshot projection, and the current two complete authorized journey reads.
`lib/snapshots-repository.ts` now owns snapshot creation/listing and journey
export. Both routes import that explicit owner, while
`lib/product-repository.ts` retains compatibility re-exports only. No
authorization, SQL/query semantics, stored data, retention, mutation/version
behavior, persistence semantics, quotas, costs, privacy text, or T02 policy
changed.

### Slice 10 — Reassess live request admission and commit after T02

**Objective.** Apply the T02-approved cost/abuse policy, then separate live request
normalization, atomic admission/reservation, and live commit responsibilities.

**Prerequisite.** Explicit product decision and tests for every provider
operation, maximum-cost reservation, settlement, project/identity/anonymous
limits, emergency disable, leases, and concurrency.

**Out of scope.** This is not authorized as a pure T01B source move. If T02 changes
behavior, deliver the policy fix separately from subsequent structural movement.

**Safety net.** Concurrency-capable D1 tests for simultaneous identities,
idempotent replay, takeover, insufficient balance, settlement/failure release,
version races, atomic create/advance commits, and every provider operation.

**Validation/rollback.** Focused concurrency/repository/route tests, full
baseline, operational budget checks, and a rollback that restores the prior
admission path without reversing committed user data. Revalidate all T01-S01,
T01-S02, T01-S05, T01-S08, and T01-S10 conclusions.

## Closeout disposition

- Slices 1–9D are complete with their documented characterization coverage.
- Slice 8B deliberately retains unreachable legacy fixture creation and the mixed
  advance/redraw coordinator; it is not pending extraction.
- `lib/product-repository.ts` remains a compatibility-only re-export facade.
- The current forced `prefer` image behavior remains characterized rather than
  redesigned.
- Slice 10 and any restructuring of `lib/live-repository.ts` remain blocked on an
  explicit T02 cost and abuse policy plus concurrency-capable safety tests.
- No additional source movement is required to close T01B.

## T01B done condition

T01B is complete when Slices 1–9D retain their focused characterization and the
full validation baseline, the documented ownership boundaries match the generated
dependency index, and Slice 10 remains deferred to T02. Those conditions are met
at this closeout; later policy or behavior changes require separately authorized
work.
