# WonderDrive mobile tree V2

Date: 2026-07-15

## What was wrong with the first mobile concept

The first mobile graph kept the desktop's left-to-right direction inside a narrow viewport. The selected node was already touching the right edge in the concept image. Every additional level would move descendants farther right, making horizontal panning a permanent requirement.

The view also spent too much height on a bottom sheet while showing too little of the actual hierarchy. The minimap reported that content existed elsewhere but did not solve the main navigation problem.

Overall health: **poor for journeys deeper than two or three visible levels**.

## Expert patterns used in V2

### Rotate the tree for the screen

Mobile depth should run top-to-bottom. D3's tree implementation uses the Reingold–Tilford tidy-tree algorithm and describes tidy trees as more compact than dendrograms. Its arbitrary coordinate system allows the same hierarchy to change orientation without changing its structure.

Source: [D3 tree](https://d3js.org/d3-hierarchy/tree)

### Display a clear subset, not illegible totality

Research on mobile hierarchy navigation found that displaying a screen-sized subset of a tree with direct touch navigation reduced exploration time and touches compared with a list interface. This supports keeping the graph, but folding distant subtrees into countable branch nodes.

Source: [A mobile interface for navigating hierarchical information space](https://doi.org/10.1016/j.jvlc.2015.10.002)

### Preserve awareness of hidden branches

Off-screen visualization research shows that spatial cues help users understand where unseen objects exist. V2 uses labeled edge badges such as `3 branches above` and `2 branches below`, rather than leaving users to infer hidden content from a tiny minimap.

Source: [Halo: A Technique for Visualizing Off-Screen Locations](https://www.patrickbaudisch.com/publications/2003-Baudisch-CHI03-Halo.pdf)

### Design touch targets as controls, not decorative nodes

W3C's target-size guidance requires pointer targets to be at least 24 × 24 CSS pixels or sufficiently separated, and recommends larger targets for important controls. Mobile nodes use full-card targets and separated expand/focus actions.

Source: [W3C Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

## Iterations

### Attempt 1 — rotate the complete desktop graph

Depth now fits vertical scrolling, but breadth still explodes when several turns at the same depth each have two children. Fitting all nodes makes labels unreadably small.

### Attempt 2 — show only the active path

The view becomes readable, but it stops behaving like a tree because alternative branches disappear.

### Attempt 3 — active path plus compact branch piles

This keeps the hierarchy honest. Every hidden subtree remains attached to its real parent as a countable, expandable branch node. However, selecting a distant branch can still make the entire layout jump.

### Attempt 4 — focus and re-root within stable depth bands

The selected branch moves to the center only after an explicit Focus action. Its ancestors become a breadcrumb and one compact parent node; immediate children expand below. The user always knows that the view changed and can return using `Back to full tree`.

## Final mobile contract

- Default orientation is top-to-bottom.
- Default navigation uses vertical scrolling only; there is no required horizontal pan.
- The active ancestry occupies the visual center.
- Distant subtrees become branch piles attached to the correct parent, with researched/open counts.
- Tapping a pile expands it in place when space permits.
- `Focus branch` re-roots deliberately and preserves an ancestor breadcrumb.
- Semantic zoom changes node detail, not hierarchy.
- Selected-turn details use a partial bottom sheet while parent and children remain visible above it.
- New-branch confirmation previews a ghost child inside the tree before research begins.
- Off-screen branch badges indicate hidden content and provide direct return actions.

