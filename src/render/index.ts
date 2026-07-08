import PDFDocument from "pdfkit";
import type { ParsedModel } from "../parser/index.js";
import { buildGraph, type BuildGraphOptions } from "../graph/index.js";
import { computeLayout } from "../layout/index.js";
import { buildGrid, columnLabel, groupRect, type VirtualGrid } from "../grid/index.js";
import { routeEdges, type RoutedEdge } from "../routing/index.js";
import {
  DEFAULT_RENDER_CONFIG,
  REFERENCE_GROUP_PADDING,
  scaled,
  type RenderConfig,
} from "../config/index.js";

export interface RenderOptions {
  config?: RenderConfig;
  graph?: BuildGraphOptions;
}

/**
 * Single-page development-mode render: draws every node as a plain labelled box
 * on its assigned grid cell, plus a light orientation grid and straight arrows
 * for every edge. Pagination and orthogonal routing are later milestones; this
 * exists to visually verify the parser -> graph -> layout -> grid pipeline.
 */
export function renderDevPdf(model: ParsedModel, options: RenderOptions = {}): Promise<Buffer> {
  const config = options.config ?? DEFAULT_RENDER_CONFIG;
  const graph = buildGraph(model, options.graph);
  const layout = computeLayout(graph);
  const grid = buildGrid(layout, config);

  const pageWidth = grid.usable.x + grid.columns * grid.cellWidth + grid.margins.right;
  const pageHeight = grid.usable.y + grid.rows * grid.cellHeight + grid.margins.bottom;

  const doc = new PDFDocument({ size: [pageWidth, pageHeight], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const routedEdges = routeEdges(model, layout, grid);

  drawBackgroundGrid(doc, grid, config.scale);
  drawGroups(doc, model, layout, grid, config.scale);
  drawEdges(doc, routedEdges, config.scale);
  drawNodes(doc, model, layout, grid, config.scale);

  doc.end();
  return done;
}

function drawBackgroundGrid(doc: PDFKit.PDFDocument, grid: VirtualGrid, scale: number): void {
  const labelSize = scaled(9, scale);
  doc.save();
  doc.strokeColor("#e5e5e5").lineWidth(scaled(0.5, scale));

  for (let row = 0; row <= grid.rows; row++) {
    const y = grid.usable.y + row * grid.cellHeight;
    doc
      .moveTo(grid.usable.x, y)
      .lineTo(grid.usable.x + grid.columns * grid.cellWidth, y)
      .stroke();
  }
  for (let col = 0; col <= grid.columns; col++) {
    const x = grid.usable.x + col * grid.cellWidth;
    doc
      .moveTo(x, grid.usable.y)
      .lineTo(x, grid.usable.y + grid.rows * grid.cellHeight)
      .stroke();
  }

  doc.fillColor("#bbbbbb").fontSize(labelSize);
  for (let col = 1; col <= grid.columns; col++) {
    const rect = grid.cellRect(1, col);
    doc.text(columnLabel(col), rect.x, grid.usable.y - labelSize * 1.5, {
      width: grid.cellWidth,
      align: "center",
    });
  }
  for (let row = 1; row <= grid.rows; row++) {
    const rect = grid.cellRect(row, 1);
    doc.text(String(row), grid.usable.x - labelSize * 2, rect.y, {
      width: labelSize * 1.5,
      align: "right",
    });
  }
  doc.restore();
}

function drawGroups(
  doc: PDFKit.PDFDocument,
  model: ParsedModel,
  layout: ReturnType<typeof computeLayout>,
  grid: VirtualGrid,
  scale: number,
): void {
  const padding = scaled(REFERENCE_GROUP_PADDING, scale);
  const titleSize = scaled(9, scale);
  const textPadding = scaled(6, scale);

  for (const group of model.groups) {
    const rect = groupRect(group.nodeIds, layout.positions, grid, padding);
    if (!rect) continue;

    doc
      .save()
      .lineWidth(scaled(1, scale))
      .strokeColor("#94a3b8")
      .fillColor("#f1f5f9")
      .rect(rect.x, rect.y, rect.width, rect.height)
      .fillAndStroke("#f1f5f9", "#94a3b8");

    doc
      .fillColor("#475569")
      .fontSize(titleSize)
      .text(group.label, rect.x + textPadding, rect.y + textPadding, {
        width: rect.width - textPadding * 2,
      });
    doc.restore();
  }
}

function drawNodes(
  doc: PDFKit.PDFDocument,
  model: ParsedModel,
  layout: ReturnType<typeof computeLayout>,
  grid: VirtualGrid,
  scale: number,
): void {
  const textPadding = scaled(10, scale);
  const titleSize = scaled(11, scale);
  const typeSize = scaled(8, scale);

  for (const node of model.nodes) {
    const position = layout.positions.get(node.id);
    if (!position) continue;
    const rect = grid.nodeRect(position.row, position.col);

    doc
      .save()
      .lineWidth(scaled(1, scale))
      .strokeColor("#333333")
      .fillColor("#ffffff")
      .rect(rect.x, rect.y, rect.width, rect.height)
      .fillAndStroke("#ffffff", "#333333");

    const textX = rect.x + textPadding;
    const textWidth = rect.width - textPadding * 2;
    const titleY = rect.y + textPadding;
    const contentHeight = rect.height - textPadding * 2;
    const gap = textPadding * 0.5;

    const subtitle = `${node.id} · ${node.type}`;
    const subtitleHeight = doc.fontSize(typeSize).heightOfString(subtitle, { width: textWidth });

    // Labels are fixed-size boxes, not auto-growing ones: cap the title to
    // whatever height is left after reserving space for the subtitle, and
    // ellipsize both, so an unusually long label can never spill past the
    // node's border regardless of scale or inset.
    const maxTitleHeight = Math.max(contentHeight - subtitleHeight - gap, titleSize);
    doc.fontSize(titleSize);
    const titleHeight = Math.min(
      doc.heightOfString(node.label, { width: textWidth }),
      maxTitleHeight,
    );
    doc.fillColor("#111111").text(node.label, textX, titleY, {
      width: textWidth,
      height: maxTitleHeight,
      ellipsis: true,
    });

    doc
      .fillColor("#666666")
      .fontSize(typeSize)
      .text(subtitle, textX, titleY + titleHeight + gap, {
        width: textWidth,
        height: Math.max(contentHeight - titleHeight - gap, 0),
        ellipsis: true,
      });
    doc.restore();
  }
}

function drawEdges(doc: PDFKit.PDFDocument, edges: RoutedEdge[], scale: number): void {
  const dashLength = scaled(4, scale);
  const dashSpace = scaled(2.5, scale);

  for (const edge of edges) {
    const [first, ...rest] = edge.points;
    if (!first || rest.length === 0) continue;

    doc.save().strokeColor(edge.style.color).lineWidth(scaled(edge.style.width, scale));
    if (edge.style.dashed) {
      doc.dash(dashLength, { space: dashSpace });
    } else {
      doc.undash();
    }

    doc.moveTo(first.x, first.y);
    for (const point of rest) {
      doc.lineTo(point.x, point.y);
    }
    doc.stroke();
    doc.restore();
  }
}
