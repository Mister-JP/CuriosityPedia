# CuriosityPedia Refactoring Playbook

> Required reading for T01B and any later structural refactoring. This document distills relevant software-design literature into project-specific operating guidance. It is not a substitute for engineering judgment, tests, or direct inspection of the repository.

## Purpose

CuriosityPedia contains several unusually large TypeScript/React modules. Large files are signals worth investigating, but size alone cannot tell us whether code is unsafe, tangled, or badly organized. This playbook defines how an agent should assess and improve the structure without turning cleanup into an uncontrolled rewrite.

The desired outcome is code that is easier to understand, test, change, secure, and document. The objective is not to maximize the number of files, minimize line counts, eliminate every duplicate line, or impose a particular author's preferred style.

## Source material and how to use it

This playbook draws primarily from:

- Robert C. Martin, [*Clean Code: A Handbook of Agile Software Craftsmanship*, First Edition](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship/P200000009044/9780132350884) and the [Second Edition](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship-2nd-edition/P200000013239/9780135398548): naming, focused responsibilities, readable functions, error handling, tests, and continuous cleanup.
- Martin Fowler, [*Refactoring: Improving the Design of Existing Code*, Second Edition](https://martinfowler.com/books/refactoring.html): small, behavior-preserving transformations supported by tests.
- Michael Feathers, [*Working Effectively with Legacy Code*](https://www.informit.com/store/working-effectively-with-legacy-code-9780132931779): introducing test seams and changing insufficiently tested systems safely.
- John Ousterhout, [*A Philosophy of Software Design*, Second Edition](https://web.stanford.edu/~ouster/cgi-bin/aposd.php): managing complexity, designing deep modules, making important information obvious, and keeping implementation details behind useful interfaces.

These sources disagree on some design choices. In particular, aggressively tiny functions and classes can reduce local size while increasing navigation and interface complexity. Treat all rules as hypotheses to evaluate against CuriosityPedia's behavior and change patterns.

## The central model: optimize for safe understanding and change

A module is healthy when a developer can answer these questions without reconstructing the entire application:

- What responsibility does this module own?
- What does it expose, and what does it hide?
- What state does it own or mutate?
- Which external systems can it affect?
- Which business and security rules does it enforce?
- What can call it, and what can it call?
- How is its behavior verified?
- What other code must usually change with it?

Refactoring is successful when these answers become clearer and changes become safer. A smaller file that requires opening twelve neighboring files to understand a single operation may be worse than the original.

## Working definitions

### Refactoring

A structural change that preserves externally observable behavior. Moving code while also changing the UI, request contract, database shape, dependency versions, model policy, or feature behavior is not a pure refactor and must be planned separately.

### Characterization test

A test that records what the current system actually does. It protects behavior during change even if the current behavior is awkward or later needs reconsideration.

### Responsibility

A coherent reason for a module to change. “Everything needed by this page” is often too broad if it combines rendering, network orchestration, persistence, usage accounting, security policy, and content transformation.

### Coupling

The knowledge one unit must possess about another. Coupling is especially risky when UI code knows persistence details, provider code owns product policy, or several modules independently reproduce the same security or quota decision.

### Cohesion

How strongly the contents of a module belong together. A cohesive module may legitimately be substantial when all of its contents express one stable concept.

### Deep module

A module with a relatively simple, stable interface that hides meaningful implementation complexity. This is often preferable to many shallow wrappers that merely forward calls and add names without hiding knowledge.

## What file size can and cannot tell us

File length can indicate:

- multiple responsibilities;
- excessive state or side effects;
- repeated policy;
- weak component or service boundaries;
- difficulty locating behavior;
- insufficient modularization.

File length does not prove those conditions. Large localization dictionaries, fixtures, generated code, schemas, declarative catalogs, or cohesive reducers may be understandable and safe. Conversely, a collection of fifty-line files can still form spaghetti through circular dependencies, hidden global state, and excessive indirection.

Never recommend an extraction using line count as the only justification.

## CuriosityPedia's initial candidates

The following are assessment candidates based on a preliminary line-count scan, not findings:

| Candidate | Approximate lines | Questions to investigate |
| --- | ---: | --- |
| `app/curiositypedia-experience.tsx` | 3,090 | Does it combine rendering, tree/navigation rules, async orchestration, persistence, usage, and unrelated UI regions? Where should state ownership live? |
| `lib/live-research.ts` | 2,055 | Does it combine provider calls, prompt construction, validation, retries, citations, persistence, policy, and usage accounting? Which rules are security- or cost-sensitive? |
| `lib/repository.ts` | 1,306 | Are storage concerns, domain behavior, mapping, queries, and authorization mixed? What is the actual repository contract? |
| `lib/live-repository.ts` | 958 | How does it overlap with `repository.ts` and `product-repository.ts`? Are distinctions based on real responsibilities or historical growth? |
| `db/schema.ts` | 563 | Is this cohesive declarative schema, generated material, or mixed with runtime logic? Splitting may not improve it. |
| `lib/contracts.ts` | 429 | Are the contracts cohesive and stable, or has the file become a global bucket that couples unrelated domains? |

Line counts change over time. Recalculate them during T01B and verify every hypothesis through code, imports, tests, and runtime flows.

## Assessment method

### 1. Establish the baseline

Before suggesting structure:

- inspect the working tree and preserve unrelated changes;
- record runtime and framework versions;
- run `npm run build`;
- run `npm test`;
- run `npm run typecheck`;
- run `npm run lint`;
- run `npm run architecture:check`;
- record failures without quietly correcting them.

A future change must be compared with this baseline so that pre-existing problems are not mistaken for refactoring regressions.

### 2. Follow behavior, not only imports

Trace representative product flows from entry to side effect:

- application load and session bootstrap;
- starting a research question;
- selecting a model/provider;
- streaming or receiving research results;
- storing a journey and its branches;
- applying quota and usage accounting;
- loading an existing journey;
- changing preferences;
- handling a provider, validation, database, or authorization failure.

Record where policy is decided, where state changes, and where effects occur. An import graph alone cannot reveal duplicated decisions or implicit contracts.

### 3. Build a responsibility inventory

For each hotspot, list every distinct responsibility using concrete language. Examples:

- renders the question chooser;
- decides which branch is active;
- builds a research request;
- authorizes a journey read;
- converts a database row into a domain value;
- records provider-token usage;
- formats a user-facing error.

Vague labels such as “handles research” or “manages data” conceal the problem.

### 4. Identify change coupling

Use history where available and direct inspection to ask:

- Which files repeatedly change together?
- Does one product rule appear in several layers?
- Does adding a provider or journey field require unrelated edits?
- Can a UI modification accidentally affect persistence or quota behavior?
- Are circular or back-channel dependencies present?

The target structure should reduce the number of places needed for a coherent change without creating an all-knowing central module.

### 5. Identify test seams and gaps

For every proposed boundary, determine:

- which current tests exercise it;
- which observable behavior is unprotected;
- whether time, randomness, network, environment, database, or provider access is embedded directly;
- what minimal seam would allow deterministic testing;
- whether a characterization test should precede movement.

Do not redesign for hypothetical testability at the expense of the product. Add the smallest useful seam.

### 6. Rank findings

Rank a refactoring opportunity using:

- frequency of change;
- cost of understanding;
- defect/security/cost risk;
- number of responsibilities;
- degree of coupling;
- current test protection;
- confidence in the proposed boundary;
- value unlocked for roadmap work.

High line count alone contributes little to priority.

## Design principles for the target structure

### Make ownership explicit

Every important business rule should have an obvious owner. Model access, quota calculation, journey authorization, and data-retention behavior must not be reimplemented casually in UI and API layers.

### Separate policy from mechanism

Examples:

- “Which models may this user access?” is policy.
- “How do we send a request to a provider?” is mechanism.
- “May this user read this journey?” is policy.
- “How do we query the relevant row?” is mechanism.

Keeping them distinct makes the security decision testable and prevents infrastructure details from defining product behavior accidentally.

### Keep framework details near the edges

React components should primarily express presentation and interaction. Route handlers should translate transport inputs and outputs. Database adapters should own persistence details. Provider adapters should own provider-specific mechanics. Domain/application logic should not require React, HTTP, SQL, or a particular provider unless that dependency is truly essential.

### Prefer stable, meaningful interfaces

An interface is useful when it hides volatile or complex knowledge. Avoid interfaces created only to satisfy a pattern or wrap a single trivial call. Name interfaces using product concepts and make invalid or unauthorized operations difficult to express.

### Keep state ownership unambiguous

For UI and asynchronous research behavior, document:

- the canonical source of each state value;
- who may update it;
- how pending, success, failure, cancellation, and stale responses behave;
- what persists across navigation or reload;
- what is derived rather than stored.

Duplicated state is a common source of tangled React code.

### Design for local reasoning

A reader should be able to understand one operation without chasing a long chain of one-line wrappers. Keep related behavior close; hide details that callers do not need; avoid action-at-a-distance through mutable globals, ambient context, or unexpected side effects.

### Use precise, consistent names

Use the product's domain vocabulary consistently across UI, routes, domain logic, persistence, and documentation. A name should reveal intent and ownership. Avoid catch-all terms such as `manager`, `processor`, `handler`, `helper`, `common`, or `utils` when a more precise responsibility exists.

### Keep error behavior explicit

Separate provider, validation, authorization, quota, persistence, and unexpected failures. Preserve existing user-visible semantics during refactoring. Never leak secrets or sensitive internals to logs or clients merely to simplify error propagation.

### Allow temporary duplication

Do not create a shared abstraction merely because two blocks look similar. First determine whether they represent the same stable concept and are expected to change together. A small amount of duplication is often safer than the wrong shared dependency.

## Rules against over-refactoring

The following are prohibited unless separately justified:

- A whole-codebase rewrite.
- Splitting every file above an arbitrary length.
- Creating one file per function or component by default.
- Introducing a new framework, state library, architectural pattern, or dependency as cleanup.
- Changing database schemas, route shapes, stored data, provider behavior, prompts, quotas, or UI behavior incidentally.
- Replacing clear code with a generic abstraction for hypothetical reuse.
- Moving all miscellaneous code into `utils`, `helpers`, `services`, or `common`.
- Adding comments that merely translate the code into English.
- Deleting apparently dead code without verifying references, runtime entry points, configuration use, and tests.
- Combining formatting churn, renames, behavior changes, and module movement in one review unit.

## Planning an implementation slice

Every slice should fit this template:

### Objective

One structural improvement stated in responsibility terms.

### In scope

Specific files, functions, and behavior.

### Out of scope

Features, behaviors, dependencies, contracts, and adjacent cleanup intentionally deferred.

### Preserved behavior

User-visible, API, persistence, security, quota, logging, and failure behavior that must remain unchanged.

### Safety net

Existing tests plus characterization tests required before movement.

### Transformation

A short sequence of small operations such as rename, extract function, extract module, move function, introduce parameter, or invert one dependency.

### Validation

Targeted tests after each meaningful operation, followed by the agreed full suite. Include manual checks only for behavior that cannot yet be verified reliably through automation.

### Documentation impact

Architecture, code-index, security, operations, or contributor documentation that must change with the structure.

### Rollback

How to return to the known-good structure if assumptions fail.

### Completion evidence

Passing verification, clearer ownership, reduced coupling, and a concise explanation of what became easier to understand or change.

## Recommended first slices

Do not select a slice until T01B assessment is complete. Good first-slice characteristics are:

- high confidence about the responsibility boundary;
- meaningful benefit to upcoming roadmap work;
- strong existing tests or an inexpensive characterization test;
- limited security, quota, and persistence risk;
- no public-contract or user-visible change;
- easy rollback.

An extraction from `app/curiositypedia-experience.tsx` may be a useful first slice if it isolates a cohesive presentational region or pure state transition. It should not be chosen first if the proposed extraction crosses unclear async state, persistence, or branch-navigation behavior.

## Validation and review policy

After each approved slice:

1. Inspect the diff for accidental behavior or unrelated formatting changes.
2. Run the most focused relevant tests.
3. Run type-check and lint checks relevant to the change.
4. Run the full agreed validation suite before declaring the slice complete.
5. Recheck security, quota, authorization, logging, persistence, and error behavior when touched.
6. Update `docs/architecture.md` and `docs/code-index.md` if ownership or dependency direction changed.
7. Compare against the original baseline and disclose any remaining or newly introduced failure.

Do not use “tests passed” as the only review. Tests may not cover the behavior being moved.

## Stop conditions

Stop and request direction when:

- current behavior is ambiguous or contradicts documentation;
- tests and production behavior appear to disagree;
- a safe seam requires changing a public contract or stored data;
- the slice expands into a feature, dependency migration, or broad rewrite;
- security, authorization, quota, billing, privacy, or deletion semantics may change;
- unrelated user changes overlap the proposed edit;
- the target abstraction cannot be named and explained precisely;
- the proposed structure adds more navigation and concepts without hiding meaningful complexity.

## Definition of success

The refactor succeeds when:

- important responsibilities and policies have obvious owners;
- dependencies and side effects are explicit;
- upcoming product changes require fewer unrelated edits;
- critical behavior is protected by tests;
- module interfaces hide meaningful complexity;
- new contributors can locate behavior using the architecture and code index;
- security, privacy, quota, persistence, and user-visible behavior remain correct;
- the application remains continuously runnable during the work.

Line counts, file counts, abstraction counts, and test counts may help describe the result, but none of them independently prove that the design improved.

## Required agent acknowledgment

Before beginning T01B, the agent should briefly restate:

- that the assessment phase is read-only;
- that large files are candidates rather than automatic failures;
- that behavior preservation and tests govern implementation;
- that the agent will stop for approval before source changes;
- that success will be measured by clearer ownership and safer change, not by smaller files alone.
