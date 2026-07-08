import { describe, expect, it } from "vitest";
import { buildGraph } from "../graph/index.js";
import { computeLayout } from "./index.js";
import { DEFAULT_EDGE_STYLE, type ParsedModel } from "../parser/index.js";

describe("computeLayout", () => {
  it("places root in row 1 and fans siblings out horizontally in row 4", () => {
    const model: ParsedModel = {
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
      groups: [],
    };

    const layout = computeLayout(buildGraph(model));

    expect(layout.rows).toBe(4);
    expect(layout.cols).toBe(3);
    expect(layout.positions.get("n1")).toEqual({ row: 1, col: 1 });
    expect(layout.positions.get("n2")).toEqual({ row: 2, col: 1 });
    expect(layout.positions.get("n3")).toEqual({ row: 3, col: 1 });
    expect(layout.positions.get("n4")).toEqual({ row: 4, col: 1 });
    expect(layout.positions.get("n5")).toEqual({ row: 4, col: 2 });
    expect(layout.positions.get("n6")).toEqual({ row: 4, col: 3 });
  });

  it("is deterministic for identical input", () => {
    const model: ParsedModel = {
      nodes: [
        { id: "n1", type: "t", label: "Root", metadata: {} },
        { id: "n2", type: "t", label: "A", metadata: {} },
        { id: "n3", type: "t", label: "B", metadata: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE },
        { id: "e2", source: "n1", target: "n3", style: DEFAULT_EDGE_STYLE },
      ],
      groups: [],
    };

    const first = computeLayout(buildGraph(model));
    const second = computeLayout(buildGraph(model));
    expect(first).toEqual(second);
  });
});
