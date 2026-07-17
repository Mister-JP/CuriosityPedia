# Architecture

This document describes the current implementation on `main`.

## System boundary

WonderDrive is one Vinext application deployed through OpenAI Sites. It contains the React interface, server routes, OpenAI integration, and D1 persistence layer.

```text
Browser
  -> Vinext pages and API routes
      -> identity, validation, and domain services
          -> OpenAI Responses API
          -> Sites-managed D1
```

There is no queue, scheduler, background worker, provider fan-out, R2 bucket, Supabase project, or separately deployed backend. Research runs synchronously as a bounded foreground request.

## Module boundaries

| Area | Owner |
| --- | --- |
| Interface orchestration | `app/wonderdrive-experience.tsx` |
| Browser API transport | `app/client-api.ts` |
| Route parsing and URL generation | `app/routes.ts` |
| Localization provider and catalogs | `app/i18n.tsx`, `app/locales/`, `lib/i18n.ts` |
| HTTP parsing and public responses | `lib/api.ts`, `lib/errors.ts` |
| Shared request and response contracts | `lib/contracts.ts` |
| Journey persistence and deterministic mutations | `lib/repository.ts`, `lib/product-repository.ts` |
| Live reservation and atomic commit | `lib/live-repository.ts` |
| Research generation and evidence validation | `lib/live-research.ts` |
| Replacement-question generation | `lib/live-redraw.ts` |
| Personalized starter generation | `lib/starter-recommendations.ts` |
| OpenAI request helpers | `lib/openai.ts` |
| Usage policy and accounting | `lib/usage-policy.ts`, `lib/provider-usage.ts`, `lib/usage-summary.ts` |
| Identity resolution | `app/chatgpt-auth.ts`, `lib/viewer.ts` |
| Database schema | `db/schema.ts` |

Dependencies flow from pages and routes into domain modules, then into D1 or OpenAI. Shared contracts and error helpers do not import repositories.

## Routes

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Start a journey and select research settings. |
| `/journeys/:journeyId` | Open the current journey turn. |
| `/journeys/:journeyId/turns/:turnId` | Open a specific saved turn. |
| `/journeys/:journeyId/map` | Display the saved journey graph. |
| `/library` | List saved journeys. |
| `/bookmarks` | Display saved snapshots. |
| `/usage` | Display live-run and spend limits. |
| `/settings` | Edit account and experience preferences. |

### API

| Route | Methods | Responsibility |
| --- | --- | --- |
| `/api/bootstrap` | `GET` | Return viewer, preferences, models, performers, presets, and starter questions. |
| `/api/session` | `GET` | List journeys visible to the current session. |
| `/api/session/upgrade` | `POST` | Transfer eligible guest data to a signed-in identity. |
| `/api/preferences` | `GET`, `PUT` | Read or replace preferences. |
| `/api/journeys` | `GET`, `POST` | List journeys or create a fixture journey. |
| `/api/journeys/:journeyId` | `GET`, `PATCH`, `DELETE` | Read, update, hide, or delete a journey. |
| `/api/journeys/:journeyId/advance` | `POST` | Choose, reject, delegate, branch, or pause. |
| `/api/journeys/:journeyId/export` | `GET` | Export a persisted journey. |
| `/api/journeys/:journeyId/snapshots` | `GET`, `POST` | List or create snapshots. |
| `/api/research` | `POST` | Create or advance a live research journey. |
| `/api/research/:runId` | `GET` | Read observable research status and events. |
| `/api/starters` | `GET` | Read cached starters; `refresh=1` explicitly regenerates them. |
| `/api/compare` | `GET` | Compare two persisted journeys selected by query parameters. |
| `/api/usage` | `GET` | Return rolling usage and spend availability. |
| `/api/diagnostics` | `GET` | Return privacy-filtered provider diagnostics. |
| `/api/health` | `GET` | Return runtime health metadata. |

The route files are thin adapters. Domain validation and persistence live in `lib/`.

## Live research transaction

1. Resolve the guest or ChatGPT identity and verify journey ownership.
2. Validate the request and reserve an idempotency key.
3. Enforce per-identity and project usage limits.
4. Build a bounded context packet from persisted journey state and preferences.
5. Call the selected OpenAI model through the Responses API with web search enabled.
6. Normalize provider-returned sources, usage, request identifiers, and observable status events.
7. Validate structured output, answer length, citations, media provenance, and exactly two distinct next questions.
8. If required, run a bounded citation repair or evidence recovery request.
9. Commit the turn, options, graph edge, sources, handoff, research metadata, and usage in D1.
10. Return only committed content.

A timeout, provider failure, invalid output, citation failure, ownership conflict, or stale journey version does not create a ready turn.

## Persistence

The schema in `db/schema.ts` groups records into:

- identities and preferences;
- journeys, turns, options, actions, edges, and snapshots;
- research requests, runs, and observable events;
- sources, source relations, and turn media;
- committed-turn usage and provider-call usage;
- personalized starter caches;
- legacy tables retained for backward-compatible reads.

Important constraints:

- provider subject identifiers are unique within an identity provider;
- request idempotency keys are unique per identity;
- action idempotency keys are unique per journey;
- one research run belongs to one turn;
- option position is unique within a turn option-set version;
- source canonical URLs are unique;
- journey versions provide optimistic concurrency control.

`drizzle/` is ordered migration history. Deployed migrations are not rewritten.

## Identity and authorization

Unsigned visitors receive temporary guest identities. Sign in with ChatGPT supplies the signed-in identity boundary. Server routes resolve the viewer and enforce ownership before reading or mutating private records.

Guest upgrade is explicit and idempotent. It transfers eligible records to the signed-in identity without treating sign-in itself as a mutation request.

## Provider integration

OpenAI Responses is the only enabled live provider. Model configuration, capability flags, prices, and research presets are defined in `lib/catalog.ts`. Provider calls use `store: false` and server-only credentials.

Persisted provider metadata includes token dimensions, web-search and fetch counts, latency, estimated cost, rate date, provider request identifiers, model snapshot, prompt version, and categorical outcome. Prompts, answer text, retrieved page bodies, credentials, and raw provider envelopes are excluded from diagnostics.

## Evidence rules

- Citations must resolve to the normalized source set returned by the provider.
- Consulted, cited, and image relations are stored separately.
- Factual media records retain the source page, caption, alternative text, and provenance fields.
- Unsupported answer blocks can be repaired, recovered through a targeted search, or removed only when the remaining answer still satisfies the minimum evidence contract.

## Localization

The interface supports English, Spanish, French, German, Portuguese, Hindi, Bengali, Arabic, Simplified Chinese, Japanese, and Korean. Preferences store both interface locale and default output locale. Each journey and turn stores its output locale so existing content is not reinterpreted when account preferences change.

## Usage controls

Rolling usage is enforced before a provider request. Limits include live-run counts, per-identity estimated spend, project estimated spend, and library capacity. `WONDERDRIVE_DAILY_BUDGET_USD` configures the rolling project spend limit.

`provider_usage_events` records every OpenAI operation, including research, repair, recovery, starter generation, and redraw. `usage_events` records committed-turn usage.

## Build and deployment

GitHub `main` is the default and production source branch. CI runs on pull requests and pushes to `main`:

1. dependency installation;
2. generated architecture-index verification;
3. ESLint;
4. TypeScript checking;
5. production build and automated tests.

The Sites build produces a Cloudflare Worker-compatible Vinext bundle. A release packages the build output, `.openai/hosting.json`, and D1 migrations, saves a version tied to the exact `main` commit, and explicitly deploys that version. GitHub pushes do not trigger deployment by themselves.

## Generated dependency index

[code-index.md](code-index.md) is generated from local imports by `scripts/architecture-index.mjs`.

```bash
npm run architecture:update
npm run architecture:check
```

Regenerate it after adding, deleting, or changing imports in TypeScript or JavaScript modules.
