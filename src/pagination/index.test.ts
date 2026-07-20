import { describe, expect, it } from "vitest";
import { paginate } from "./index.js";
import { buildGraph } from "../graph/index.js";
import { computeLayout } from "../layout/index.js";
import { buildGrid } from "../grid/index.js";
import { DEFAULT_RENDER_CONFIG } from "../config/index.js";
import { DEFAULT_EDGE_STYLE, type ParsedModel } from "../parser/index.js";

function chain(length: number): ParsedModel {
  const nodes = Array.from({ length }, (_, i) => ({
    id: `n${i + 1}`,
    type: "t",
    label: `Node ${i + 1}`,
    metadata: {},
  }));
  const edges = Array.from({ length: length - 1 }, (_, i) => ({
    id: `e${i + 1}`,
    source: `n${i + 1}`,
    target: `n${i + 2}`,
    style: DEFAULT_EDGE_STYLE,
  }));
  return { nodes, edges, groups: [] };
}

describe("paginate", () => {
  it("never splits a node: every row appears on exactly one page", () => {
    const model = chain(10);
    const layout = computeLayout(buildGraph(model));
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

    const { pages } = paginate(model, layout, grid);

    const covered = new Set<number>();
    for (const page of pages) {
      for (let row = page.rowStart; row <= page.rowEnd; row++) {
        expect(covered.has(row)).toBe(false);
        covered.add(row);
      }
    }
    expect(covered.size).toBe(layout.rows);
  });

  it("splits a tall chain across more than one page", () => {
    const model = chain(10);
    const layout = computeLayout(buildGraph(model));
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

    const { pages } = paginate(model, layout, grid);
    expect(pages.length).toBeGreaterThan(1);
  });

  it("keeps a group on one page by shifting it forward instead of splitting it", () => {
    const model: ParsedModel = {
      nodes: [
        { id: "n1", type: "t", label: "root", metadata: {} },
        { id: "n2", type: "t", label: "a", metadata: {} },
        { id: "n3", type: "t", label: "b", metadata: {} },
        { id: "n4", type: "t", label: "c", metadata: {} },
        { id: "n5", type: "t", label: "grouped-1", metadata: {} },
        { id: "n6", type: "t", label: "grouped-2", metadata: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE },
        { id: "e2", source: "n2", target: "n3", style: DEFAULT_EDGE_STYLE },
        { id: "e3", source: "n3", target: "n4", style: DEFAULT_EDGE_STYLE },
        { id: "e4", source: "n4", target: "n5", style: DEFAULT_EDGE_STYLE },
        { id: "e5", source: "n4", target: "n6", style: DEFAULT_EDGE_STYLE },
      ],
      groups: [{ id: "g1", label: "Group", nodeIds: ["n5", "n6"] }],
    };
    const layout = computeLayout(buildGraph(model));
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

    const { pages, nodePage } = paginate(model, layout, grid);

    // n5 and n6 share a row (siblings), so they must land on the same page.
    expect(nodePage.get("n5")).toBe(nodePage.get("n6"));
    expect(pages.length).toBeGreaterThanOrEqual(1);
  });

  it("reports a continuation for every edge crossing a page boundary", () => {
    const model = chain(10);
    const layout = computeLayout(buildGraph(model));
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

    const { continuations, nodePage } = paginate(model, layout, grid);

    for (const edge of model.edges) {
      const fromPage = nodePage.get(edge.source);
      const toPage = nodePage.get(edge.target);
      const crosses = fromPage !== toPage;
      const reported = continuations.some((c) => c.edgeId === edge.id);
      expect(reported).toBe(crosses);
    }
    expect(continuations.length).toBeGreaterThan(0);
  });
});
