import { describe, expect, it } from "vitest";
import { resolvePageSize, scaled } from "./index.js";

describe("resolvePageSize", () => {
  it("swaps width/height for landscape", () => {
    const portrait = resolvePageSize("A4", "portrait");
    const landscape = resolvePageSize("A4", "landscape");
    expect(landscape).toEqual({ widthPt: portrait.heightPt, heightPt: portrait.widthPt });
  });

  it("supports all required paper formats", () => {
    for (const format of ["A5", "A4", "A3", "Letter", "Legal"] as const) {
      const size = resolvePageSize(format, "portrait");
      expect(size.widthPt).toBeGreaterThan(0);
      expect(size.heightPt).toBeGreaterThan(0);
    }
  });
});

describe("scaled", () => {
  it("scales linearly from the reference", () => {
    expect(scaled(100, 1)).toBe(100);
    expect(scaled(100, 0.5)).toBe(50);
    expect(scaled(100, 2)).toBe(200);
  });
});
