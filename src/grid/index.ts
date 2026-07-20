import type { GridPosition, LayoutResult } from "../layout/index.js";
import {
  resolveGridDensity,
  resolveNodeFillFactor,
  resolvePageSize,
  scaled,
  type Margins,
  type NodeFillFactor,
  type PageSize,
  type RenderConfig,
} from "../config/index.js";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VirtualGrid {
  cellWidth: number;
  cellHeight: number;
  /** Total rows/columns of the full, unpaginated layout (content extent, not page capacity). */
  rows: number;
  columns: number;
  /** Configured columns/rows per page (`GridDensity`) — always drawn in full, regardless of content extent. */
  pageColumns: number;
  pageRows: number;
  pageSize: PageSize;
  margins: Margins;
  /** Drawable area within the page margins, before any per-page pagination cut. */
  usable: Rect;
  /** 1-based row/col -> absolute rect within the virtual (unpaginated) grid. */
  cellRect(row: number, col: number): Rect;
  /**
   * 1-based row/col -> the node's actual visual boundary, centered within the
   * cell and scaled to `nodeFillFactor` of the cell's own size. This is the
   * single source of truth both node rendering and edge routing must anchor
   * to, so connections always end exactly on the node border regardless of
   * scale or density.
   */
  nodeRect(row: number, col: number): Rect;
  /** Fraction of a cell's width/height the node box fills; 1 = exactly the cell, per axis. */
  nodeFillFactor: NodeFillFactor;
}

/** Converts a 1-based column index into spreadsheet-style letters: 1 -> A, 26 -> Z, 27 -> AA. */
export function columnLabel(col: number): string {
  let n = col;
  let label = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

/**
 * Bounding rect around a group's member node boxes, expanded outward by
 * `padding` — the gap between the group frame and the nearest member node
 * border. Purely a visual frame: it never changes node positions or the
 * spacing between them, it just draws around whichever node boxes the members
 * already occupy. Members not present in `positions` are ignored; returns
 * undefined for an empty/unresolvable group.
 */
export function groupRect(
  nodeIds: string[],
  positions: Map<string, GridPosition>,
  grid: VirtualGrid,
  padding: number,
): Rect | undefined {
  const cells = nodeIds
    .map((id) => positions.get(id))
    .filter((position): position is GridPosition => position !== undefined);
  if (cells.length === 0) return undefined;

  const minRow = Math.min(...cells.map((cell) => cell.row));
  const maxRow = Math.max(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  const maxCol = Math.max(...cells.map((cell) => cell.col));

  const topLeft = grid.nodeRect(minRow, minCol);
  const bottomRight = grid.nodeRect(maxRow, maxCol);

  return {
    x: topLeft.x - padding,
    y: topLeft.y - padding,
    width: bottomRight.x + bottomRight.width - topLeft.x + padding * 2,
    height: bottomRight.y + bottomRight.height - topLeft.y + padding * 2,
  };
}

/**
 * Builds the virtual grid that every subsequent step (routing, pagination, render)
 * measures against. Cell size is derived from the usable page area divided by
 * the configured `GridDensity` (columns/rows), then scaled by `config.scale` —
 * so at scale 1 exactly the configured number of columns/rows fill one page.
 * Margins are fixed physical values that only change the usable area, never
 * the column/row count itself.
 */
export function buildGrid(layout: LayoutResult, config: RenderConfig): VirtualGrid {
  const pageSize = resolvePageSize(config.paper, config.orientation);
  const { margins } = config;

  const usable: Rect = {
    x: margins.left,
    y: margins.top,
    width: pageSize.widthPt - margins.left - margins.right,
    height: pageSize.heightPt - margins.top - margins.bottom,
  };

  const density = resolveGridDensity(config);
  const cellWidth = scaled(usable.width / density.columns, config.scale);
  const cellHeight = scaled(usable.height / density.rows, config.scale);
  const nodeFillFactor = resolveNodeFillFactor(config);

  const cellRect = (row: number, col: number): Rect => ({
    x: usable.x + (col - 1) * cellWidth,
    y: usable.y + (row - 1) * cellHeight,
    width: cellWidth,
    height: cellHeight,
  });

  return {
    cellWidth,
    cellHeight,
    nodeFillFactor,
    rows: layout.rows,
    columns: layout.cols,
    pageColumns: density.columns,
    pageRows: density.rows,
    pageSize,
    margins,
    usable,
    cellRect,
    nodeRect(row: number, col: number): Rect {
      const cell = cellRect(row, col);
      const width = cell.width * nodeFillFactor.width;
      const height = cell.height * nodeFillFactor.height;
      return {
        x: cell.x + (cell.width - width) / 2,
        y: cell.y + (cell.height - height) / 2,
        width,
        height,
      };
    },
  };
}
