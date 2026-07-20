export { parse, DEFAULT_EDGE_STYLE } from "./parser/index.js";
export type {
  ParsedModel,
  ParsedNode,
  ParsedEdge,
  ParsedGroup,
  EdgeStyle,
} from "./parser/index.js";

export { buildGraph, MissingRootError, GraphCycleError } from "./graph/index.js";
export type { LogicalGraph, BuildGraphOptions } from "./graph/index.js";

export { computeLayout } from "./layout/index.js";
export type { LayoutResult, GridPosition } from "./layout/index.js";

export { buildGrid, columnLabel, groupRect } from "./grid/index.js";
export type { VirtualGrid, Rect } from "./grid/index.js";

export { routeEdges } from "./routing/index.js";
export type { RoutedEdge, Point } from "./routing/index.js";

export { paginate } from "./pagination/index.js";
export type { PaginatedLayout, PageLayout, CrossPageContinuation } from "./pagination/index.js";

export { renderDevPdf } from "./render/index.js";
export type { RenderOptions } from "./render/index.js";

export {
  DEFAULT_RENDER_CONFIG,
  DEFAULT_MARGINS,
  DEFAULT_GRID_DENSITY,
  DEFAULT_NODE_FILL_FACTOR,
  REFERENCE_GROUP_PADDING,
  resolvePageSize,
  resolveGridDensity,
  resolveNodeFillFactor,
  scaled,
} from "./config/index.js";
export type {
  RenderConfig,
  Margins,
  PageSize,
  PaperFormat,
  Orientation,
  GridDensity,
  NodeFillFactor,
} from "./config/index.js";
