import type { ParsedEdge, ParsedModel, ParsedNode } from "../parser/index.js";

export interface LogicalGraph {
  rootId: string;
  nodes: Map<string, ParsedNode>;
  /** Children of each node, in edge-declaration order (deterministic sibling order). */
  children: Map<string, string[]>;
  /** Shortest-path depth from the root, root itself is depth 0. */
  depth: Map<string, number>;
  /** Node ids not reachable from the root, kept for diagnostics rather than dropped silently. */
  unreachable: string[];
}

export class MissingRootError extends Error {
  constructor(rootId: string) {
    super(`Root node "${rootId}" not found among parsed nodes.`);
    this.name = "MissingRootError";
  }
}

export class GraphCycleError extends Error {
  constructor(cyclePath: string[]) {
    super(`Cycle detected in graph reachable from root: ${cyclePath.join(" -> ")}`);
    this.name = "GraphCycleError";
  }
}

export interface BuildGraphOptions {
  rootId?: string;
}

/**
 * Builds the logical graph from the parsed domain model. Editor coordinates were
 * already discarded during parsing; this step only ever looks at `edges`.
 */
export function buildGraph(model: ParsedModel, options: BuildGraphOptions = {}): LogicalGraph {
  const rootId = options.rootId ?? "n1";

  const nodes = new Map<string, ParsedNode>(model.nodes.map((node) => [node.id, node]));
  if (!nodes.has(rootId)) {
    throw new MissingRootError(rootId);
  }

  const children = buildChildrenMap(model.edges);
  detectCycle(rootId, children);
  const depth = computeDepths(rootId, children);

  const unreachable = model.nodes.map((node) => node.id).filter((id) => !depth.has(id));

  return { rootId, nodes, children, depth, unreachable };
}

function buildChildrenMap(edges: ParsedEdge[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const siblings = children.get(edge.source) ?? [];
    siblings.push(edge.target);
    children.set(edge.source, siblings);
  }
  return children;
}

function computeDepths(rootId: string, children: Map<string, string[]>): Map<string, number> {
  const depth = new Map<string, number>([[rootId, 0]]);
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const currentDepth = depth.get(current) as number;
    for (const child of children.get(current) ?? []) {
      if (!depth.has(child)) {
        depth.set(child, currentDepth + 1);
        queue.push(child);
      }
    }
  }

  return depth;
}

/** DFS with an explicit recursion stack to find a cycle reachable from the root. */
function detectCycle(rootId: string, children: Map<string, string[]>): void {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  const visit = (nodeId: string): void => {
    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    for (const child of children.get(nodeId) ?? []) {
      if (stack.has(child)) {
        throw new GraphCycleError([...path, child]);
      }
      if (!visited.has(child)) {
        visit(child);
      }
    }

    stack.delete(nodeId);
    path.pop();
  };

  visit(rootId);
}
