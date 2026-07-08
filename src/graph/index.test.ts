import { describe, expect, it } from "vitest";
import { buildGraph, GraphCycleError, MissingRootError } from "./index.js";
import { DEFAULT_EDGE_STYLE, type ParsedModel } from "../parser/index.js";

function model(overrides: Partial<ParsedModel> = {}): ParsedModel {
  return { nodes: [], edges: [], groups: [], ...overrides };
}

describe("buildGraph", () => {
  it("computes depth from root n1 along the example network", () => {
    const m = model({
      nodes: [
        { id: "n1", type: "grid-connection", label: "Netzanschlusspunkt", metadata: {} },
        { id: "n2", type: "transformer", label: "Transformator", metadata: {} },
        { id: "n3", type: "distribution-board", label: "NSHV", metadata: {} },
        { id: "n4", type: "consumer", label: "Verbraucher", metadata: {} },
        { id: "n5", type: "pv-system", label: "PV-Anlage", metadata: {} },
        { id: "n6", type: "battery-storage", label: "Batteriespeicher", metadata: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE },
        { id: "e2", source: "n2", target: "n3", style: DEFAULT_EDGE_STYLE },
        { id: "e3", source: "n3", target: "n4", style: DEFAULT_EDGE_STYLE },
        { id: "e4", source: "n3", target: "n5", style: DEFAULT_EDGE_STYLE },
        { id: "e5", source: "n3", target: "n6", style: DEFAULT_EDGE_STYLE },
      ],
    });

    const graph = buildGraph(m);

    expect(graph.rootId).toBe("n1");
    expect(graph.depth.get("n1")).toBe(0);
    expect(graph.depth.get("n2")).toBe(1);
    expect(graph.depth.get("n3")).toBe(2);
    expect(graph.depth.get("n4")).toBe(3);
    expect(graph.depth.get("n5")).toBe(3);
    expect(graph.depth.get("n6")).toBe(3);
    expect(graph.children.get("n3")).toEqual(["n4", "n5", "n6"]);
    expect(graph.unreachable).toEqual([]);
  });

  it("throws MissingRootError when n1 is absent", () => {
    const m = model({ nodes: [{ id: "x", type: "t", label: "X", metadata: {} }] });
    expect(() => buildGraph(m)).toThrow(MissingRootError);
  });

  it("throws GraphCycleError on a cycle reachable from root", () => {
    const m = model({
      nodes: [
        { id: "n1", type: "t", label: "A", metadata: {} },
        { id: "n2", type: "t", label: "B", metadata: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE },
        { id: "e2", source: "n2", target: "n1", style: DEFAULT_EDGE_STYLE },
      ],
    });
    expect(() => buildGraph(m)).toThrow(GraphCycleError);
  });

  it("lists nodes unreachable from root instead of dropping them silently", () => {
    const m = model({
      nodes: [
        { id: "n1", type: "t", label: "A", metadata: {} },
        { id: "orphan", type: "t", label: "O", metadata: {} },
      ],
      edges: [],
    });
    const graph = buildGraph(m);
    expect(graph.unreachable).toEqual(["orphan"]);
  });
});
