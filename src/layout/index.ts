import type { LogicalGraph } from "../graph/index.js";

export interface GridPosition {
  /** 1-based hierarchy row: row = depth + 1, root n1 always occupies row 1. */
  row: number;
  /** 1-based column within the row, left to right. */
  col: number;
}

export interface LayoutResult {
  positions: Map<string, GridPosition>;
  rows: number;
  /** Widest row's column count. */
  cols: number;
}

/**
 * Assigns every reachable node exactly one grid cell, using only the logical
 * hierarchy from the graph (never editor coordinates).
 *
 * Row is the node's depth. Column order is derived with a post-order traversal:
 * leaves are numbered left to right in edge-declaration order, and each parent's
 * column key is the average of its children's keys, which keeps a parent centered
 * over its children and preserves sibling order without requiring integer
 * centering math on the final grid (only relative left-right order matters,
 * since each node owns exactly one cell).
 */
export function computeLayout(graph: LogicalGraph): LayoutResult {
  const columnKeys = new Map<string, number>();
  let nextLeafKey = 0;

  const assignColumnKey = (nodeId: string): number => {
    const children = graph.children.get(nodeId) ?? [];
    if (children.length === 0) {
      const key = nextLeafKey++;
      columnKeys.set(nodeId, key);
      return key;
    }
    const childKeys = children.map((child) => assignColumnKey(child));
    const key = childKeys.reduce((sum, value) => sum + value, 0) / childKeys.length;
    columnKeys.set(nodeId, key);
    return key;
  };

  assignColumnKey(graph.rootId);

  const rowGroups = new Map<number, string[]>();
  for (const [nodeId, depth] of graph.depth) {
    const row = depth + 1;
    const group = rowGroups.get(row) ?? [];
    group.push(nodeId);
    rowGroups.set(row, group);
  }

  const positions = new Map<string, GridPosition>();
  let cols = 0;
  let rows = 0;

  for (const [row, nodeIds] of rowGroups) {
    const ordered = [...nodeIds].sort(
      (a, b) => (columnKeys.get(a) ?? 0) - (columnKeys.get(b) ?? 0),
    );
    ordered.forEach((nodeId, index) => {
      positions.set(nodeId, { row, col: index + 1 });
    });
    cols = Math.max(cols, ordered.length);
    rows = Math.max(rows, row);
  }

  return { positions, rows, cols };
}
