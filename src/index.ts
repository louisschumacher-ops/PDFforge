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

export { renderDevPdf } from "./render/index.js";
export type { RenderOptions } from "./render/index.js";

export {
  DEFAULT_RENDER_CONFIG,
  DEFAULT_MARGINS,
  REFERENCE_CELL_SIZE,
  REFERENCE_NODE_INSET,
  REFERENCE_GROUP_PADDING,
  resolvePageSize,
  scaled,
} from "./config/index.js";
export type { RenderConfig, Margins, PageSize, PaperFormat, Orientation } from "./config/index.js";
