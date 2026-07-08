import { describe, expect, it } from "vitest";
import { routeEdges } from "./index.js";
import { buildGraph } from "../graph/index.js";
import { computeLayout } from "../layout/index.js";
import { buildGrid } from "../grid/index.js";
import { DEFAULT_RENDER_CONFIG } from "../config/index.js";
import { DEFAULT_EDGE_STYLE, type ParsedModel } from "../parser/index.js";

function model(): ParsedModel {
  return {
    nodes: [
      { id: "n1", type: "t", label: "A", metadata: {} },
      { id: "n2", type: "t", label: "B", metadata: {} },
      { id: "n3", type: "t", label: "C", metadata: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE },
      { id: "e2", source: "n1", target: "n3", style: DEFAULT_EDGE_STYLE },
    ],
    groups: [],
  };
}

describe("routeEdges", () => {
  it("routes a straight-below child as a single vertical segment", () => {
    const m: ParsedModel = {
      nodes: [
        { id: "n1", type: "t", label: "A", metadata: {} },
        { id: "n2", type: "t", label: "B", metadata: {} },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE }],
      groups: [],
    };
    const graph = buildGraph(m);
    const layout = computeLayout(graph);
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

    const [routed] = routeEdges(m, layout, grid);
    expect(routed!.points).toHaveLength(2);
    expect(routed!.points[0]!.x).toBe(routed!.points[1]!.x);
  });

  it("routes a fanned-out sibling as an orthogonal elbow, never diagonal", () => {
    const m = model();
    const graph = buildGraph(m);
    const layout = computeLayout(graph);
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

    const routed = routeEdges(m, layout, grid).find((r) => r.id === "e2")!;
    expect(routed.points).toHaveLength(4);
    for (let i = 0; i < routed.points.length - 1; i++) {
      const a = routed.points[i]!;
      const b = routed.points[i + 1]!;
      const isHorizontal = a.y === b.y;
      const isVertical = a.x === b.x;
      expect(isHorizontal || isVertical).toBe(true);
    }
  });

  it("carries the edge's style through untouched", () => {
    const m = model();
    m.edges[0]!.style = { color: "#ff0000", width: 2, dashed: true };
    const graph = buildGraph(m);
    const layout = computeLayout(graph);
    const grid = buildGrid(layout, DEFAULT_RENDER_CONFIG);

    const routed = routeEdges(m, layout, grid).find((r) => r.id === "e1")!;
    expect(routed.style).toEqual({ color: "#ff0000", width: 2, dashed: true });
  });
});
