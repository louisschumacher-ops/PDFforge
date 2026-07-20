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

export interface NodeFillFactor {
  /** Fraction of a cell's width the node box fills; 1 = exactly the cell's width. */
  width: number;
  /** Fraction of a cell's height the node box fills; 1 = exactly the cell's height. */
  height: number;
}

/**
 * How much of a grid cell a node's visual box fills, as a fraction of the
 * cell's own width/height — 1 means the node exactly fills its cell on that
 * axis (no gap at all), 0.85 leaves a 15% gap split evenly around it. Width
 * and height are independent, e.g. a wide/flat node style vs a tall/narrow
 * one, without changing the underlying cell or grid density. This is the
 * single source of truth for where a node's actual boundary sits inside its
 * cell — both node rendering and edge routing anchor to it, so connections
 * always end exactly on the node border. Being a fraction of the cell rather
 * than a fixed point size, the gap automatically scales with whatever the
 * cell size happens to be (driven by `GridDensity` and paper format), instead
 * of eating a fixed, ever-larger share of a shrinking cell.
 */
export const DEFAULT_NODE_FILL_FACTOR: NodeFillFactor = { width: 0.85, height: 0.7 };

export interface GridDensity {
  /** How many columns fill the usable page width at scale 1. */
  columns: number;
  /** How many rows fill the usable page height at scale 1. */
  rows: number;
}

/**
 * How many columns/rows fit exactly within one page's usable area at scale 1.
 * This is the primary sizing lever: cell size is derived from usable area
 * divided by this density (see `grid/index.ts`), not the other way around.
 * Widening or shrinking the page margins only changes the usable area, and
 * therefore only the resulting cell size — it never changes how many columns
 * or rows are targeted. Overridable per render via `RenderConfig.gridDensity`;
 * these are just the per-paper-format defaults.
 */
export const DEFAULT_GRID_DENSITY: Record<PaperFormat, GridDensity> = {
  A5: { columns: 3, rows: 5 },
  A4: { columns: 5, rows: 8 },
  A3: { columns: 7, rows: 11 },
  Letter: { columns: 5, rows: 8 },
  Legal: { columns: 5, rows: 10 },
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
  /** Overrides the per-paper-format default from `DEFAULT_GRID_DENSITY`. */
  gridDensity?: GridDensity;
  /** Overrides `DEFAULT_NODE_FILL_FACTOR`; each axis is independent, 1 = fills the cell exactly on that axis. */
  nodeFillFactor?: Partial<NodeFillFactor>;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  paper: "A4",
  orientation: "portrait",
  scale: REFERENCE_SCALE,
  margins: DEFAULT_MARGINS,
};

export function resolveNodeFillFactor(config: RenderConfig): NodeFillFactor {
  return {
    width: config.nodeFillFactor?.width ?? DEFAULT_NODE_FILL_FACTOR.width,
    height: config.nodeFillFactor?.height ?? DEFAULT_NODE_FILL_FACTOR.height,
  };
}

export function resolveGridDensity(config: RenderConfig): GridDensity {
  return config.gridDensity ?? DEFAULT_GRID_DENSITY[config.paper];
}

export function scaled(basePt: number, scale: number): number {
  return basePt * scale;
}
