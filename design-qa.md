# Answer + evidence viewer design QA

## Comparison target

- Source visual truth: `/Users/jignasupathak/Documents/Codex/hackathon-brainstorming/WonderDrive/design/wonderdrive-answer-evidence-no-scroll.png`
- Browser implementation: `/Users/jignasupathak/Documents/Codex/hackathon-brainstorming/WonderDrive/artifacts/answer-surface-audit/06-final-evidence-viewer.png`
- Full-view comparison: `/Users/jignasupathak/Documents/Codex/hackathon-brainstorming/WonderDrive/artifacts/answer-surface-audit/07-final-design-comparison.png`
- Focused answer comparison: `/Users/jignasupathak/Documents/Codex/hackathon-brainstorming/WonderDrive/artifacts/answer-surface-audit/08-final-focused-comparison.png`
- Viewport: 1600 × 900
- State: one researched turn with five sourced images; first image selected; next-direction choices visible

## Full-view comparison evidence

The implementation preserves the approved structure: the written answer remains in the primary card, Deep Dive sits immediately below that answer, one selected image receives the largest visual area, its explanation lives beside it, all images remain available in a horizontal selector, and the two direction choices remain visible without document scrolling.

The reference board uses public-space example content while the verified journey uses live city-memory data. The content difference is expected; hierarchy, density, placement, and interaction model are the comparison targets.

## Focused-region evidence

The focused comparison confirms that the answer, evidence viewer, annotation panel, thumbnail rail, and direction cards share the same visual hierarchy as the selected concept. The implementation uses a slightly wider evidence allocation to keep the real image notes readable. No content overlaps, clips, or crosses component borders.

## Required fidelity surfaces

- Typography: existing WonderDrive display and body families remain intact. The answer heading, evidence title, notes headings, and direction questions retain a clear hierarchy.
- Layout: the answer and evidence viewer form one contained surface. Deep Dive is directly beneath the written answer rather than below the entire card.
- Image behavior: the selected image uses `object-fit: contain`; thumbnails never stretch, remain horizontally scrollable, and expose visible selected and focus states.
- Image information: each item can carry a title, evidence role, why it was included, what to notice, and what it helps explain. Missing generated metadata falls back to concise usable copy.
- Accessibility: the selector is keyboard navigable with Left/Right/Home/End; selected state uses `aria-pressed`; source links remain available; the Deep Dive dialog closes with Escape and restores focus.
- Direction visibility: both next-direction cards and their secondary actions are fully visible in the verified 1600 × 900 viewport without page scrolling.

## Findings

No actionable P0, P1, or P2 issues remain.

- [P3] The verified local image set contains several visually similar historical-map crops. This is a data-quality issue rather than a layout issue; the new metadata contract enables the research step to provide more distinct, purposeful evidence.
- Accepted difference: the implementation shows one coherent answer block in the overview and keeps the complete answer in Deep Dive so the primary direction choice stays above the fold.

## Comparison history

### Iteration 1

- [P1] Allowing an arbitrary prose-height clamp could cut the written answer mid-sentence.
- Fix: render one complete answer block in the overview and preserve the full response in Deep Dive.

### Iteration 2

- [P2] Expanding the overview prose moved the direction selector below the initial viewport.
- Fix: restored the compact answer overview, tightened the evidence viewer, and kept Deep Dive directly below the answer.
- Post-fix evidence: `06-final-evidence-viewer.png`, `07-final-design-comparison.png`, and `08-final-focused-comparison.png`.

## Interaction and browser verification

- Clicking thumbnails changes the selected image and its accompanying notes.
- ArrowRight changes selection; Left/Right/Home/End keyboard behavior is implemented.
- Deep Dive opens the complete answer dialog; Escape closes it and focus returns to the trigger.
- The source link remains available for the selected image.
- Browser console errors and warnings checked: none.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 20 tests.
- `node --experimental-loader ./tests/cloudflare-loader.mjs --import tsx --test tests/live-research.test.mjs`: passed, 15 tests.

final result: passed
