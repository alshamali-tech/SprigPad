/* Client-side import engines with strict validation. Nothing is written until the caller decides. */
import type { MapNode, MindMap, NodeStyle } from "./model";
import { APP_NAME, ROOT_STYLE, defaultStyle, makeMap, uid } from "./model";
import { branchColor } from "./mapEngine";

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

const norm = (s: Partial<NodeStyle> | undefined, fallback: NodeStyle): NodeStyle => ({
  bg: typeof s?.bg === "string" ? s.bg : fallback.bg,
  fg: typeof s?.fg === "string" ? s.fg : fallback.fg,
  border: typeof s?.border === "string" ? s.border : null,
  shape: s?.shape === "rect" || s?.shape === "pill" ? s.shape : "rounded",
  size: s?.size === "sm" || s?.size === "lg" ? s.size : "md",
  bold: !!s?.bold,
  italic: !!s?.italic,
  icon: typeof s?.icon === "string" ? s.icon : null,
});

function normNode(raw: unknown, depth: number): MapNode {
  if (!raw || typeof raw !== "object") throw new ImportError("Map node is malformed.");
  const r = raw as Record<string, unknown>;
  const childrenRaw = Array.isArray(r.children) ? r.children : [];
  const branch = depth === 1 ? branchColor(0) : undefined;
  const fallback = depth === 0 ? ROOT_STYLE : defaultStyle(branch ?? { bg: "#2563eb", fg: "#ffffff" }, depth);
  return {
    id: typeof r.id === "string" ? r.id : uid(),
    text: typeof r.text === "string" && r.text.trim() ? r.text.slice(0, 500) : "Untitled",
    style: norm(r.style as Partial<NodeStyle> | undefined, fallback),
    notes: typeof r.notes === "string" ? r.notes : null,
    link: typeof r.link === "string" ? r.link : null,
    collapsed: !!r.collapsed,
    children: childrenRaw.map((c) => normNode(c, depth + 1)),
  };
}

function normMap(raw: unknown): MindMap {
  if (!raw || typeof raw !== "object") throw new ImportError("Map entry is malformed.");
  const r = raw as Record<string, unknown>;
  const base = makeMap(typeof r.title === "string" && r.title.trim() ? r.title.slice(0, 120) : "Imported map");
  const root = normNode(r.root, 0);
  return {
    ...base,
    id: typeof r.id === "string" && r.id ? r.id : base.id,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : base.createdAt,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
    direction: r.direction === "right" || r.direction === "down" ? r.direction : "both",
    edgeStyle: r.edgeStyle === "straight" || r.edgeStyle === "elbow" ? r.edgeStyle : "bezier",
    root,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/** Compare "a.b.c" versions; returns -1 | 0 | 1. */
export function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

export function fromJson(text: string): { maps: MindMap[]; migrated: boolean } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("Not valid JSON. The file appears to be corrupted.");
  }
  if (!data || typeof data !== "object") throw new ImportError("Unsupported JSON structure.");
  const d = data as Record<string, unknown>;

  // Single-map export (lenient) or envelope export.
  if (d.root) return { maps: [normMap(d)], migrated: false };
  if (!Array.isArray(d.maps)) throw new ImportError(`Expected a ${APP_NAME} backup file (missing "maps" array).`);
  if (d.app && d.app !== APP_NAME) throw new ImportError(`This JSON was created by "${String(d.app)}", not ${APP_NAME}.`);

  const version = typeof d.version === "string" ? d.version : "1.0.0";
  if (cmpVersion(version, "2.0.0") >= 0)
    throw new ImportError(`This file requires ${APP_NAME} v${version}. Please update the app and try again.`);
  const migrated = cmpVersion(version, "1.0.0") < 0;
  const maps = (d.maps as unknown[]).map(normMap);
  if (maps.length === 0) throw new ImportError("The file contains no maps.");
  return { maps, migrated };
}

/* ---------------- OPML ---------------- */
function outlineToNode(el: Element, depth: number): MapNode {
  const text = el.getAttribute("text") ?? el.getAttribute("title") ?? "Untitled";
  const branch = depth === 1 ? branchColor(Array.from(el.parentElement?.children ?? []).indexOf(el)) : undefined;
  const node: MapNode = {
    id: uid(),
    text: text.slice(0, 500),
    style: depth === 0 ? { ...ROOT_STYLE } : defaultStyle(branch ?? { bg: "#2563eb", fg: "#ffffff" }, depth),
    notes: el.getAttribute("_note") ?? null,
    link: el.getAttribute("link") ?? null,
    collapsed: false,
    children: [],
  };
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === "outline") node.children.push(outlineToNode(child, depth + 1));
  }
  return node;
}

export function fromOpml(text: string): MindMap {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.querySelector("parsererror")) throw new ImportError("Not valid OPML/XML.");
  const body = doc.querySelector("body");
  const first = body?.querySelector(":scope > outline");
  if (!first) throw new ImportError("OPML has no outline entries.");
  const title = doc.querySelector("head > title")?.textContent?.trim() || "Imported OPML";
  const map = makeMap(title.slice(0, 120));
  map.root = outlineToNode(first, 0);
  return map;
}

/* ---------------- Markdown ---------------- */
export function fromMarkdown(text: string): MindMap {
  const lines = text.split(/\r?\n/);
  let title = "Imported notes";
  type Frame = { indent: number; node: MapNode };
  const root = makeMap(title).root;
  root.text = title;
  const stack: Frame[] = [{ indent: -1, node: root }];

  for (const raw of lines) {
    const h = raw.match(/^(#{1,6})\s+(.*)$/);
    const li = raw.match(/^(\s*)[-*+]\s+(.*)$/);
    if (h) {
      if (h[1].length === 1) {
        title = h[2].trim().slice(0, 120);
        root.text = title;
        continue;
      }
      const node = { ...root, id: uid(), text: h[2].trim().slice(0, 500), children: [], style: defaultStyle(branchColor(stack.length), 1) };
      root.children.push(node);
      stack.length = 1;
      stack.push({ indent: -0.5, node });
      continue;
    }
    if (!li) continue;
    const indent = li[1].replace(/\t/g, "  ").length;
    const textContent = li[2].replace(/\s*—\s*\[link\]\((.*)\)\s*$/, "").trim();
    if (!textContent || textContent.startsWith(">")) continue;
    const node: MapNode = {
      id: uid(),
      text: textContent.slice(0, 500),
      style: defaultStyle(branchColor(Math.max(0, root.children.length - (stack.length > 1 ? 1 : 0))), Math.min(2, stack.length)),
      notes: null,
      link: li[2].match(/\[link\]\((.*)\)/)?.[1] ?? null,
      collapsed: false,
      children: [],
    };
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent, node });
  }
  if (root.children.length === 0 && root.text === title && !lines.some((l) => l.trim())) {
    throw new ImportError("The Markdown file is empty.");
  }
  const map = makeMap(title);
  map.root = root;
  return map;
}

/* ---------------- FreeMind .mm ---------------- */
export function fromFreeMind(text: string): MindMap {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.querySelector("parsererror")) throw new ImportError("Not valid FreeMind XML.");
  const mapEl = doc.querySelector("map");
  const rootEl = mapEl?.querySelector(":scope > node");
  if (!mapEl || !rootEl) throw new ImportError("FreeMind file has no root node.");
  const fm = (el: Element, depth: number): MapNode => {
    const branch = depth === 1 ? branchColor(Array.from(el.parentElement?.children ?? []).filter((c) => c.tagName === "node").indexOf(el)) : undefined;
    const node: MapNode = {
      id: el.getAttribute("ID") ?? uid(),
      text: (el.getAttribute("TEXT") ?? "Untitled").slice(0, 500),
      style: depth === 0 ? { ...ROOT_STYLE } : defaultStyle(branch ?? { bg: "#2563eb", fg: "#ffffff" }, depth),
      notes: null,
      link: el.querySelector(":scope > arrowlink")?.getAttribute("DESTINATION") ?? null,
      collapsed: el.getAttribute("FOLDED") === "true",
      children: [],
    };
    for (const c of Array.from(el.children)) {
      if (c.tagName.toLowerCase() === "node") node.children.push(fm(c, depth + 1));
    }
    return node;
  };
  const map = makeMap("Imported FreeMind map");
  map.root = fm(rootEl, 0);
  map.title = map.root.text.slice(0, 120);
  return map;
}

/* ---------------- router ---------------- */
export type DetectedFormat = "json" | "opml" | "markdown" | "freemind";

export function detectFormat(filename: string, content: string): DetectedFormat {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const head = content.trimStart().slice(0, 200).toLowerCase();
  if (ext === "mm" || head.includes("<map") || head.includes("<!doctype map")) return "freemind";
  if (ext === "opml" || head.includes("<opml")) return "opml";
  if (ext === "json" || head.startsWith("{") || head.startsWith("[")) return "json";
  if (["md", "markdown", "txt"].includes(ext)) return "markdown";
  if (head.startsWith("<")) throw new ImportError("Unsupported XML format. Accepted: .json, .opml, .md, .mm, .txt");
  return "markdown";
}

export function parseFile(filename: string, content: string): MindMap[] {
  const format = detectFormat(filename, content);
  switch (format) {
    case "json":
      return fromJson(content).maps;
    case "opml":
      return [fromOpml(content)];
    case "freemind":
      return [fromFreeMind(content)];
    case "markdown":
      return [fromMarkdown(content)];
  }
}
