# CuriosityPedia: Post-Reset Product Roadmap

> Planning notes captured on July 17, 2026. This is a prioritized backlog, not an implementation specification. No product or code changes were made as part of this note-taking session.

## Product direction

**CuriosityPedia** is a curiosity-driven learning application where a user explores information by choosing follow-up questions and moving through a branching tree of ideas.

The immediate goal is not to add many disconnected features. It is to make the existing product safer, easier to understand, more coherent, and more delightful before expanding or monetizing it.

## Priority guide

- **P0 — Protect and clarify:** security, cost exposure, data handling, and basic product comprehension.
- **P1 — Repair the core experience:** visible UI problems and the central question-navigation experience.
- **P2 — Expand and explain:** art choices, sharing, About content, and useful operational insights.
- **P3 — Monetize responsibly:** payments and related product/business decisions after the foundations are sound.

## Recommended sequence

1. Complete the repository security, hygiene, and documentation audit (T01 — completed July 18, 2026).
2. Assess and plan the structural refactor (T01B), then implement it incrementally only after the plan is approved.
3. Revalidate any T01 security, documentation, and architecture findings affected by each refactoring slice.
4. Audit API usage and cost exposure, then decide on the CuriosityPedia name and branding before rewriting user-facing copy everywhere.
5. Fix small, high-confidence UI problems and the inaccurate loading state.
6. Explore and validate the branching question-tree interface through visual concepts and prototypes.
7. Add content-source choice, sharing, and About material.
8. Design privacy-aware analytics and a sustainable business model.
9. Complete account, data, legal, payment, and support readiness before charging users.

---

## P0 — Protect and clarify

### T01 — Repository security, hygiene, and documentation audit

**Status:** Completed July 18, 2026. Retain its findings as the baseline and revalidate affected findings after structural changes.

**Why now:** The repository may contain obsolete material, missing explanations, unused images, or security/documentation gaps. This work creates a trustworthy foundation for everything that follows.

**Scope**

- Perform a security-oriented review of the GitHub repository and deployed-product configuration.
- Look for leaked or accidentally committed secrets, unsafe defaults, excessive permissions, exposed endpoints, and unclear trust boundaries.
- Inventory junk, dead assets, obsolete images, duplicate files, stale instructions, and documentation left over from old code.
- Identify documentation that is missing, inaccurate, contradictory, or no longer connected to the real product.
- Do not remove uncertain material automatically; classify it and confirm whether it is genuinely unused first.
- Review the current `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/architecture.md`, and `docs/code-index.md` as one documentation system.

**Documentation research before rewriting**

- Study respected guidance on writing documentation for mixed technical and non-technical audiences.
- Learn from strong documentation systems and information-architecture methods, including progressive disclosure and the separation of tutorials, how-to guides, explanations, and reference material.
- Research how excellent projects communicate security, privacy, data flow, secret management, operations, and limitations without overwhelming the first-time reader or disclosing exploit-enabling detail.
- Use high-quality books, expert essays, established documentation communities, and exemplary open-source products; record sources and the principles adopted from them.

**Target documentation structure**

- The first screen of the README should let a non-technical reader understand what CuriosityPedia is, who it is for, and how the experience works.
- The README should provide a clear path for different readers: users/evaluators, contributors, operators, and security reviewers.
- Difficult concepts should be explained in plain language first, with technical depth linked rather than forced into the opening narrative.
- Document, at an appropriate level:
  - where application and user data live;
  - where logs live, what they contain, and how long they are retained;
  - how API keys and other secrets are stored, transmitted, scoped, and rotated;
  - how authentication and authorization protect reads and writes;
  - the main external services and trust boundaries;
  - abuse prevention, quotas, and cost controls;
  - backup, deletion, incident, and operational procedures;
  - known limitations and security assumptions.
- Establish a clear index so readers know which information belongs in the README, security policy, architecture guide, contributor guide, operational documentation, and code index.

**Deliverables**

- Repository/security findings grouped by severity and confidence.
- A keep/update/archive/delete inventory for stale files and assets.
- A documentation gap analysis and proposed information architecture.
- A source-backed writing guide for this project.
- Revised documentation only after the audit and structure are approved.

**Done when**

- A non-technical reviewer can accurately describe the product after reading the README.
- A technical reviewer can locate architecture, security, data, API-key, logging, and operational details without guessing.
- Every removal is verified, and documentation claims match the deployed system.

### T01B — Assess and plan an incremental codebase refactor

**Status:** Assessment and plan completed July 18, 2026 in `docs/audits/t01b-structural-refactor-assessment.md`. Source-code changes remain behind the approval gate; Slice 1 is recommended for the first implementation phase.

**Why now:** T01 revealed that several source files are very large and may conceal mixed responsibilities, tight coupling, repeated logic, or difficult-to-test behavior. This can make later security, documentation, and feature work slower and less reliable. File length is a useful signal, but it is not proof of bad design; the assessment must identify the actual sources of complexity.

**Required reading**

- Read `docs/refactoring-playbook.md` in full before inspecting or changing source code.
- Treat that playbook as the project-specific operating policy. Its distilled guidance is more useful in the agent context than loading entire books into the prompt.
- Consult the cited books for background or disputed judgment, but do not mechanically apply any author's stylistic rules.
- Then read `README.md`, `docs/architecture.md`, `docs/code-index.md`, `SECURITY.md`, `package.json`, and the completed T01 findings before forming recommendations.

**Current hotspot candidates—not predetermined refactoring targets**

- `app/curiositypedia-experience.tsx` (approximately 3,090 lines).
- `lib/live-research.ts` (approximately 2,055 lines).
- `lib/repository.ts` (approximately 1,306 lines).
- `lib/live-repository.ts` (approximately 958 lines).
- Supporting contracts, database schema, fixtures, localization, API routes, and tests where coupling crosses those modules.

Generated files, localization catalogs, schemas, fixtures, and cohesive declarative data must be evaluated differently from stateful application logic. Do not split them merely to reduce a number.

**Phase A — Establish a trustworthy baseline (read-only except for the planning documents explicitly requested)**

- Record the working-tree state and preserve unrelated user changes.
- Run and record the existing build, test, type-check, lint, and architecture-check commands without fixing failures.
- Distinguish pre-existing failures from regressions that a future refactor could introduce.
- Map the product's principal runtime flows: page/UI state, research orchestration, model/provider access, persistence, authentication/session handling, quotas/usage, localization, and diagnostics.
- Map public contracts and boundaries that must remain stable: routes, request/response shapes, database behavior, stored data, rendered behavior, provider calls, usage accounting, and error semantics.

**Phase B — Produce a structural assessment**

For each candidate hotspot, document:

- its actual responsibilities and reasons to change;
- incoming and outgoing dependencies;
- state ownership and side effects;
- duplicated decisions or business rules;
- abstraction levels mixed in one function or module;
- security-, privacy-, quota-, and billing-sensitive behavior;
- existing tests and important unprotected behavior;
- change coupling: which files commonly need to change together;
- proposed seams or module boundaries;
- expected benefit, risk, confidence, and migration difficulty.

Classify findings by design problem—not simply “large file.” Useful categories include mixed responsibilities, hidden side effects, unstable dependencies, duplicated policy, unclear naming, weak boundaries, dead code, difficult testing, and unnecessary abstraction.

**Phase C — Design the target structure**

- Propose a responsibility and dependency map for the future structure.
- Prefer cohesive modules with explicit inputs, outputs, and ownership.
- Keep business policy separate from React rendering, transport/framework details, provider SDKs, persistence, and operational logging where the existing behavior permits.
- Preserve important public contracts unless a contract change is separately justified and approved.
- Avoid generic dumping grounds such as oversized `utils`, `helpers`, or `common` modules.
- Explain where duplication should temporarily remain because the correct shared abstraction is not yet known.

**Phase D — Create an ordered implementation plan**

Break the refactor into independently verifiable slices. Each slice must state:

- the precise behavior and files in scope;
- the behavior that must not change;
- characterization or unit tests needed before movement;
- the proposed extraction, rename, dependency inversion, or relocation;
- validation commands and relevant manual checks;
- rollback strategy;
- security/documentation findings that must be revalidated;
- completion evidence.

Start with a small, high-confidence seam that improves later work. Do not begin with the largest possible extraction or change UI behavior, database schemas, dependencies, product features, branding, or API contracts as an incidental part of refactoring.

**Required deliverables before implementation**

- Baseline verification report with pre-existing failures clearly identified.
- Dependency and responsibility map.
- Hotspot assessment table ranked by value, risk, and confidence.
- Proposed target module structure, including rejected alternatives and trade-offs.
- Behavior-preservation/test-gap matrix.
- Ordered sequence of small refactoring slices.
- Explicit list of decisions requiring approval.

**Approval gate**

Stop after delivering the assessment and plan. Do not edit, move, rename, or delete source files until the user approves the target structure and the first implementation slice.

**Implementation rules after approval**

- Work one slice at a time and keep the application runnable.
- Characterize behavior before changing structure.
- Separate refactoring from feature changes and dependency upgrades.
- Prefer automated, behavior-preserving transformations and small diffs.
- Run proportionate tests after every meaningful change and the full agreed validation suite before completing a slice.
- Update architecture and code-index documentation in the same slice when ownership or dependency direction changes.
- Recheck affected T01 security and documentation conclusions.
- Stop and request direction if behavior is ambiguous, tests reveal disagreement, or the safe change expands beyond the approved slice.

**Done when**

- The user has approved the target structure and all planned slices have been completed or consciously deferred.
- Major responsibilities have clear ownership and dependencies point in an understandable direction.
- Tests protect the behavior moved across boundaries.
- No product behavior, security control, quota/accounting behavior, stored data, or public contract changed unintentionally.
- Build, test, type-check, lint, and architecture checks meet the agreed baseline.
- Documentation matches the refactored system.
- Success is demonstrated through reduced cognitive/change coupling and safer modification—not merely lower line counts or more files.

### T02 — Audit model access, API-key use, quotas, and cost exposure

**Status:** Three bounded controls are implemented: centralized model/transport authorization, per-provider-call atomic cost reservation with conservative holds and actual-cost settlement, and renewable/fenced foreground leases with targeted takeover and stale-worker commit rejection. The approved behavior and implementation evidence are documented in [the T02 lease and takeover concurrency design](audits/t02-lease-takeover-concurrency-design.md). The remaining guest-cookie, cross-identity abuse, privacy, and operational questions have been verified and separated into approval groups in [the guest abuse and operational requirements assessment](audits/t02-guest-abuse-operational-assessment.md). Its approved discovery pass now records the available Sites/Cloudflare edge and logging evidence, OpenAI's soft project-budget alerts and billing reconciliation surface, the aggregates available from existing non-identifying records, and decision options for all six groups. Current production distributions were not measured because no authorized production D1 query surface was available, and the latest saved Sites version predates migrations `0010` and `0011`. No identity, privacy, retention, quota, admission, route, logging, or automated-shutoff policy from that assessment is implemented.

**Why now:** The live site apparently lets someone select a GPT-4-class model while using the product owner's API key. Existing dollar quotas may limit damage, but the intended policy and actual enforcement are not yet clear.

**Questions to resolve**

- Which models may guests, signed-in users, paid users, and bring-your-own-key users access?
- Are the current `$5` and other quotas enforced server-side, or are they only represented in the UI?
- Can a user bypass model restrictions, alter request parameters, automate requests, or consume another user's allowance?
- Should users be permitted to select premium models when spending an application-funded allowance?
- What rate limits, per-user limits, per-IP abuse controls, alerts, and emergency shutoffs are required?
- How should user-provided API keys be transmitted, stored (if at all), redacted from logs, revoked, and deleted?

**Deliverables**

- A short threat and cost-abuse model.
- A model-access matrix by user/account type.
- Verified server-side quota and authorization rules.
- Usage alerts and a documented emergency-disable procedure.

**Done when**

- Model choice and spending cannot be expanded through client-side manipulation.
- The owner can explain and cap worst-case cost exposure.
- The product clearly tells users whose quota or API key is being used.

### T03 — Define privacy, account deletion, and data-deletion requirements

**Why now:** These requirements affect logging, analytics, account design, and monetization. They should be decided before collecting more data or accepting payment.

**Scope**

- Define what data is collected for guests and signed-in users, why it is needed, and how long it is retained.
- Specify **Delete account** and **Delete my data** behavior, including searches, generated content, branches, logs, analytics identifiers, API keys, and backups.
- Decide what can be deleted immediately, what has a delayed backup lifecycle, and what must be retained for legitimate legal or financial reasons.
- Define export, consent, privacy notice, cookie/tracking, and user-support expectations where applicable.
- Avoid treating raw IP addresses as harmless analytics data; determine whether they are truly necessary and minimize or transform them when possible.

**Done when**

- There is an approved data inventory, retention schedule, deletion flow, and plain-language user explanation.

### T04 — Confirm the CuriosityPedia name and create the brand system

**Status:** CuriosityPedia approved as the final name July 18, 2026. Repository rename authorized; new domain registration deferred.

**Why now:** Renaming touches the README, UI copy, About page, sharing templates, metadata, domains, assets, and deployment. It should be settled before polishing those surfaces.

**Scope**

- Validate **CuriosityPedia** for fit, spelling, pronunciation, availability, confusion risk, and basic trademark/domain concerns before committing.
- Define a concise product description and voice.
- Use GPT Image in Codex to explore logo directions, then iterate before selecting one.
- Create a migration checklist for every occurrence of the previous product name: repository text, UI, metadata, assets, links, deployment settings, social previews, and documentation.
- Remove the unnecessary “Curiosity performed” subtext rather than carrying it into the new identity unless later testing gives it a clear purpose.

**Done when**

- The name decision is documented, a logo direction is selected, and the rename can be applied consistently without leaving mixed branding.

---

## P1 — Repair the core experience

### T05 — Make the search loading screen match the result layout

**Size:** Small, focused task.

**Problem:** The loading page does not resemble the screen that appears when loading finishes, so it does not set useful expectations or communicate progress well.

**Desired outcome**

- Create a skeleton state whose boxes, image frames, headings, and text lines closely match the final result layout.
- Preserve layout stability so content does not jump dramatically when it arrives.
- Make loading unmistakably active and accessible, including reduced-motion behavior where appropriate.
- Handle slow, failed, empty, and partially loaded states—not only the ideal fast response.

**Done when**

- The transition from loading to content feels continuous, the user knows work is happening, and failures provide a useful next action.

### T06 — Fix landing-page visual and copy issues

**Size:** Small cleanup bundle; keep it separate from the question-tree redesign.

**Tasks**

- Fix quote stickers whose dotted border extends outside the colored shape; the border should remain correctly inside/follow the intended boundary.
- Remove unnecessary tiny helper/caption text, including the current “Curiosity performed” line under the product name.
- Audit other small text for readability and purpose. If text is important, make it legible; if it is not useful, remove it.
- Check the landing page at common mobile and desktop sizes after the fixes.

**Done when**

- Sticker borders render correctly across breakpoints and the page contains no tiny, low-value copy.

### T07 — Redesign question autocomplete as inline completion

**Problem:** Similar-question suggestions currently appear as tiny text below the input and are easy to miss.

**Desired behavior**

- Show a likely completion inside the question field as visible inline/ghost text that finishes the user's sentence.
- Provide clear keyboard and touch interactions to accept, ignore, or move among suggestions.
- Do not silently replace what the user typed.
- Ensure the interaction remains understandable to screen readers and works without relying on low-contrast text.

**Questions to test**

- Should one best completion appear inline, with additional suggestions available only on demand?
- Which keys accept or dismiss a suggestion?
- What happens when the user edits the middle of a question or types on mobile?

**Done when**

- Users notice and can accept relevant completions without reading tiny text or losing control of their input.

### T08 — Rethink the question experience as a navigable exploration tree

**Size:** Major product/design project. Do not reduce this to adding a Back button.

**Vision**

- Keep the core information presentation broadly familiar.
- Present follow-up questions as visually compelling paths rather than ordinary buttons.
- When a path is chosen, use polished motion to move the current node upward, emphasize the new question, and introduce a skeleton while its answer loads.
- Let users scroll upward through previously visited questions and answers, making ancestry feel like moving up a tree.
- Support more than two child questions from any node and multiple explored branches.
- When moving downward from a node with several explored children, help the user choose the intended branch rather than assuming one.
- Clearly mark the current branch and any branch with an answer still loading so a user who scrolls far away can find active work again.

**Design questions that must be answered**

- What is the difference between suggested paths, previously visited paths, the current path, and loading paths?
- How does a user return to the active node after exploring far up the tree?
- How are 3, 5, 15, or more children displayed without overwhelming the page?
- Does scrolling alone navigate, or does scrolling reveal nodes while explicit selection changes branches?
- What happens to scroll position when switching branches?
- Can multiple branches load at once? If so, how are status, cancellation, and failures shown?
- How is the full tree discoverable on small mobile screens?
- How do keyboard, screen-reader, reduced-motion, and low-powered-device experiences work?
- How is deep-linking or returning to an earlier session handled?

**Recommended process**

1. Map the tree states and navigation rules before styling.
2. Create several concept directions with GPT Image in Codex, emphasizing motion keyframes and mobile behavior.
3. Compare concepts using realistic trees with many branches, long answers, loading nodes, and failures.
4. Turn the strongest direction into a low-cost interactive prototype.
5. Test comprehension: users should always know where they are, how they arrived, what is loading, and how to move elsewhere.
6. Define motion, accessibility, and responsive behavior before production implementation.

**Done when**

- The design handles branching, history, loading, recovery, accessibility, mobile layout, and large trees—not only a two-option happy path.
- Representative users can navigate up and down without getting lost.

---

## P2 — Expand and explain

### T09 — Offer real art and cultural imagery alongside AI-generated art

**Goal:** People who dislike AI-generated imagery should still receive beautiful, thought-provoking visuals.

**Scope**

- Explore reputable, rights-compatible sources for museum art, paintings, architecture, and other real-world cultural imagery.
- Confirm license, attribution, geography, content-moderation, rate-limit, caching, and availability requirements for each source.
- Preserve the rotating-gallery experience while clearly distinguishing image sources.
- Provide a simple preference such as **Allow AI-generated art**, with an understandable default and an easy way to change it.
- Consider preferences beyond a binary toggle: AI only, real-world art only, or a mix.
- Ensure captions, creator/title, source, and attribution are available when required and useful.

**Done when**

- A user can choose a non-AI experience, every displayed work has an understood usage right, and attribution is correct.

### T10 — Create shareable visual cards for individual questions

**Goal:** Each question/answer should be shareable as an attractive, mobile-first image suitable for Instagram, Reddit, YouTube community posts, and similar channels.

**Discovery and design**

- Use GPT Image in Codex to explore multiple visual-card concepts before implementation.
- Decide what appears on a card: question, concise insight, image/art, source or caveat, CuriosityPedia branding, and link/QR code where useful.
- Design platform-aware aspect ratios rather than one compromised universal image.
- Let users preview and intentionally download/copy/share the generated asset.
- Protect against text overflow, misleading truncation, private-content leakage, unsafe filenames, and unlicensed image reuse.
- Clarify whether the card contains a user-authored question, an AI-generated answer, or both.

**Done when**

- Cards remain legible and attractive with realistic short and long content, and sharing does not expose private data or violate image rights.

### T11 — Add an About page

**Goal:** Explain what CuriosityPedia is, why it exists, who it serves, and how to use it.

**Suggested content**

- The problem and product idea.
- Who it is for—and what it is not intended to replace.
- How branching exploration works.
- How answers and images are produced.
- Important limitations, privacy/security principles, and responsible-use notes.
- A link to deeper technical/security documentation rather than duplicating it all.

**Dependencies:** T01 documentation architecture and T04 branding.

### T12 — Design a privacy-aware product and operations dashboard

**Goal:** Understand product usage, reliability, abuse, and cost without collecting data merely because it is available.

**Candidate measures**

- Signed-up users and active users.
- Guest usage.
- Searches and exploration depth.
- Model usage, latency, errors, and estimated cost.
- Feature adoption and branch behavior.
- Quota exhaustion and suspicious usage patterns.

**Important constraint**

Raw unique IP addresses should not become a casual user metric. First define the question being answered, then choose the least identifying measurement that can answer it. Separate operational security signals from product analytics and apply access and retention limits.

**Done when**

- Each metric has a decision it supports, a defined source and retention period, appropriate access control, and no unnecessary personal data.

---

## P3 — Monetize responsibly

### T13 — Choose a sustainable API and payment model

**Concepts to evaluate**

- Bring your own API key.
- Application-funded usage included in a subscription or credit bundle.
- Cost pass-through plus a transparent service margin (possible examples mentioned: 1%, 2%, 5%, or 10%; no percentage is decided).
- A hybrid free allowance plus paid usage.

**Questions to answer before building**

- Who is the merchant of record and who pays model-provider charges?
- Are provider terms compatible with key handling, resale, pass-through pricing, and selected models?
- How are variable cost, refunds, failed generations, taxes, chargebacks, regional availability, and price changes handled?
- Is a small percentage margin viable after payment fees, support, fraud, infrastructure, and taxes?
- How will users see usage, price, remaining allowance, and spending caps before a request is made?
- What happens when a user's own key fails, expires, or exceeds its provider quota?
- Can keys remain session-only or be held by the user rather than stored by the application?

**Deliverables**

- Unit-economics scenarios using real cost assumptions.
- A written decision comparing the models and their risks.
- A billing/user journey including receipts, limits, cancellation, refunds, and support.
- A security design for any user-provided API key.

**Dependencies:** T02 cost controls, T03 data/privacy requirements, and initial usage evidence from T12.

### T14 — Complete paid-product readiness review

**Goal:** Before taking money, identify the operational, legal, security, and user-trust responsibilities that become real when CuriosityPedia is a paid service.

**Review areas**

- Terms, privacy notice, acceptable use, AI/content disclosures, and age/eligibility decisions.
- Account deletion, data deletion/export, cancellation, refunds, invoices/receipts, and payment failure recovery.
- Customer support, incident response, status communication, backups, restoration, and service ownership.
- Accessibility, abuse reporting, content moderation, copyright/attribution, and complaint handling.
- Payment-provider security boundaries; avoid handling raw card details directly.
- Monitoring for availability, cost, fraud, and quota failures.

**Done when**

- A launch checklist has named owners, verified flows, and no unresolved blocker involving money, user data, account access, or support.

---

## Cross-cutting product principles

- **Comprehension before cleverness:** An enigmatic visual style is welcome, but users must still understand where they are and what will happen next.
- **Progressive disclosure:** Give newcomers a plain-language overview and offer deeper technical detail through clear links.
- **Server-side trust:** Cost, access, and data protections must not depend on hidden buttons or client-side checks.
- **Privacy by minimization:** Collect and retain only what supports a defined product, security, or legal need.
- **Accessible motion:** Animation should clarify spatial relationships, respect reduced-motion settings, and never become the only way information is communicated.
- **Realistic-state design:** Validate empty, slow, error, long-content, many-branch, mobile, and returning-user states—not only polished happy paths.
- **Rights-aware imagery:** Know the source, license, attribution, and sharing permission for every non-original image.
- **Evidence before monetization:** Use measured costs and behavior to choose pricing; do not choose a margin by intuition alone.

## Suggested next work session

T01 is complete. Ask the agent to carry out **only the assessment and planning phases of T01B**. A useful prompt is:

> Read `docs/post-reset-product-roadmap.md`, then read `docs/refactoring-playbook.md` in full and follow it as the operating policy. Carry out only T01B Phases A–D: establish the current verification baseline, map responsibilities and dependencies, assess structural hotspots, propose a target structure, and produce an ordered set of small behavior-preserving refactoring slices. Treat large files as candidates rather than automatic failures. Do not edit, move, rename, delete, or reformat source files. Stop after the assessment and plan so I can approve the target structure and first slice.

After the plan is approved, implement one T01B slice at a time. Revalidate affected T01 findings during each slice. Run T02 as a separate security/cost-control task after the structural work that directly affects its boundaries, rather than mixing security policy changes into a refactor.

## Decisions still open

- Which user types may select which models.
- Whether application-funded access to premium models remains allowed.
- Whether user API keys are supported and, if so, whether they are ever stored.
- The preferred question-tree navigation model.
- Whether art preferences are binary or offer AI/real/mixed modes.
- Which analytics are necessary and privacy-appropriate.
- The pricing model and service margin, if any.
- The exact account/data deletion and retention policy.
