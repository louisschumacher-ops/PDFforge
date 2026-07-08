export interface ParsedNode {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface ParsedEdge {
  id: string;
  source: string;
  target: string;
}

export interface ParsedGroup {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface ParsedModel {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  groups: ParsedGroup[];
}

interface RawNode {
  id: string;
  type?: string;
  label?: string;
  data?: Record<string, unknown>;
  // position/x/y intentionally not read
}

interface RawEdge {
  id: string;
  source: string;
  target: string;
}

interface RawGroup {
  id: string;
  label?: string;
  nodeIds?: string[];
}

interface RawExport {
  nodes?: RawNode[];
  edges?: RawEdge[];
  groups?: RawGroup[];
}

/**
 * Parses a NodeEditor JSON export into the logical domain model.
 * Editor layout fields (x/y/position) are never read.
 */
export function parse(raw: unknown): ParsedModel {
  const source = raw as RawExport;

  const nodes: ParsedNode[] = (source.nodes ?? []).map((node) => ({
    id: node.id,
    type: node.type ?? "unknown",
    label: node.label ?? node.id,
    metadata: node.data ?? {},
  }));

  const edges: ParsedEdge[] = (source.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));

  const groups: ParsedGroup[] = (source.groups ?? []).map((group) => ({
    id: group.id,
    label: group.label ?? group.id,
    nodeIds: group.nodeIds ?? [],
  }));

  return { nodes, edges, groups };
}
