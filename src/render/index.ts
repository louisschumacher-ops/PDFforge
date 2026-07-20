import PDFDocument from "pdfkit";
import { DEFAULT_EDGE_STYLE, type ParsedModel } from "../parser/index.js";
import { buildGraph, type BuildGraphOptions } from "../graph/index.js";
import { computeLayout, type GridPosition, type LayoutResult } from "../layout/index.js";
import { buildGrid, columnLabel, groupRect, type VirtualGrid } from "../grid/index.js";
import { routeEdges, type RoutedEdge } from "../routing/index.js";
import { paginate, type PageLayout } from "../pagination/index.js";
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
 * Development-mode render: draws every node as a plain labelled box on its
 * assigned grid cell, plus a light orientation grid and orthogonal connectors.
 * The virtual layout is computed once, then sliced into physical pages sized
 * to the configured paper format; edges that cross a page boundary get a
 * "continued on/from page N" label with a working internal PDF link instead
 * of a line that would otherwise run off the page.
 */
export function renderDevPdf(model: ParsedModel, options: RenderOptions = {}): Promise<Buffer> {
  const config = options.config ?? DEFAULT_RENDER_CONFIG;
  const graph = buildGraph(model, options.graph);
  const layout = computeLayout(graph);
  const grid = buildGrid(layout, config);
  const paginated = paginate(model, layout, grid);

  const doc = new PDFDocument({
    size: [grid.pageSize.widthPt, grid.pageSize.heightPt],
    margin: 0,
    autoFirstPage: false,
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Reserve every page up front so cross-page links can target a page number
  // that already exists in the document, regardless of whether the link
  // points forward or backward.
  for (let i = 0; i < paginated.pages.length; i++) {
    doc.addPage();
  }

  // Every page addresses its own grid starting fresh at row 1 / column A, so a
  // cross-page label like "2.A9" always means "row 9 as printed on page 2" —
  // precompute each page's local layout up front so continuation labels on
  // one page can look up the correct address of a node living on another.
  const localLayoutsByPage = new Map(
    paginated.pages.map((page) => [
      page.pageIndex,
      toPageLocalLayout(layout, page, page.rowStart - 1),
    ]),
  );

  for (const page of paginated.pages) {
    doc.switchToPage(page.pageIndex);
    const localLayout = localLayoutsByPage.get(page.pageIndex) as LayoutResult;
    const localEdges = model.edges.filter(
      (edge) =>
        paginated.nodePage.get(edge.source) === page.pageIndex &&
        paginated.nodePage.get(edge.target) === page.pageIndex,
    );
    const routedEdges = routeEdges({ ...model, edges: localEdges }, localLayout, grid);

    drawBackgroundGrid(doc, grid, config.scale);
    drawGroups(doc, model, localLayout, grid, config.scale);
    drawEdges(doc, routedEdges, config.scale);
    drawNodes(doc, model, localLayout, grid, config.scale);
    drawContinuations(
      doc,
      model,
      paginated.continuations,
      page,
      localLayoutsByPage,
      grid,
      config.scale,
    );
  }

  doc.end();
  return done;
}

/** Projects the global layout onto a single page's local row numbering (row 1 = page's first row). */
function toPageLocalLayout(
  layout: LayoutResult,
  page: PageLayout,
  rowOffset: number,
): LayoutResult {
  const positions = new Map<string, GridPosition>();
  for (const [nodeId, position] of layout.positions) {
    if (position.row >= page.rowStart && position.row <= page.rowEnd) {
      positions.set(nodeId, { row: position.row - rowOffset, col: position.col });
    }
  }
  return { positions, rows: page.rowEnd - page.rowStart + 1, cols: layout.cols };
}

/**
 * Always draws the full configured page density (`grid.pageColumns` x
 * `grid.pageRows`), regardless of how many cells this page's content actually
 * uses — the orientation grid marks out the whole page, not just the occupied
 * area.
 */
function drawBackgroundGrid(doc: PDFKit.PDFDocument, grid: VirtualGrid, scale: number): void {
  const labelSize = scaled(9, scale);
  doc.save();
  doc.strokeColor("#e5e5e5").lineWidth(scaled(0.5, scale));

  for (let row = 0; row <= grid.pageRows; row++) {
    const y = grid.usable.y + row * grid.cellHeight;
    doc
      .moveTo(grid.usable.x, y)
      .lineTo(grid.usable.x + grid.pageColumns * grid.cellWidth, y)
      .stroke();
  }
  for (let col = 0; col <= grid.pageColumns; col++) {
    const x = grid.usable.x + col * grid.cellWidth;
    doc
      .moveTo(x, grid.usable.y)
      .lineTo(x, grid.usable.y + grid.pageRows * grid.cellHeight)
      .stroke();
  }

  doc.fillColor("#bbbbbb").fontSize(labelSize);
  for (let col = 1; col <= grid.pageColumns; col++) {
    const rect = grid.cellRect(1, col);
    doc.text(columnLabel(col), rect.x, grid.usable.y - labelSize * 1.5, {
      width: grid.cellWidth,
      align: "center",
    });
  }
  for (let row = 1; row <= grid.pageRows; row++) {
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
  layout: LayoutResult,
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
      .fillOpacity(0.35)
      .rect(rect.x, rect.y, rect.width, rect.height)
      .fillAndStroke("#f1f5f9", "#94a3b8");

    doc
      .fillOpacity(1)
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
  layout: LayoutResult,
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

/** Spreadsheet-style "page.cell" address of where a link leads, e.g. "2.A9". */
function cellReference(pageIndex: number, position: GridPosition): string {
  return `${pageIndex + 1}.${columnLabel(position.col)}${position.row}`;
}

/**
 * Draws cross-page edges as a real connector that runs from the node border
 * straight to the grid's edge (not a floating stub off in blank space), using
 * the edge's own color/width/dashed style so it visually reads as the same
 * connection continuing. The label sits right on the grid border where the
 * line ends, reads as "page.cell" of wherever the link actually leads (e.g.
 * "2.A9"), and is itself the clickable link — no decorative box, plain text.
 */
function drawContinuations(
  doc: PDFKit.PDFDocument,
  model: ParsedModel,
  continuations: ReturnType<typeof paginate>["continuations"],
  page: PageLayout,
  localLayoutsByPage: Map<number, LayoutResult>,
  grid: VirtualGrid,
  scale: number,
): void {
  const labelSize = scaled(8, scale);
  const dashLength = scaled(4, scale);
  const dashSpace = scaled(2.5, scale);
  const gridTop = grid.usable.y;
  const gridBottom = grid.usable.y + grid.pageRows * grid.cellHeight;
  const thisPageLayout = localLayoutsByPage.get(page.pageIndex) as LayoutResult;

  const drawConnector = (
    x: number,
    fromY: number,
    toY: number,
    style: typeof DEFAULT_EDGE_STYLE,
  ) => {
    doc.save().strokeColor(style.color).lineWidth(scaled(style.width, scale));
    if (style.dashed) {
      doc.dash(dashLength, { space: dashSpace });
    } else {
      doc.undash();
    }
    doc.moveTo(x, fromY).lineTo(x, toY).stroke();
    doc.restore();
  };

  for (const continuation of continuations) {
    const style =
      model.edges.find((edge) => edge.id === continuation.edgeId)?.style ?? DEFAULT_EDGE_STYLE;

    if (continuation.fromPage === page.pageIndex) {
      const position = thisPageLayout.positions.get(continuation.sourceNodeId);
      const targetPosition = localLayoutsByPage
        .get(continuation.toPage)
        ?.positions.get(continuation.targetNodeId);
      if (!position || !targetPosition) continue;
      const rect = grid.nodeRect(position.row, position.col);
      const x = rect.x + rect.width / 2;
      drawConnector(x, rect.y + rect.height, gridBottom, style);
      drawContinuationLabel(
        doc,
        cellReference(continuation.toPage, targetPosition),
        x,
        gridBottom,
        "below",
        labelSize,
        continuation.toPage,
      );
    }

    if (continuation.toPage === page.pageIndex) {
      const position = thisPageLayout.positions.get(continuation.targetNodeId);
      const sourcePosition = localLayoutsByPage
        .get(continuation.fromPage)
        ?.positions.get(continuation.sourceNodeId);
      if (!position || !sourcePosition) continue;
      const rect = grid.nodeRect(position.row, position.col);
      const x = rect.x + rect.width / 2;
      drawConnector(x, gridTop, rect.y, style);
      drawContinuationLabel(
        doc,
        cellReference(continuation.fromPage, sourcePosition),
        x,
        gridTop,
        "above",
        labelSize,
        continuation.fromPage,
      );
    }
  }
}

/** Centers a plain black, boxless clickable label on `x`, at the grid edge `edgeY`. */
function drawContinuationLabel(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  edgeY: number,
  placement: "above" | "below",
  labelSize: number,
  targetPage: number,
): void {
  doc.fontSize(labelSize);
  const width = doc.widthOfString(text);
  const boxX = x - width / 2;
  const boxY = placement === "below" ? edgeY : edgeY - labelSize;

  doc
    .save()
    .fillColor("#000000")
    .fontSize(labelSize)
    .text(text, boxX, boxY, { width, align: "center", lineBreak: false });
  doc.restore();

  doc.link(boxX, boxY, width, labelSize, targetPage, { Border: [0, 0, 0] });
}
