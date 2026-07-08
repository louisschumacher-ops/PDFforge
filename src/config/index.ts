export type PaperFormat = "A5" | "A4" | "A3" | "Letter" | "Legal";
export type Orientation = "portrait" | "landscape";

export interface PageSize {
  widthPt: number;
  heightPt: number;
}

/** Portrait dimensions in PDF points (1pt = 1/72 inch). */
const PORTRAIT_SIZES_PT: Record<PaperFormat, PageSize> = {
  A5: { widthPt: 420, heightPt: 595 },
  A4: { widthPt: 595, heightPt: 842 },
  A3: { widthPt: 842, heightPt: 1191 },
  Letter: { widthPt: 612, heightPt: 792 },
  Legal: { widthPt: 612, heightPt: 1008 },
};

export function resolvePageSize(format: PaperFormat, orientation: Orientation): PageSize {
  const portrait = PORTRAIT_SIZES_PT[format];
  return orientation === "portrait"
    ? portrait
    : { widthPt: portrait.heightPt, heightPt: portrait.widthPt };
}

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Margins are fixed physical measurements (points) and do not move with `scale`. */
export const DEFAULT_MARGINS: Margins = { top: 36, bottom: 36, left: 36, right: 36 };

/**
 * Fixed node box size at the reference scale (100%), tuned so a node reads well
 * on an A4 page. This is the one thing that never shrinks: the surrounding grid
 * cell is derived from it (node size + 2x inset), so widening the inset only
 * grows the gap around a node, never the node itself.
 */
export const REFERENCE_NODE_SIZE = { widthPt: 160, heightPt: 130 };

/**
 * Fixed spacing, at the reference scale, between a node's visual box and the
 * surrounding grid cell border. Scales together with `REFERENCE_NODE_SIZE`, and
 * is the single source of truth for where a node's actual boundary sits inside
 * its cell — both node rendering and edge routing anchor to it, so connections
 * always end exactly on the node border regardless of scale.
 */
export const REFERENCE_NODE_INSET = 40;

/** Grid cell size, derived from the node's own size plus the inset on both sides. */
export const REFERENCE_CELL_SIZE = {
  widthPt: REFERENCE_NODE_SIZE.widthPt + REFERENCE_NODE_INSET * 2,
  heightPt: REFERENCE_NODE_SIZE.heightPt + REFERENCE_NODE_INSET * 2,
};

/**
 * Fixed spacing, at the reference scale, between a group frame's border and the
 * nearest border of its outermost member nodes. Purely a drawing frame — it
 * never moves node positions or the spacing between nodes, it only draws
 * outward from the node boxes the members already occupy.
 */
export const REFERENCE_GROUP_PADDING = 20;

export const REFERENCE_SCALE = 1;

export interface RenderConfig {
  paper: PaperFormat;
  orientation: Orientation;
  scale: number;
  margins: Margins;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  paper: "A4",
  orientation: "portrait",
  scale: REFERENCE_SCALE,
  margins: DEFAULT_MARGINS,
};

export function scaled(basePt: number, scale: number): number {
  return basePt * scale;
}
