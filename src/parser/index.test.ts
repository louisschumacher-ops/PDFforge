import { describe, expect, it } from "vitest";
import { DEFAULT_EDGE_STYLE, parse } from "./index.js";

describe("parse", () => {
  it("discards editor position data and keeps logical fields", () => {
    const raw = {
      nodes: [
        {
          id: "n1",
          type: "grid-connection",
          label: "Netzanschlusspunkt",
          position: { x: 120, y: 40 },
        },
        { id: "n2", type: "transformer", label: "Transformator", position: { x: 400, y: 400 } },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2" }],
      groups: [],
    };

    const result = parse(raw);

    expect(result.nodes).toEqual([
      { id: "n1", type: "grid-connection", label: "Netzanschlusspunkt", metadata: {} },
      { id: "n2", type: "transformer", label: "Transformator", metadata: {} },
    ]);
    expect(result.edges).toEqual([
      { id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE },
    ]);
    expect(result.nodes.some((n) => "position" in n)).toBe(false);
  });

  it("reads a per-edge style override when the JSON provides one", () => {
    const raw = {
      nodes: [
        { id: "n1", type: "t", label: "A" },
        { id: "n2", type: "t", label: "B" },
      ],
      edges: [
        {
          id: "e1",
          source: "n1",
          target: "n2",
          style: { color: "#ff0000", width: 2.5, dashed: true },
        },
      ],
      groups: [],
    };

    const result = parse(raw);

    expect(result.edges[0]!.style).toEqual({ color: "#ff0000", width: 2.5, dashed: true });
  });

  it("defaults missing arrays to empty", () => {
    expect(parse({})).toEqual({ nodes: [], edges: [], groups: [] });
  });
});
