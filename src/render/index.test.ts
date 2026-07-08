import { describe, expect, it } from "vitest";
import { renderDevPdf } from "./index.js";
import { DEFAULT_EDGE_STYLE, type ParsedModel } from "../parser/index.js";

describe("renderDevPdf", () => {
  it("produces a non-empty PDF buffer for the example network", async () => {
    const model: ParsedModel = {
      nodes: [
        { id: "n1", type: "grid-connection", label: "Netzanschlusspunkt", metadata: {} },
        { id: "n2", type: "transformer", label: "Transformator", metadata: {} },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2", style: DEFAULT_EDGE_STYLE }],
      groups: [],
    };

    const pdf = await renderDevPdf(model);
    expect(pdf.byteLength).toBeGreaterThan(0);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
