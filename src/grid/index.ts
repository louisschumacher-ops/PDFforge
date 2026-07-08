import type { GridPosition, LayoutResult } from "../layout/index.js";
import {
  REFERENCE_CELL_SIZE,
  REFERENCE_NODE_INSET,
  resolvePageSize,
  scaled,
  type Margins,
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
  /** Total rows/columns of the full, unpaginated layout. */
  rows: number;
  columns: number;
  pageSize: PageSize;
  margins: Margins;
  /** Drawable area within the page margins, before any per-page pagination cut. */
  usable: Rect;
  /** 1-based row/col -> absolute rect within the virtual (unpaginated) grid. */
  cellRect(row: number, col: number): Rect;
  /**
   * 1-based row/col -> the node's actual visual boundary, inset from the cell
   * border by `nodeInset`. This is the single source of truth both node
   * rendering and edge routing must anchor to, so connections always end
   * exactly on the node border regardless of scale.
   */
  nodeRect(row: number, col: number): Rect;
  /** Spacing between a node's visual box and its surrounding cell border, at current scale. */
  nodeInset: number;
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
 * measures against. Cell size derives entirely from `config.scale` relative to
 * `REFERENCE_CELL_SIZE`; margins are fixed physical values independent of scale.
 */
export function buildGrid(layout: LayoutResult, config: RenderConfig): VirtualGrid {
  const cellWidth = scaled(REFERENCE_CELL_SIZE.widthPt, config.scale);
  const cellHeight = scaled(REFERENCE_CELL_SIZE.heightPt, config.scale);
  const nodeInset = scaled(REFERENCE_NODE_INSET, config.scale);
  const pageSize = resolvePageSize(config.paper, config.orientation);
  const { margins } = config;

  const usable: Rect = {
    x: margins.left,
    y: margins.top,
    width: pageSize.widthPt - margins.left - margins.right,
    height: pageSize.heightPt - margins.top - margins.bottom,
  };

  const cellRect = (row: number, col: number): Rect => ({
    x: usable.x + (col - 1) * cellWidth,
    y: usable.y + (row - 1) * cellHeight,
    width: cellWidth,
    height: cellHeight,
  });

  return {
    cellWidth,
    cellHeight,
    nodeInset,
    rows: layout.rows,
    columns: layout.cols,
    pageSize,
    margins,
    usable,
    cellRect,
    nodeRect(row: number, col: number): Rect {
      const cell = cellRect(row, col);
      return {
        x: cell.x + nodeInset,
        y: cell.y + nodeInset,
        width: cell.width - nodeInset * 2,
        height: cell.height - nodeInset * 2,
      };
    },
  };
}
