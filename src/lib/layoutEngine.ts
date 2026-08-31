/* Pure auto-layout engine: measures nodes and lays the tree out in 2D. */
import type { EdgeStyle, LayoutDirection, MapNode } from "./model";

export interface LaidNode {
  id: string;
  node: MapNode;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  lines: string[];
}

export interface LayoutResult {
  positions: Map<string, LaidNode>;
  edges: { from: LaidNode; to: LaidNode }[];
  bbox: { x: number; y: number; w: number; h: number };
}

const FONT_SIZE = { sm: 12, md: 14, lg: 17 } as const;
const LINE_H = { sm: 17, md: 20, lg: 24 } as const;
const PAD_X = { sm: 12, md: 14, lg: 20 } as const;
const PAD_Y = { sm: 8, md: 9, lg: 13 } as const;
const MAX_W = { sm: 170, md: 210, lg: 240 } as const;

export function measureNode(node: MapNode, isRoot: boolean): { w: number; h: number; lines: string[] } {
  const s = node.style;
  const size = isRoot ? "lg" : s.size;
  const fontSize = isRoot ? 18 : FONT_SIZE[size];
  const lineH = isRoot ? 26 : LINE_H[size];
  const padX = isRoot ? 24 : PAD_X[size];
  const padY = isRoot ? 16 : PAD_Y[size];
  const maxW = isRoot ? 260 : MAX_W[size];
  const charW = fontSize * (s.bold ? 0.6 : 0.55);

  const text = node.text || "Untitled";
  const words = text.split(/\s+/);
  const maxChars = Math.max(6, Math.floor((maxW - padX * 2) / charW));
  const lines: string[] = [];
  let line = "";
  for (const raw of words) {
    const word = raw.length > maxChars ? raw.slice(0, maxChars) + "…" : raw;
    if ((line + " " + word).trim().length <= maxChars) {
      line = (line + " " + word).trim();
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const finalLines = lines.length ? lines : ["Untitled"];
  const widest = Math.max(...finalLines.map((l) => l.length));
  const w = Math.min(maxW, Math.max(isRoot ? 150 : 72, Math.ceil(widest * charW + (s.icon ? fontSize + 6 : 0) + padX * 2)));
  const h = Math.ceil(finalLines.length * lineH + padY * 2);
  return { w, h, lines: finalLines };
}

const GAP_DEPTH = 56; // spacing between depth levels
const GAP_BREADTH = 14; // spacing between sibling slots

interface Ctx {
  positions: Map<string, LaidNode>;
  depthSize: number[];
  cursor: number;
  edges: { from: LaidNode; to: LaidNode }[];
  down: boolean;
}

const bSize = (p: LaidNode, down: boolean) => (down ? p.w : p.h);
const dSize = (p: LaidNode, down: boolean) => (down ? p.h : p.w);

function lay(node: MapNode, depth: number, ctx: Ctx): LaidNode {
  const isRoot = depth === 0;
  const { w, h, lines } = measureNode(node, isRoot);
  const laid: LaidNode = { id: node.id, node, x: 0, y: 0, w, h, depth, lines };
  ctx.positions.set(node.id, laid);
  ctx.depthSize[depth] = Math.max(ctx.depthSize[depth] ?? 0, dSize(laid, ctx.down));

  const visible = node.collapsed ? [] : node.children;
  if (visible.length === 0) {
    const b = ctx.cursor;
    ctx.cursor += bSize(laid, ctx.down) + GAP_BREADTH;
    place(laid, b, ctx);
  } else {
    const kids = visible.map((c) => lay(c, depth + 1, ctx));
    const c0 = kids[0];
    const c1 = kids[kids.length - 1];
    const center = (bPos(c0, ctx) + bSize(c0, ctx.down) / 2 + (bPos(c1, ctx) + bSize(c1, ctx.down) / 2)) / 2;
    place(laid, center - bSize(laid, ctx.down) / 2, ctx);
    for (const k of kids) ctx.edges.push({ from: laid, to: k });
  }
  return laid;
}

const bPos = (p: LaidNode, ctx: Ctx) => (ctx.down ? p.x : p.y);
function place(p: LaidNode, b: number, ctx: Ctx) {
  if (ctx.down) p.x = b;
  else p.y = b;
}

function assignDepth(ctx: Ctx, dir: 1 | -1, x0: number) {
  const ds: number[] = [];
  let acc = x0;
  for (let d = 0; d < ctx.depthSize.length; d++) {
    ds[d] = acc;
    acc += dir * ((ctx.depthSize[d] ?? 0) + GAP_DEPTH);
  }
  ctx.positions.forEach((p) => {
    const d = ds[p.depth];
    if (ctx.down) p.y = d;
    else p.x = dir === 1 ? d : d - p.w;
  });
}

function bboxOf(positions: Map<string, LaidNode>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  positions.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  });
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 400, h: 300 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function subtreeLeaves(n: MapNode): number {
  if (n.collapsed || n.children.length === 0) return 1;
  return n.children.reduce((a, c) => a + subtreeLeaves(c), 0);
}

function dedupe(edges: { from: LaidNode; to: LaidNode }[]) {
  const seen = new Set<string>();
  return edges.filter((e) => {
    const k = e.from.id + "→" + e.to.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function layHalf(root: MapNode, kids: MapNode[], down: boolean) {
  const ctx: Ctx = { positions: new Map(), depthSize: [], cursor: 0, edges: [], down };
  const fake: MapNode = { ...root, children: kids, collapsed: false };
  const laidRoot = lay(fake, 0, ctx);
  return { ctx, laidRoot };
}

export function layoutMap(root: MapNode, direction: LayoutDirection): LayoutResult {
  const down = direction === "down";

  if (direction === "both") {
    // Balance children into right/left halves by leaf weight.
    const right: MapNode[] = [];
    const left: MapNode[] = [];
    let rw = 0, lw = 0;
    const kids = root.collapsed ? [] : root.children;
    for (const c of kids) {
      const w = subtreeLeaves(c);
      if (lw <= rw) {
        right.push(c);
        rw += w;
      } else {
        left.push(c);
        lw += w;
      }
    }
    const R = layHalf(root, right, false);
    const L = layHalf(root, left, false);
    assignDepth(R.ctx, 1, 0);
    assignDepth(L.ctx, 1, 0);
    // mirror the left half across the root's left edge so both sides stay symmetric
    const rootW = R.laidRoot.w;
    L.ctx.positions.forEach((p) => {
      p.x = rootW - (p.x + p.w);
    });

    const positions = new Map<string, LaidNode>();
    const rootLaid = R.laidRoot;
    positions.set(rootLaid.id, rootLaid);
    R.ctx.positions.forEach((p) => {
      if (p.id !== root.id) positions.set(p.id, p);
    });
    L.ctx.positions.forEach((p) => {
      if (p.id !== root.id) positions.set(p.id, p);
    });

    // center root vertically on the combined extents
    let minY = Infinity, maxY = -Infinity;
    positions.forEach((p) => {
      if (p.id === root.id) return;
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + p.h);
    });
    if (Number.isFinite(minY)) rootLaid.y = (minY + maxY) / 2 - rootLaid.h / 2;

    const edges: { from: LaidNode; to: LaidNode }[] = [];
    for (const e of [...R.ctx.edges, ...L.ctx.edges]) {
      edges.push(e.from.id === root.id ? { from: rootLaid, to: e.to } : e);
    }
    return { positions, edges: dedupe(edges), bbox: bboxOf(positions) };
  }

  const ctx: Ctx = { positions: new Map(), depthSize: [], cursor: 0, edges: [], down };
  lay(root, 0, ctx);
  assignDepth(ctx, 1, 0);
  return { positions: ctx.positions, edges: dedupe(ctx.edges), bbox: bboxOf(ctx.positions) };
}

export function edgePath(from: LaidNode, to: LaidNode, direction: LayoutDirection, style: EdgeStyle): string {
  if (direction === "down") {
    const x1 = from.x + from.w / 2, y1 = from.y + from.h;
    const x2 = to.x + to.w / 2, y2 = to.y;
    if (style === "straight") return `M ${x1} ${y1} L ${x2} ${y2}`;
    if (style === "elbow") return `M ${x1} ${y1} L ${x1} ${(y1 + y2) / 2} L ${x2} ${(y1 + y2) / 2} L ${x2} ${y2}`;
    return `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
  }
  const toLeft = to.x + to.w / 2 < from.x + from.w / 2;
  const x1 = toLeft ? from.x : from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = toLeft ? to.x + to.w : to.x;
  const y2 = to.y + to.h / 2;
  if (style === "straight") return `M ${x1} ${y1} L ${x2} ${y2}`;
  if (style === "elbow") return `M ${x1} ${y1} L ${(x1 + x2) / 2} ${y1} L ${(x1 + x2) / 2} ${y2} L ${x2} ${y2}`;
  return `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
}
