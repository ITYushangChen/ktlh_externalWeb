import type { PathEdge, PathNode } from "@/types/delivery";

/** 从边列表构建有序路径（从入度为 0 的节点开始） */
export function orderPathNodes(nodes: PathNode[], edges: PathEdge[]): PathNode[] {
  if (nodes.length === 0) return [];
  if (edges.length === 0) {
    return [...nodes].sort((a, b) => a.x - b.x || a.y - b.y);
  }

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const byKey = new Map(nodes.map((n) => [n.node_key, n]));

  for (const n of nodes) {
    inDegree.set(n.node_key, 0);
    adj.set(n.node_key, []);
  }

  for (const e of edges) {
    adj.get(e.from_key)?.push(e.to_key);
    inDegree.set(e.to_key, (inDegree.get(e.to_key) ?? 0) + 1);
  }

  const start = [...inDegree.entries()].find(([, d]) => d === 0)?.[0];
  if (!start) return [...nodes];

  const ordered: PathNode[] = [];
  const visited = new Set<string>();
  let current: string | undefined = start;

  while (current && !visited.has(current)) {
    visited.add(current);
    const node = byKey.get(current);
    if (node) ordered.push(node);
    const nexts: string[] = adj.get(current) ?? [];
    current = nexts.find((k) => !visited.has(k));
  }

  for (const n of nodes) {
    if (!visited.has(n.node_key)) ordered.push(n);
  }

  return ordered;
}

export function pathPolyline(nodes: PathNode[]): { x: number; y: number }[] {
  return nodes.map((n) => ({ x: n.x, y: n.y }));
}
