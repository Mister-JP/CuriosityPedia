# T02 Lease and Takeover Concurrency Design

**Status:** Approved and implemented July 18, 2026. T01B Slice 10 and guest abuse controls remain deferred.

**Scope:** Foreground live-research requests handled by `POST /api/research` and coordinated through `research_requests` in `lib/live-repository.ts`.

**Out of scope:** Guest-cookie rotation, IP/device abuse controls, quota amounts, model policy, prices, retry counts, redraw behavior, privacy, retention, identity policy, and the T01B Slice 10 restructuring of `lib/live-repository.ts`.

## Executive finding

Before this slice, the mechanism was a recent-started-request check, not a renewable or fenced lease. A request was treated as active for 130 seconds from `started_at`; its activity was never renewed. Takeover changed the selected request's status to `failed`, but it could not directly signal provider work already executing in another request. A worker could also remain `researching` after the 130-second admission window, and commit authorization checked its status rather than its age or an ownership generation.

The implemented correction keeps lease ownership on `research_requests`, adds an opaque per-acquisition fencing token and renewable expiry, enforces at most one active request per identity, and requires the current unexpired token inside the atomic commit transaction. It adds no coordinator service and does not restructure `lib/live-repository.ts` before Slice 10.

## Verified current behavior

The following statements preserve the pre-implementation behavior verified on July 18, 2026. They explain the defects corrected by this slice and are not a description of the resulting runtime.

### Admission and expiry

- `prepareLiveResearch` first resolves any matching identity/idempotency row. A committed row replays; any `reserved` or `researching` row conflicts; a failed row also requires a new idempotency key.
- The active-request query selects only the newest `reserved` or `researching` row whose `started_at` is within the preceding 130 seconds.
- `started_at` is written once when the request is inserted. No code renews it.
- `research_requests` has no lease-expiry or fencing column. The similarly named `research_runs.lease_expires_at` column is not used by admission, takeover, provider execution, or commit; `research_runs` rows are created only with a successfully committed turn.
- Admission checks for an active request and inserts the new `researching` request in separate database operations. The rolling live-run count is conditionally rechecked by the insert, but the insert does not condition on the absence of another active request. Two distinct request keys can therefore both become `researching` when they race below the rolling run limit.
- Passing 130 seconds does not change durable status. The old row can remain `researching` indefinitely while a new request is admitted.

### Takeover

- Without `takeoverExisting`, a recently started active row produces retryable `ALREADY_IN_PROGRESS`.
- With `takeoverExisting`, only the newest row returned by the recent-active query is conditionally changed to `failed` with `TAKEN_OVER`; the new request then proceeds through the normal run-limit check and insert.
- The client creates a new idempotency key for takeover.
- There is no durable single-owner constraint, so a race can leave multiple active rows, and takeover does not invalidate older active rows that were not selected.
- Takeover does not address an active row older than 130 seconds; it simply admits the new request while the old row remains `researching`.

### Cancellation and provider work

- Browser navigation aborts the fetch used for the live-research stream.
- If stream cancellation reaches the server `ReadableStream.cancel` callback, the route aborts its in-memory `AbortController`. The signal is passed through the live workflow to provider fetches, including supplemental work.
- The route catch path then attempts to mark its request failed. A worker/process termination can prevent that cleanup; expiry by elapsed time is the only current admission recovery.
- A takeover request has no reference to the old route's in-memory controller. It cannot directly abort already-dispatched provider work in another isolate or process.
- Per-provider-call cost reservations remain independent of this coordination. A known provider result settles to actual cost; an ambiguous aborted outcome retains its full cost hold. Lease loss must not release or rewrite those authoritative cost records.

### Commit and stale workers

- Create and advance call `assertLiveResearchOwnsLease`, but that function verifies only that this identity/request row still has status `researching`.
- Commit statements also use `status = 'researching'` in places, but no expiry or ownership generation is checked.
- A takeover that changes the old row to `failed` before the old commit's status predicate is evaluated generally prevents that commit. This is status invalidation, not fencing.
- Mere passage beyond 130 seconds does not prevent an old worker from committing. It remains eligible while its row remains `researching`.
- There is a check-then-commit interval between the standalone status read and the D1 batch. The final design must place the authoritative fence inside the commit transaction and must make every mutation depend on the successful fenced root mutation; an application check after a batch is not sufficient protection against partial writes.
- Journey-version optimistic concurrency can reject some competing advance commits, but it is not an identity lease and does not protect live creates or advances on unrelated journeys.

### Recovery and status

- A committed idempotency key replays its journey.
- A failed idempotency key cannot be retried; callers must use a new key.
- A stranded `researching` key never becomes failed automatically. The same key remains in-progress forever, even after its 130-second admission window has passed.
- `GET /api/research/:runId` reports the stored request status and terminal error/result fields. It does not project effective expiry or distinguish a stranded row from a live worker.

## Safety properties the approved design must establish

1. At most one unexpired foreground lease is authoritative for an identity.
2. Admission, expiry replacement, and explicit takeover have one atomic winner under concurrency.
3. Only the holder of the current fencing token may renew, fail, or commit the request.
4. Lease expiry or takeover makes a stale worker permanently unable to persist a journey or turn, even if provider work later succeeds.
5. Ownership loss aborts locally executing provider work promptly when the old worker is still alive, without claiming that cross-isolate cancellation is instantaneous or guaranteed.
6. Provider cost reservation and settlement semantics are unchanged by lease loss.
7. A crash recovers through bounded expiry without silently replaying provider work or reusing a failed idempotency key.
8. Create and advance commit batches either persist one complete fenced result or no journey mutation.

## Smallest coherent design

### Persistence shape

Add only the lease state needed to `research_requests`:

- `lease_token TEXT`: a cryptographically random, opaque token generated for this acquisition;
- `lease_expires_at INTEGER`: the authoritative renewable deadline in milliseconds;
- an index supporting identity/status/expiry lookup; and
- a partial unique index on `identity_id` for active statuses (`reserved`, `researching`) so concurrent admission has one durable winner.

Do not reuse `research_runs.lease_expires_at`. A research run is a committed-turn record created too late to coordinate foreground request ownership. Do not put lease behavior in `provider_cost_reservations`; cost admission and workflow ownership have different lifecycles and failure semantics.

Database time should be authoritative for comparing and extending expiry so workers do not make takeover decisions from different local clocks.

### Acquisition

Within one D1 transaction/batch:

1. For ordinary admission, invalidate an active row only if its stored expiry has passed. For explicit takeover, invalidate the current active row regardless of expiry.
2. Mark an invalidated row terminal with a specific cause (`LEASE_EXPIRED` or `TAKEN_OVER`) and `completed_at`.
3. Insert the new request with a fresh token, `researching` status, and initial expiry while preserving the existing conditional rolling-run admission.
4. Let the active-identity unique index select one winner if ordinary admissions or takeovers race.

The implementation must verify with the real D1 binding that a uniqueness failure rolls back the full batch. If that property is not available, use an explicit transaction-capable D1 primitive before implementing this shape; do not emulate correctness with separated reads and writes.

An explicit takeover must replace an active lease in that transaction, not behave as an unconditional new request. Transaction order defines the race:

- if takeover fences the old token first, the old commit must fail;
- if the old commit becomes terminal first, takeover must not dispatch duplicate provider work and should return a refresh/retry conflict; and
- if two takeovers race, exactly one replacement wins and the loser must not replace the winner.

Takeover continues to use a new idempotency key. Quota counting remains unchanged: failed/expired/taken-over requests are not retroactively made committed runs, and provider attempts remain represented by their independent cost reservations and diagnostics.

### Renewal

The route starts a lease keeper after acquisition and stops it at terminal completion. A renewal is one conditional update:

```sql
UPDATE research_requests
SET lease_expires_at = <database now plus lease duration>
WHERE id = <request>
  AND identity_id = <identity>
  AND status = 'researching'
  AND lease_token = <token>
  AND lease_expires_at > <database now>
```

Zero changed rows means ownership is lost or already expired. The worker aborts its shared workflow signal, stops retries and supplemental calls, skips commit, and conditionally records failure only if it still owns the token. A renewal persistence error is fail-closed for new provider dispatch; the recommendation below also aborts current work rather than running without a confirmable lease.

### Takeover cancellation

The takeover transaction changes durable ownership immediately. That token change is the cancellation signal across isolates.

The old live worker observes loss on its next renewal and aborts the same signal already passed to primary, retry, repair, and recovery work. This is cooperative best-effort cancellation: bytes already sent to OpenAI may run or be billed, and network/provider cancellation may be ambiguous. The fenced commit, rather than cancellation, is the correctness guarantee.

Before each separately admitted provider attempt, including automatic retry and supplemental repair/recovery, the workflow should verify that it still holds an unexpired token. This prevents dispatch of a new attempt after known takeover between renewal ticks. It does not alter retry counts or provider-cost admission.

### Fenced commit

Pass the lease token in the prepared server-only context; never accept it from the browser.

Create and advance commits must check `request id + identity id + researching status + lease token + unexpired lease` inside the same D1 transaction as the journey mutations. Reorder or condition statements so every mutation depends on the successful fenced root write. The transaction changes the request to `committed` exactly once and clears or renders the lease terminal.

The standalone preflight check may remain only as an early error optimization; it is not authoritative. A stale worker gets a non-retryable ownership-lost result, persists no partial journey data, and does not overwrite the terminal `TAKEN_OVER` or `LEASE_EXPIRED` reason written by the winner.

### Failure, disconnect, and recovery

- A confirmed client disconnect aborts local work and conditionally marks the request failed/relinquished using its token.
- A normal provider or validation failure conditionally marks only the still-owned request failed.
- If the worker dies before cleanup, the row remains active only until its stored expiry. The next ordinary acquisition may atomically mark it `LEASE_EXPIRED` and proceed.
- Recovery does not resume a partially completed provider workflow. The user starts a new request with a new idempotency key, matching current failed-request semantics.
- A committed key remains replayable. A taken-over, expired, cancelled, or otherwise failed key remains terminal and cannot later commit.
- Status reads should report durable terminal causes. They need not introduce a new public status enum solely for lease expiry; the existing `failed` status plus bounded error code/message is sufficient unless product requirements later demand a distinct presentation.

## Recommended parameters and semantics for approval

The following values are proposals, not current behavior:

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Initial expiry | 45 seconds after database acquisition time | Long enough for transient scheduling delay, much shorter than the current fixed 130-second stale window. |
| Renewal cadence | Every 15 seconds, extending back to 45 seconds | Keeps roughly two missed renewal opportunities before expiry while bounding stale ownership. |
| Renewal failure | Abort current work on ownership loss or inability to confirm renewal; do not dispatch another provider attempt | Fail-closed and simple; avoids knowingly spending while ownership is uncertain. |
| Ordinary admission | Reject while the current lease is unexpired; after expiry, atomically fail it as `LEASE_EXPIRED` and acquire | Preserves one foreground run without requiring explicit takeover after a crash. |
| Explicit takeover | Atomically fence the active token and acquire a new request/token; if the old request committed first or another takeover already won, do not dispatch and require refresh/retry | Matches the “Use this tab” intent without creating duplicate work after the race is already over. |
| Cancellation | Cooperative abort on disconnect or observed lease loss; never promise provider-side cancellation or cost release | Reflects the actual cross-isolate and provider boundary. |
| Stale-worker commit | Always reject; no partial persistence; do not overwrite the winner's terminal reason | This is the core fencing guarantee. |
| Recovery | No workflow resume; new idempotency key after failed/taken-over/expired/cancelled; committed keys replay | Preserves current idempotency expectations and avoids duplicate hidden provider work. |

The 45/15-second values should be configuration constants owned with the lease policy, not new environment-controlled product knobs. Changing them later is an operational concurrency decision and should be tested against the longest provider workflows; it must not silently change retry or provider timeout policy.

## Required characterization before implementation

Use concurrency-capable D1 integration/contract tests rather than only mocked sequential statements:

- two simultaneous ordinary acquisitions for one identity produce exactly one owner;
- two simultaneous explicit takeovers produce exactly one new owner;
- renewal succeeds only for the current unexpired token;
- expiry replacement permanently fences the old worker;
- takeover during primary, retry delay, repair, recovery, validation, and commit prevents subsequent dispatch/commit;
- stale create and stale advance commits produce no journey, turn, option, edge, action, evidence, research-run, or committed usage partials;
- journey-version conflict and lease loss remain distinguishable and preserve existing public safety wording where applicable;
- disconnect cleanup, worker-death expiry, committed replay, and new-key recovery behave as approved;
- known and ambiguous provider outcomes retain the existing provider-cost settlement rules; and
- migration-chain validation covers the new migration after `drizzle/0010_condemned_red_ghost.sql` without modifying deployed migration history.

## Owner approval gate — satisfied

The owner approved all six semantic groups before persistence or behavior work began:

1. **Expiry:** 45-second initial/renewed lease and database-time comparison.
2. **Renewal:** 15-second cadence; abort on lost ownership or unconfirmable renewal; check before every new provider attempt.
3. **Takeover:** explicit immediate token replacement with cooperative cancellation; transaction order wins, and takeover does not dispatch if the old commit or another takeover won first.
4. **Cancellation:** disconnect and lease-loss abort are best effort; already-dispatched work may finish or incur an uncertain/full hold.
5. **Stale-worker commit:** unconditional fenced rejection with zero partial journey persistence and no terminal-reason overwrite.
6. **Recovery:** expired work becomes terminal `failed/LEASE_EXPIRED`; no resume; a new key retries; committed keys alone replay.

Approval of this note authorized this bounded T02 implementation slice only. It did not authorize T01B Slice 10, incidental `lib/live-repository.ts` restructuring, guest abuse controls, or any policy changes listed as out of scope.

## Implementation outcome

- `drizzle/0011_bent_wind_dancer.sql`, applied after `drizzle/0010_condemned_red_ghost.sql`, adds the request lease token, expiry, lookup index, and partial unique active-identity index. It terminalizes pre-migration active rows before creating the unique index.
- Admission and takeover remain in `lib/live-repository.ts`. Database time governs 45-second acquisition/expiry and 15-second conditional renewal.
- The identity-scoped admission conflict carries the observed active request ID back to the attempting tab. Explicit takeover must target that ID; commit-first and takeover-first races therefore have one durable winner, and a second takeover cannot replace the first winner accidentally.
- The research route renews while work is active, aborts on unconfirmable renewal, and checks the lease before every primary, retry, image-note repair, citation repair, and citation recovery provider dispatch.
- Create and advance batches use the fenced journey/turn insert as their root. Every downstream live mutation depends on that root; stale tokens persist no partial journey data and cannot overwrite `TAKEN_OVER` or `LEASE_EXPIRED` terminal reasons.
- Provider-cost reservations remain independent and authoritative. Known outcomes still settle to actual usage; ambiguous cancellation retains the full hold.
- The migration chain and lease SQL are exercised against SQLite with foreign keys enabled. Tests cover simultaneous admission, targeted takeover, renewal, terminal-reason preservation, expiry recovery, successful create/advance commit, and stale create/advance zero-partial rejection.
- Validation after implementation: production build passed; typecheck passed; architecture index passed after regeneration; lint passed with the same three pre-existing generator warnings; migration-chain execution passed; and 125/125 tests passed.
