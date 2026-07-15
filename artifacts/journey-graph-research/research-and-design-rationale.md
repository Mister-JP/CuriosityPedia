# WonderDrive journey graph: research and design rationale

Date: 2026-07-15

## Product task

The graph must help a visitor answer five questions without leaving the canvas:

1. Where am I?
2. How did I get here?
3. What else has already been explored?
4. Which questions are still open, and which turn created each one?
5. What will change if I revisit an earlier turn and start a new branch?

The graph is not a decorative overview. It is the primary navigation model for a saved WonderDrive journey.

## Evidence from the current experience

- `01-current-stage.png`: the complete answer and the two next directions live in Stage.
- `02-current-map.png`: the map lives behind a separate view switcher and presents the active path plus a separate direction section.

The split forces users to remember which view owns the answer, which owns the graph, and where a path action will take them. A one-turn journey looks clean, but the current horizontal list model does not yet expose the full parent/child tree or show how dense branching will be managed.

## External research translated into design decisions

### Overview, focus, then detail

Ben Shneiderman's visual information-seeking model begins with an overview, then zoom/filter, then details on demand. The final design therefore opens on the full tree, supports search and focus modes, and shows an answer inspector only after node selection.

Source: [The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations](https://doi.org/10.1109/VL.1996.545307)

### Use a directed layered layout

WonderDrive is a rooted, directed, mostly tree-shaped graph. ELK's layered algorithm places nodes in successive layers, directs most edges consistently, and explicitly minimizes edge crossings. The recommended layout is left-to-right on desktop, with orthogonal routing and stable ports.

Source: [Eclipse Layout Kernel — Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)

### Give large graphs navigation instruments

React Flow's official guidance treats minimaps, fit-view/zoom controls, backgrounds, and fixed panels as built-in orientation tools for larger flows. The proposed graph includes a minimap, Fit all, zoom controls, and a fixed graph toolbar rather than relying on pan/zoom gestures alone.

Source: [React Flow built-in components](https://reactflow.dev/learn/concepts/built-in-components)

### Reduce crossings and separate meaningful groups

Graph-perception research reports that edge crossings and drawing conventions affect task performance and preference. It also finds that proximity implies grouping and top/central placement implies importance. The design uses one reading direction, orthogonal edges, named branch clusters, and a visually dominant active route. It avoids a force-directed layout, which would imply relationships through arbitrary proximity.

Source: [Effects of Sociogram Drawing Conventions and Edge Crossings in Social Network Visualization](https://doi.org/10.7155/jgaa.00152)

### Provide equivalent non-spatial navigation

W3C's tree-view pattern defines expand/collapse and arrow-key behavior for hierarchical navigation, while its complex-image guidance recommends equivalent structured descriptions for diagrams. The final concept pairs the canvas with an Outline view that exposes the same hierarchy, selection, open states, and actions.

Sources: [WAI-ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/), [WAI Complex Images](https://www.w3.org/WAI/tutorials/images/complex/)

## Iterative user walkthroughs

### Pass 1 — Show every node as a full card

What works: the product model is honest and branches are visible.

Where a user gets stuck: after roughly 20–30 turns, labels collide, edge crossings multiply, and the graph becomes a wall of equal-weight cards.

Change: introduce semantic zoom. At low zoom, researched turns become compact markers and distant subtrees become named clusters with turn/open counts. The active route remains full fidelity.

### Pass 2 — Add pan, zoom, and collapse

What works: the canvas scales and branches can be hidden.

Where a user gets stuck: a collapsed graph can hide the very open question they are looking for, and panning can destroy orientation.

Change: add search, an Open paths filter, highlighted routes to matches, off-screen result markers, Fit all, and a minimap with a visible viewport rectangle.

### Pass 3 — Expand a selected node in place

What works: details remain close to the node.

Where a user gets stuck: expanding a large node forces the layout to reflow, moving familiar nodes and breaking spatial orientation.

Change: keep every node's position and size stable. Selection highlights ancestry and immediate children, while a dismissible inspector overlays the canvas without resizing it.

### Pass 4 — Let users branch from any earlier turn

What works: the tree is truly revisitable.

Where a user gets stuck: clicking an old open path can feel destructive. It is unclear whether the current route will disappear, where the new turn will land, or whether live research begins immediately.

Change: show a ghost node and confirmation panel before research starts. State explicitly that the current route remains intact, identify the parent turn, preview the new branch location, and disclose that one live research turn will run.

### Pass 5 — Shrink the graph for mobile

What works: a smaller canvas still preserves the spatial model.

Where a user gets stuck: a desktop-scale tree on a phone becomes a pan-and-zoom puzzle, while a flat card list loses the graph.

Change: mobile defaults to a focused neighborhood: selected node, parent, immediate children, breadcrumb path, minimap, and bottom-sheet detail. A first-class Outline view provides complete hierarchical navigation with keyboard/screen-reader semantics.

## Final interaction contract

- The default desktop view is the whole directed tree.
- The active ancestry is the strongest path; open questions are smaller dashed leaves.
- Selecting a node never changes graph coordinates.
- At low zoom, distant subtrees become named, countable clusters.
- Search and filters preserve the graph and highlight routes; they do not replace it with a results-only page.
- Branching begins with a structural preview and explicit confirmation.
- Mobile shows a focused neighborhood plus breadcrumbs and a minimap.
- Outline view is functionally equivalent to the canvas for selection, expansion, and branch actions.

