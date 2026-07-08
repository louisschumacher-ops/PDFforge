import type { EdgeStyle, ParsedModel } from "../parser/index.js";
import type { LayoutResult } from "../layout/index.js";
import type { VirtualGrid } from "../grid/index.js";

export interface Point {
  x: number;
  y: number;
}

export interface RoutedEdge {
  id: string;
  source: string;
  target: string;
  style: EdgeStyle;
  /** Orthogonal polyline: every consecutive pair is a horizontal or vertical segment, never diagonal. */
  points: Point[];
}

/**
 * Routes every edge as an orthogonal "elbow" connector between the source node's
 * bottom border and the target node's top border: down from the source, across
 * at the midpoint of the row gap, down into the target. Straight-below children
 * degrade naturally to a single vertical segment. No curves, no diagonals.
 */
export function routeEdges(
  model: ParsedModel,
  layout: LayoutResult,
  grid: VirtualGrid,
): RoutedEdge[] {
  const routed: RoutedEdge[] = [];

  for (const edge of model.edges) {
    const from = layout.positions.get(edge.source);
    const to = layout.positions.get(edge.target);
    if (!from || !to) continue;

    const fromRect = grid.nodeRect(from.row, from.col);
    const toRect = grid.nodeRect(to.row, to.col);

    const start: Point = { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height };
    const end: Point = { x: toRect.x + toRect.width / 2, y: toRect.y };

    routed.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      style: edge.style,
      points: orthogonalPath(start, end),
    });
  }

  return routed;
}

function orthogonalPath(start: Point, end: Point): Point[] {
  if (start.x === end.x) {
    return [start, end];
  }
  const midY = start.y + (end.y - start.y) / 2;
  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}
