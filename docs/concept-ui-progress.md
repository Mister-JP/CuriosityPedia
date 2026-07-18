# CuriosityPedia conceptual-UI progress ledger

**Purpose:** Durable state for conceptual-UI work across agents, conversations, retries, and batches.

**Canonical inputs:**

- [Curiosity-learning North Star](./curiosity-learning-north-star.md)
- [Final-product screen atlas](./final-product-screen-atlas.md)
- [Conceptual-UI agent operating prompt](./concept-ui-agent-operating-prompt.md)

## Ledger rules

- Screen Atlas frame IDs are the unit of progress.
- Any Atlas frame absent from the Current Screen Register is `NOT STARTED`.
- Add one register row per started screen, including screens worked on as a batch.
- The Chronological Decision Log is append-only.
- `APPROVED` requires an exact artifact reference and a logged Final Concept Agreement.
- `IMPLEMENTED` requires separate verification in the running product.
- Rejected and replaced work remains in the log and becomes `SUPERSEDED`; it is not deleted.
- Update the Portfolio Snapshot after every register change.

## Status vocabulary

`NOT STARTED` · `INSPECTING` · `BRIEF DISCUSSION` · `BRIEF AGREED` · `CONCEPTS GENERATED` · `REVISION` · `APPROVED` · `BLOCKED` · `SUPERSEDED` · `IMPLEMENTED`

## Portfolio Snapshot

| Field | Current value |
|---|---|
| Atlas frames | 133 |
| Not started | 132 |
| Inspecting | 0 |
| Brief discussion | 1 |
| Brief agreed | 0 |
| Concepts generated | 0 |
| Revision | 0 |
| Approved | 0 |
| Blocked | 0 |
| Superseded | 0 |
| Implemented | 0 |
| Active screen | G02 — Standard desktop shell (`BRIEF DISCUSSION`) |
| Latest approved screen | None |
| Recommended next screen | G02 — Standard desktop shell |
| Independent alternative | A01 — First-visit invitation, after G02 establishes the shell |
| Last updated | 2026-07-18 15:57 CDT (America/Chicago) |

## Current Screen Register

Any Atlas frame not listed here is `NOT STARTED`.

| Screen ID | Canonical name | Family | Status | Current implementation reference | Current screenshot | Latest concept | Next action | Updated |
|---|---|---|---|---|---|---|---|---|
| G02 | Standard desktop shell | Shell family | `BRIEF DISCUSSION` | `/`, `/library`, `/journeys/:journeyId`, `/journeys/:journeyId/map`; `app/curiositypedia-experience.tsx`; `app/globals.css`; `app/routes.ts` | `docs/concept-ui-artifacts/current-ui/g02/01-home-1440x1000.png`; `02-library-1440x1000.png`; `03-journey-stage-1440x1000.png`; `04-journey-map-1440x1000.png` | — | Discuss and approve the G02 Screen Brief Agreement | 2026-07-18 15:57 CDT |

## Approved Concept Index

| Screen ID | Canonical name | Approved artifact | Final agreement event | Approved viewports | Approval date | Supersedes |
|---|---|---|---|---|---|---|
| — | No concepts approved | — | — | — | — | — |

## Active handoff

**Current focus:** G02 — Standard desktop shell (`BRIEF DISCUSSION`).

**Next action:** Discuss the G02 Screen Brief Agreement, resolving desktop destination visibility, the active-session indicator, and global-search placement. Do not generate concepts until the user approves the agreement and it is logged as `BRIEF AGREED`.

**Decisions already fixed by canonical documents:**

- Build on the current warm editorial visual identity.
- The final primary destinations are Play, Current session, Atlas, Library, Inquiry Book, Progress, and Account.
- The shell must stay quieter than images, reading, writing, and graph work.
- Current-session state must survive navigation.
- Mobile needs a separate navigation composition when desktop navigation does not reflow cleanly.

**Open questions for G02:**

- Whether all seven primary destinations remain directly visible at desktop width.
- Whether Inquiry Book and Progress live in primary navigation or an identity/library menu.
- How the active-session indicator behaves during research, reading, curiosity work, and pause.
- Whether global search is persistent or invoked from a compact control.

## Chronological Decision Log

### 2026-07-18 — Progress system initialized

**Event type:** Process setup

**Screens:** None

**User decision:** Conceptual UI will be developed incrementally. A work session may cover one screen, part of one screen, or several related screens. Progress must remain recoverable across conversations and agents.

**Process agreement:**

- Every agent reads the North Star, Screen Atlas, and this ledger before work.
- The current implementation and a rendered screenshot are inspected before generation.
- A Screen Brief Agreement is discussed and logged before image generation.
- Image generation creates proposals, not approvals.
- Final approval is logged separately with an exact artifact reference.
- Retries and restarts preserve history.
- Every work session ends with a dependency-aware next-screen proposal or an explicit pause handoff.

**Artifacts created:**

- `docs/concept-ui-agent-operating-prompt.md`
- `docs/concept-ui-progress.md`

**Next action:** Begin G02 — Standard desktop shell.

### 2026-07-18 15:57 CDT — G02 Standard desktop shell inspection completed

**Event type:** Current UI inspection

**Status change:** `NOT STARTED` → `BRIEF DISCUSSION`

**Current implementation:** Routes `/`, `/library`, `/journeys/:journeyId`, and `/journeys/:journeyId/map`; shell and navigation in `app/curiositypedia-experience.tsx`; tokens and responsive shell styles in `app/globals.css`; route contracts in `app/routes.ts`; route behavior covered by `tests/routes.test.mjs` and leaf-view behavior by `tests/leaf-views.test.ts`.

**Current screenshots:**

- `docs/concept-ui-artifacts/current-ui/g02/01-home-1440x1000.png`
- `docs/concept-ui-artifacts/current-ui/g02/02-library-1440x1000.png`
- `docs/concept-ui-artifacts/current-ui/g02/03-journey-stage-1440x1000.png`
- `docs/concept-ui-artifacts/current-ui/g02/04-journey-map-1440x1000.png`

**Inspection findings:** The dark ink header, compact identity control, acid active state, editorial typography, warm paper, and secondary Stage/Journey Map control establish recognizable product DNA. The deployed shell and repository source now use CuriosityPedia consistently. The five legacy destinations do not express the Atlas's final seven-destination information architecture; current-session access exists only inside a journey, global search is absent, and operational model/performer controls compete with current-session navigation.

**User decision:** None yet. Inspection evidence has been captured; no brief or concept is approved.

**Agent recommendation:** Keep G02 as the only frame in this work session. Establish a quiet desktop shell with stable access to Play, Session, Atlas, Library, Inquiry Book, Progress, and Account; keep mobile composition G03 separate.

**Open questions:** Whether all seven destinations are directly visible; whether Inquiry Book and Progress can sit under another desktop control; how active research/reading/curiosity/pause states appear; whether global search is persistent or invoked.

**Next action:** Discuss and approve a G02 Screen Brief Agreement, then log it before concept generation.

## Event templates

Copy the relevant template below and append it to the end of the Chronological Decision Log.

### Screen Brief Agreement template

```md
### YYYY-MM-DD HH:MM TZ — [ID] [Canonical screen name] brief agreed

**Event type:** Screen Brief Agreement

**Status change:** `BRIEF DISCUSSION` → `BRIEF AGREED`

**Current implementation:** [Route, components, and relevant source files]

**Current screenshot:** [Exact artifact path and viewport]

**User and entry condition:** [Specific user state and preceding screen]

**Job:** [One job the screen must complete]

**Visible on entry:** [Information hierarchy]

**Primary action:** [One action]

**Supporting actions:** [No more than two in the dominant composition]

**Required states:** [Loading, expanded, selected, mobile, recovery, and other required states]

**Exits:** [Destination frames]

**Retain:** [Specific current UI elements]

**Change:** [Specific current UI changes]

**Remove:** [Specific removals]

**Introduce:** [Specific additions]

**Concept content:** [Continuous realistic journey content]

**Viewports:** [Dimensions and whether mobile is a separate concept]

**Visual constraints:** [Approved constraints]

**Deferred questions:** [Questions explicitly left open]

**Non-goals:** [What this frame will not solve]

**User decision:** [Direct decision or concise faithful paraphrase]

**Next action:** Generate [count] conceptual direction(s) using the logged brief and attached current screenshot.
```

### Concept generation or revision template

```md
### YYYY-MM-DD HH:MM TZ — [ID] concepts [generated/revised/rejected]

**Event type:** [Concept generation / Revision / Rejection / Restart]

**Status change:** `[OLD]` → `[NEW]`

**Brief agreement:** [Link or heading reference]

**Source screenshot:** [Path]

**Generated artifacts:** [One exact path/reference per concept]

**What each attempt explored:** [Structural differences, not marketing names]

**User feedback:** [Direct decision or concise faithful paraphrase]

**Elements to preserve:** [Specific elements]

**Elements to change:** [Specific elements]

**Superseded artifacts:** [References, or None]

**Next action:** [Exact revision, approval decision, restart, or pause]
```

### Final Concept Agreement template

```md
### YYYY-MM-DD HH:MM TZ — [ID] [Canonical screen name] approved

**Event type:** Final Concept Agreement

**Status change:** `[OLD]` → `APPROVED`

**Approved artifact:** [Exact stable path/reference]

**Approved viewports:** [Dimensions]

**Final hierarchy:** [Regions in visual priority order]

**Primary interaction:** [Behavior]

**Supporting interactions:** [Behavior]

**Retained from current UI:** [Components and visual DNA]

**New components:** [Components required]

**Behavior not visible in the concept:** [Loading, focus, keyboard, motion, persistence, transitions]

**Accessibility and mobile implications:** [Specific requirements]

**Inherited by:** [Neighboring screens that must use these decisions]

**Deferred decisions:** [Explicit list]

**Supersedes:** [Earlier artifact/agreement, or None]

**User approval:** [Direct decision or concise faithful paraphrase]

**Recommended next screen:** [ID, name, and dependency reason]
```

### Pause or blocker template

```md
### YYYY-MM-DD HH:MM TZ — [ID or portfolio] paused/blocked

**Event type:** [Pause / Blocker]

**Current status:** [Status]

**Completed:** [What is durable]

**Unresolved:** [Exact unresolved questions]

**Blocking dependency:** [Input, artifact, screen, access, or decision]

**Resume from:** [Exact next action]

**Recommended next screen:** [Independent screen, or None]
```
