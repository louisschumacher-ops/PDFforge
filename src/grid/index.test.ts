import { describe, expect, it } from "vitest";
import { buildGrid, columnLabel, groupRect } from "./index.js";
import {
  DEFAULT_GRID_DENSITY,
  DEFAULT_NODE_FILL_FACTOR,
  DEFAULT_RENDER_CONFIG,
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

  it("derives cell size from usable area divided by the configured grid density", () => {
    const grid = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, scale: 1 });
    const density = DEFAULT_GRID_DENSITY.A4;
    expect(grid.cellWidth).toBeCloseTo(grid.usable.width / density.columns);
    expect(grid.cellHeight).toBeCloseTo(grid.usable.height / density.rows);
  });

  it("scales cell size linearly with the scale factor", () => {
    const grid100 = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, scale: 1 });
    const grid50 = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, scale: 0.5 });
    expect(grid50.cellWidth).toBeCloseTo(grid100.cellWidth * 0.5);
    expect(grid50.cellHeight).toBeCloseTo(grid100.cellHeight * 0.5);
  });

  it("keeps the configured column/row count fixed across paper formats, only cell size changes", () => {
    const a4 = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, paper: "A4" });
    const letter = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, paper: "Letter" });
    expect(a4.rows).toBe(letter.rows);
    expect(a4.columns).toBe(letter.columns);
    expect(a4.usable.width).not.toBe(letter.usable.width);
  });

  it("shrinks only the grid, never the configured density, when margins grow", () => {
    const tightMargins = buildGrid(layout, {
      ...DEFAULT_RENDER_CONFIG,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    });
    const wideMargins = buildGrid(layout, {
      ...DEFAULT_RENDER_CONFIG,
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
    });
    const density = DEFAULT_GRID_DENSITY[DEFAULT_RENDER_CONFIG.paper];
    expect(wideMargins.cellWidth).toBeLessThan(tightMargins.cellWidth);
    expect(wideMargins.cellWidth).toBeCloseTo(wideMargins.usable.width / density.columns);
    expect(tightMargins.cellWidth).toBeCloseTo(tightMargins.usable.width / density.columns);
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

  it("scales nodeRect as a fraction of cellRect, centered within it", () => {
    const grid = buildGrid(layout, { ...DEFAULT_RENDER_CONFIG, scale: 1 });
    const cell = grid.cellRect(2, 2);
    const node = grid.nodeRect(2, 2);
    expect(grid.nodeFillFactor).toEqual(DEFAULT_NODE_FILL_FACTOR);
    expect(node.width).toBeCloseTo(cell.width * DEFAULT_NODE_FILL_FACTOR.width);
    expect(node.height).toBeCloseTo(cell.height * DEFAULT_NODE_FILL_FACTOR.height);
    expect(node.x - cell.x).toBeCloseTo((cell.width - node.width) / 2);
    expect(node.y - cell.y).toBeCloseTo((cell.height - node.height) / 2);
  });

  it("fills the cell exactly when nodeFillFactor is 1 on both axes", () => {
    const grid = buildGrid(layout, {
      ...DEFAULT_RENDER_CONFIG,
      nodeFillFactor: { width: 1, height: 1 },
    });
    const cell = grid.cellRect(3, 1);
    const node = grid.nodeRect(3, 1);
    expect(node).toEqual(cell);
  });

  it("scales width and height independently", () => {
    const grid = buildGrid(layout, {
      ...DEFAULT_RENDER_CONFIG,
      nodeFillFactor: { width: 1, height: 0.5 },
    });
    const cell = grid.cellRect(1, 1);
    const node = grid.nodeRect(1, 1);
    expect(node.width).toBeCloseTo(cell.width);
    expect(node.height).toBeCloseTo(cell.height * 0.5);
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
