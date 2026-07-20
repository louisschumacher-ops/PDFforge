import type { ParsedModel } from "../parser/index.js";
import type { GridPosition, LayoutResult } from "../layout/index.js";
import type { VirtualGrid } from "../grid/index.js";

export interface PageLayout {
  pageIndex: number;
  /** 1-based, inclusive row range from the virtual (unpaginated) grid. */
  rowStart: number;
  rowEnd: number;
}

export interface CrossPageContinuation {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  fromPage: number;
  toPage: number;
}

export interface PaginatedLayout {
  pages: PageLayout[];
  nodePage: Map<string, number>;
  continuations: CrossPageContinuation[];
}

/**
 * Cuts the already-computed virtual layout into physical pages by slicing
 * between grid rows only — a node occupies exactly one row, so it can never
 * be split. Row capacity per page comes from how many cells actually fit in
 * the page's usable area. A group's row range is kept on one page whenever
 * shifting the whole group to the next page is possible without leaving the
 * current page empty; a group taller than a single page's capacity is left to
 * spill across pages, since that's unavoidable without splitting a node.
 */
export function paginate(
  model: ParsedModel,
  layout: LayoutResult,
  grid: VirtualGrid,
): PaginatedLayout {
  const maxRowsPerPage = Math.max(1, Math.floor(grid.usable.height / grid.cellHeight));
  const groupRanges = model.groups
    .map((group) => rowRangeOf(group.nodeIds, layout.positions))
    .filter((range): range is { min: number; max: number } => range !== undefined);

  const pages: PageLayout[] = [];
  let rowStart = 1;
  let pageIndex = 0;

  while (rowStart <= layout.rows) {
    let rowEnd = Math.min(rowStart + maxRowsPerPage - 1, layout.rows);

    let shrunk = true;
    while (shrunk) {
      shrunk = false;
      for (const range of groupRanges) {
        const startsOnThisPage = range.min > rowStart && range.min <= rowEnd;
        const overflowsPage = range.max > rowEnd;
        if (startsOnThisPage && overflowsPage) {
          rowEnd = range.min - 1;
          shrunk = true;
        }
      }
    }

    pages.push({ pageIndex, rowStart, rowEnd });
    rowStart = rowEnd + 1;
    pageIndex++;
  }

  const nodePage = new Map<string, number>();
  for (const [nodeId, position] of layout.positions) {
    const page = pages.find((p) => position.row >= p.rowStart && position.row <= p.rowEnd);
    if (page) nodePage.set(nodeId, page.pageIndex);
  }

  const continuations: CrossPageContinuation[] = [];
  for (const edge of model.edges) {
    const fromPage = nodePage.get(edge.source);
    const toPage = nodePage.get(edge.target);
    if (fromPage === undefined || toPage === undefined || fromPage === toPage) continue;
    continuations.push({
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      fromPage,
      toPage,
    });
  }

  return { pages, nodePage, continuations };
}

function rowRangeOf(
  nodeIds: string[],
  positions: Map<string, GridPosition>,
): { min: number; max: number } | undefined {
  const rows = nodeIds
    .map((id) => positions.get(id)?.row)
    .filter((row): row is number => row !== undefined);
  if (rows.length === 0) return undefined;
  return { min: Math.min(...rows), max: Math.max(...rows) };
}
