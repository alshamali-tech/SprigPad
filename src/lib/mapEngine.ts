/* Pure tree operations for mind maps. No framework imports. */
import type { MapNode } from "./model";
import { NODE_COLORS, defaultStyle, makeNode, uid } from "./model";

export const cloneTree = (n: MapNode): MapNode =>
  typeof structuredClone === "function" ? structuredClone(n) : (JSON.parse(JSON.stringify(n)) as MapNode);

export interface Found {
  node: MapNode;
  parent: MapNode | null;
  index: number;
  depth: number;
}

export function findNode(root: MapNode, id: string): Found | null {
  const walk = (n: MapNode, parent: MapNode | null, index: number, depth: number): Found | null => {
    if (n.id === id) return { node: n, parent, index, depth };
    for (let i = 0; i < n.children.length; i++) {
      const f = walk(n.children[i], n, i, depth + 1);
      if (f) return f;
    }
    return null;
  };
  return walk(root, null, 0, 0);
}

export function countNodes(n: MapNode): number {
  let c = 1;
  for (const ch of n.children) c += countNodes(ch);
  return c;
}

export function mapTitle(m: { title: string; root: MapNode }): string {
  return m.title.trim() || m.root.text.trim() || "Untitled map";
}

/** Color used for the i-th top-level branch (cycles through the palette). */
export const branchColor = (i: number) => NODE_COLORS[i % (NODE_COLORS.length - 1)];

export function addChild(root: MapNode, parentId: string, text = "New idea"): { root: MapNode; id: string } | null {
  const f = findNode(root, parentId);
  if (!f) return null;
  const branch = f.node.id === root.id ? branchColor(root.children.length) : undefined;
  const depth = f.depth + 1;
  const style = f.node.id === root.id ? defaultStyle(branch, 1) : defaultStyle(branch ?? resolveBranchColor(root, f.node), depth);
  const node = makeNode(text, style);
  f.node.collapsed = false;
  f.node.children.push(node);
  return { root, id: node.id };
}

export function addSibling(root: MapNode, id: string, text = "New idea"): { root: MapNode; id: string } | null {
  const f = findNode(root, id);
  if (!f || !f.parent) return addChild(root, root.id, text);
  const style = { ...f.node.style };
  const node = makeNode(text, style);
  f.parent.children.splice(f.index + 1, 0, node);
  return { root, id: node.id };
}

function resolveBranchColor(root: MapNode, n: MapNode): { bg: string; fg: string } {
  // walk up: find which top-level branch contains n
  const contains = (branch: MapNode): boolean => {
    const walk = (x: MapNode): boolean => x.id === n.id || x.children.some(walk);
    return walk(branch);
  };
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === n.id || contains(root.children[i])) return branchColor(i);
  }
  return NODE_COLORS[0];
}

export function removeNode(root: MapNode, id: string): { root: MapNode; parentId: string | null } | null {
  const f = findNode(root, id);
  if (!f || !f.parent) return null; // never delete the root
  f.parent.children.splice(f.index, 1);
  return { root, parentId: f.parent.id };
}

export function setText(root: MapNode, id: string, text: string): MapNode | null {
  const f = findNode(root, id);
  if (!f) return null;
  f.node.text = text.trim() || "Untitled";
  return root;
}

export function patchStyle(root: MapNode, id: string, patch: Partial<MapNode["style"]>): MapNode | null {
  const f = findNode(root, id);
  if (!f) return null;
  f.node.style = { ...f.node.style, ...patch };
  return root;
}

export function patchNode(root: MapNode, id: string, patch: Partial<Pick<MapNode, "notes" | "link" | "collapsed">>): MapNode | null {
  const f = findNode(root, id);
  if (!f) return null;
  Object.assign(f.node, patch);
  return root;
}

export function toggleCollapse(root: MapNode, id: string): MapNode | null {
  const f = findNode(root, id);
  if (!f || f.node.children.length === 0) return null;
  f.node.collapsed = !f.node.collapsed;
  return root;
}

export function reorder(root: MapNode, id: string, dir: -1 | 1): MapNode | null {
  const f = findNode(root, id);
  if (!f || !f.parent) return null;
  const arr = f.parent.children;
  const j = f.index + dir;
  if (j < 0 || j >= arr.length) return null;
  [arr[f.index], arr[j]] = [arr[j], arr[f.index]];
  return root;
}

/** Reassign every id in a subtree (used for paste / duplicate). */
export function reid(n: MapNode): MapNode {
  return { ...n, id: uid(), children: n.children.map(reid) };
}

export function duplicateMapData(m: { title: string; direction: MindMapDir; edgeStyle: EdgeKind; root: MapNode }) {
  return { root: reid(m.root) };
}
type MindMapDir = "both" | "right" | "down";
type EdgeKind = "bezier" | "straight" | "elbow";

/** Flatten visible nodes in depth-first order (for presentation mode). */
export function flattenDFS(root: MapNode): MapNode[] {
  const out: MapNode[] = [];
  const walk = (n: MapNode) => {
    out.push(n);
    if (!n.collapsed) n.children.forEach(walk);
  };
  walk(root);
  return out;
}

/** Path of ancestors from root to the node (inclusive). */
export function pathTo(root: MapNode, id: string): MapNode[] {
  const trail: MapNode[] = [];
  const walk = (n: MapNode): boolean => {
    trail.push(n);
    if (n.id === id) return true;
    for (const c of n.children) if (walk(c)) return true;
    trail.pop();
    return false;
  };
  walk(root);
  return trail;
}

/** Prune a tree to maxNodes (keeps breadth-first order) — used for thumbnails/previews. */
export function prune(root: MapNode, maxNodes: number, maxDepth = 4): MapNode {
  let count = 0;
  const walk = (n: MapNode, depth: number): MapNode => {
    count++;
    const children = depth >= maxDepth || count >= maxNodes ? [] : n.children.map((c) => (count < maxNodes ? walk(c, depth + 1) : null)).filter((x): x is MapNode => x !== null);
    return { ...n, collapsed: false, children };
  };
  return walk(root, 0);
}

/** Sibling navigation helpers. */
export function siblingOf(root: MapNode, id: string, dir: -1 | 1): string | null {
  const f = findNode(root, id);
  if (!f || !f.parent) return null;
  const j = f.index + dir;
  return f.parent.children[j]?.id ?? null;
}
export const firstChildOf = (n: MapNode): string | null => n.children[0]?.id ?? null;
