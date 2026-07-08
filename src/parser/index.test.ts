import { describe, expect, it } from "vitest";
import { parse } from "./index.js";

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
    expect(result.edges).toEqual([{ id: "e1", source: "n1", target: "n2" }]);
    expect(result.nodes.some((n) => "position" in n)).toBe(false);
  });

  it("defaults missing arrays to empty", () => {
    expect(parse({})).toEqual({ nodes: [], edges: [], groups: [] });
  });
});
