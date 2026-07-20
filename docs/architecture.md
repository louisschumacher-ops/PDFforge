# Architecture

PDFforge turns a NodeEditor JSON export into a paginated PDF through seven independent
modules under `src/`, each with its own tests. Every stage only consumes the output of
the previous one — no module reaches back into JSON or PDFKit internals it doesn't own.

```
RawJSON
  -> parser      ParsedModel { nodes, edges, groups }
  -> graph       LogicalGraph { rootId, children, depth }
  -> layout      LayoutResult { positions: nodeId -> {row, col} }
  -> grid        VirtualGrid  (cell/node/group rects for a given scale + paper + density)
  -> routing     RoutedEdge[] (orthogonal elbow paths, per page)
  -> pagination  PaginatedLayout { pages, nodePage, continuations }
  -> render      PDF bytes (PDFKit)
```

## parser (`src/parser`)

Reads `nodes`, `edges`, `groups` from the raw JSON. Editor position fields (`x`, `y`,
`position`) are never read into the domain model — layout is recomputed from scratch,
never from editor coordinates. Each edge resolves a `style` (`color`/`width`/`dashed`)
either from the JSON (`edge.style`) or from `DEFAULT_EDGE_STYLE`, so every downstream
consumer always has a concrete style, never an optional one to null-check.

## graph (`src/graph`)

Builds an adjacency map from `edges` and computes each node's depth via BFS from the
root (`n1` by default, configurable). Throws `MissingRootError` if the root is absent
and `GraphCycleError` if a cycle is reachable from the root (detected via DFS with an
explicit recursion stack). Nodes unreachable from the root are reported, not silently
dropped.

## layout (`src/layout`)

Assigns every reachable node exactly one `{row, col}`. Row is `depth + 1` (root is
always row 1). Column order comes from a post-order traversal: leaves get sequential
column keys, each parent's key is the average of its children's keys (keeps a parent
roughly centered over its children), then columns are compacted to `1..n` per row.
Only relative left-right order matters — nodes don't need literal centered pixel
alignment since each owns exactly one grid cell.

## grid (`src/grid`)

Converts row/col numbers into absolute rectangles. This is where all the scaling
concepts live (see `src/config`):

- **Grid density** (`GridDensity`, default per paper format in `DEFAULT_GRID_DENSITY`,
  e.g. A4 = 5 columns x 8 rows) is the primary sizing lever: `cellWidth = usable.width /
density.columns`, `cellHeight = usable.height / density.rows`, both then scaled by
  `config.scale`. Margins only change the usable area, never the column/row count —
  widening a margin shrinks the grid, it never reduces how many columns/rows fit.
- **`nodeInset`** / **`nodeFillFactor`**: a node's actual visible box is
  `cellRect` shrunk to `nodeFillFactor.width`/`height` of the cell, centered. Both node
  rendering and edge routing read `grid.nodeRect(row, col)` — the single source of
  truth for where a node's border actually is, so connectors always end exactly on it
  regardless of scale or density.
- **`groupRect`**: bounding box around a group's member node boxes (not their cells),
  expanded outward by `REFERENCE_GROUP_PADDING`. Purely a drawing frame — it never
  moves nodes or changes spacing.
- **`pageColumns`/`pageRows`**: the configured density, exposed separately from the
  layout's actual content extent (`rows`/`columns`), so the background orientation grid
  always draws the full configured page size regardless of how much content a given
  page actually uses.

## routing (`src/routing`)

Computes an orthogonal ("elbow") connector for each edge: straight down from the source
node's bottom border, across at the midpoint of the row gap, straight down into the
target's top border. A child directly below its parent degrades naturally to a single
vertical segment. No diagonals, no curves, no arrowheads (removed per product decision).

## pagination (`src/pagination`)

Runs after the full virtual layout is known. Slices it into physical pages by cutting
between rows only — a node occupies exactly one row, so it can never be split. Page
capacity comes from `grid.pageRows`. If a group's row range would straddle a page
boundary, the boundary shifts earlier so the whole group moves to the next page instead
(best-effort: a group taller than one page's capacity still spills, since a node can
never be split to avoid it). Produces `nodePage` (node -> page index) and
`continuations` (one entry per edge whose endpoints land on different pages).

**Horizontal pagination** (splitting a row with more siblings than fit in one page's
column count) is specified in `docs/user-story.md` but not implemented yet — a row
wider than the configured density currently just renders past the page's printable
width.

## render (`src/render`)

Draws each page with PDFKit: background orientation grid (always the full configured
density, with absolute row numbers — each page also independently starts its own local
numbering, see the comment in `renderDevPdf`), group frames (semi-transparent, so the
grid shows through), edges, then node boxes. Node labels are hard-capped to the box's
available height with ellipsis, so an unusually long label can never visually overflow
its border.

Multi-page output uses PDFKit's `bufferPages: true` + `switchToPage()`: every page is
reserved up front (`doc.addPage()` in a loop), then filled in a second pass, so a
forward link (page 1 -> page 5) can target a page that already exists in the document
— `doc.link(x, y, w, h, pageIndex)` requires the target page to exist at call time.

Cross-page edges render as a real connector line (in the edge's own color/width/dashed
style) running from the node border straight to the grid's edge, labelled with the
exact `page.cell` address the link jumps to (e.g. `2.A9`) — plain black text, no
decorative box, and the label itself is the clickable link (`Border: [0,0,0]` to
suppress any viewer-drawn outline).

## Determinism

Every stage is a pure function of its input — no randomness, no wall-clock reads, no
Map/Set iteration order dependent on anything but insertion order (which itself is
deterministic since it follows `edges` array order from the parsed JSON). Same JSON in
means same PDF layout out.
