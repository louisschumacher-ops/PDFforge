import { describe, expect, it } from "vitest";
import { buildGrid, columnLabel, groupRect } from "./index.js";
import {
  DEFAULT_RENDER_CONFIG,
  REFERENCE_CELL_SIZE,
  REFERENCE_NODE_INSET,
} from "../config/index.js";
import type { GridPosition, LayoutResult } from "../layout/index.js";

describe("columnLabel", () => {
  it("maps 1-based indices to spreadsheet-style letters", () => {
    expect(columnLabel(1)).toBe("A");
    expect(columnLabel(26)).toBe("Z");
    expect(columnLabel(27)).toBe("AA");
    expect(columnLabel(52)).toBe("AZ");
  });
});

describe("buildGrid", () => {
  const layout: LayoutResult = { positions: new Map(), rows: 4, cols: 3 };

  it("scales cell size linearly with the scale factor", () => {
    const grid100 = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, scale: 1 });
    const grid50 = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, scale: 0.5 });
    expect(grid100.cellWidth).toBe(REFERENCE_CELL_SIZE.widthPt);
    expect(grid50.cellWidth).toBe(REFERENCE_CELL_SIZE.widthPt * 0.5);
    expect(grid50.cellHeight).toBe(grid100.cellHeight * 0.5);
  });

  it("keeps identical layout across paper formats, only usable area changes", () => {
    const a4 = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, paper: "A4" });
    const letter = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, paper: "Letter" });
    expect(a4.rows).toBe(letter.rows);
    expect(a4.columns).toBe(letter.columns);
    expect(a4.cellWidth).toBe(letter.cellWidth);
    expect(a4.usable.width).not.toBe(letter.usable.width);
  });

  it("places cell (1,1) at the top-left of the usable area", () => {
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);
    const rect = grid.cellRect(1, 1);
    expect(rect.x).toBe(grid.usable.x);
    expect(rect.y).toBe(grid.usable.y);
  });

  it("advances cells by exactly one cell size per row/col step", () => {
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);
    const a = grid.cellRect(2, 3);
    const b = grid.cellRect(1, 1);
    expect(a.x - b.x).toBe(2 * grid.cellWidth);
    expect(a.y - b.y).toBe(1 * grid.cellHeight);
  });

  it("insets nodeRect from cellRect by nodeInset on every side, scaling with it", () => {
    const grid = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, scale: 1 });
    const cell = grid.cellRect(2, 2);
    const node = grid.nodeRect(2, 2);
    expect(grid.nodeInset).toBe(REFERENCE_NODE_INSET);
    expect(node.x - cell.x).toBe(grid.nodeInset);
    expect(node.y - cell.y).toBe(grid.nodeInset);
    expect(cell.width - node.width).toBe(grid.nodeInset * 2);
    expect(cell.height - node.height).toBe(grid.nodeInset * 2);
  });
});

describe("groupRect", () => {
  const layout: LayoutResult = { positions: new Map(), rows: 4, cols: 3 };
  const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

  it("wraps exactly the member node boxes' union, expanded outward by padding", () => {
    const positions = new Map<string, GridPosition>([
      ["a", { row: 4, col: 1 }],
      ["b", { row: 4, col: 2 }],
    ]);
    const rect = groupRect(["a", "b"], positions, grid, 10);
    const nodeA = grid.nodeRect(4, 1);
    const nodeB = grid.nodeRect(4, 2);

    expect(rect).toEqual({
      x: nodeA.x - 10,
      y: nodeA.y - 10,
      width: nodeB.x + nodeB.width - nodeA.x + 20,
      height: nodeA.height + 20,
    });
  });

  it("never moves or resizes the member cells themselves", () => {
    const positions = new Map<string, GridPosition>([["a", { row: 1, col: 1 }]]);
    const before = grid.cellRect(1, 1);
    groupRect(["a"], positions, grid, 25);
    const after = grid.cellRect(1, 1);
    expect(after).toEqual(before);
  });

  it("returns undefined when no member resolves to a position", () => {
    expect(groupRect(["missing"], new Map(), grid, 10)).toBeUndefined();
  });
});
