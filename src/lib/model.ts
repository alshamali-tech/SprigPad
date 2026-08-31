/* BranchPad core model — pure TypeScript, zero framework imports. */

export type NodeShape = "rounded" | "rect" | "pill";
export type NodeSize = "sm" | "md" | "lg";
export type LayoutDirection = "both" | "right" | "down";
export type EdgeStyle = "bezier" | "straight" | "elbow";
export type ThemePref = "light" | "dark" | "system";

export interface NodeStyle {
  bg: string;
  fg: string;
  border: string | null;
  shape: NodeShape;
  size: NodeSize;
  bold: boolean;
  italic: boolean;
  icon: string | null;
}

export interface MapNode {
  id: string;
  text: string;
  style: NodeStyle;
  notes: string | null;
  link: string | null;
  collapsed: boolean;
  children: MapNode[];
}

export interface MindMap {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  direction: LayoutDirection;
  edgeStyle: EdgeStyle;
  root: MapNode;
  viewport: { x: number; y: number; zoom: number };
}

export interface MapRecord extends MindMap {
  nodeCount: number;
}

export const APP_NAME = "BranchPad";
export const APP_VERSION = "1.0.0";
export const EXPORT_SCHEMA_VERSION = "1.0.0";
export const KOFI_URL = "https://ko-fi.com/branchpad";
export const BMC_URL = "https://buymeacoffee.com/branchpad";
export const MAX_NODES = 10000;
export const UNDO_LIMIT = 50;
export const AUTOSAVE_MS = 1600;
export const SYNC_CHANNEL = "branchpad-sync";

export const NODE_COLORS: { bg: string; fg: string; name: string }[] = [
  { bg: "#2563eb", fg: "#ffffff", name: "Cobalt" },
  { bg: "#0891b2", fg: "#ffffff", name: "Cyan" },
  { bg: "#0d9488", fg: "#ffffff", name: "Teal" },
  { bg: "#16a34a", fg: "#ffffff", name: "Green" },
  { bg: "#65a30d", fg: "#ffffff", name: "Moss" },
  { bg: "#f59e0b", fg: "#221605", name: "Amber" },
  { bg: "#ea580c", fg: "#ffffff", name: "Ember" },
  { bg: "#dc2626", fg: "#ffffff", name: "Signal" },
  { bg: "#db2777", fg: "#ffffff", name: "Magenta" },
  { bg: "#7c3aed", fg: "#ffffff", name: "Violet" },
  { bg: "#475569", fg: "#ffffff", name: "Slate" },
  { bg: "#1b2430", fg: "#ffffff", name: "Ink" },
];

export const ROOT_STYLE: NodeStyle = {
  bg: "#1b2430",
  fg: "#ffffff",
  border: null,
  shape: "rounded",
  size: "lg",
  bold: true,
  italic: false,
  icon: null,
};

export const defaultStyle = (branchColor?: { bg: string; fg: string }, depth = 1): NodeStyle => {
  if (!branchColor) return { ...ROOT_STYLE };
  if (depth <= 1) {
    return { bg: branchColor.bg, fg: branchColor.fg, border: null, shape: "rounded", size: "md", bold: true, italic: false, icon: null };
  }
  return {
    bg: branchColor.bg + "1c",
    fg: branchColor.bg,
    border: branchColor.bg + "55",
    shape: "rounded",
    size: "md",
    bold: false,
    italic: false,
    icon: null,
  };
};

/* ---- id generation (nanoid-style, no dependency) ---- */
const ID_ALPHABET = "useandom26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
export function uid(len = 10): string {
  const bytes = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(len)) : null;
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ID_ALPHABET[(bytes ? bytes[i] : Math.floor(Math.random() * 256)) & 63];
  }
  return out;
}

export function makeNode(text: string, style: NodeStyle, children: MapNode[] = []): MapNode {
  return { id: uid(), text, style, notes: null, link: null, collapsed: false, children };
}

export function makeMap(title: string, rootText = "Central idea"): MindMap {
  const now = new Date().toISOString();
  return {
    id: uid(12),
    title,
    createdAt: now,
    updatedAt: now,
    direction: "both",
    edgeStyle: "bezier",
    root: makeNode(rootText, { ...ROOT_STYLE }),
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/* ---- keyboard shortcuts (documentation + bindings) ---- */
export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Tab"], label: "Add child node" },
  { keys: ["Enter"], label: "Add sibling node" },
  { keys: ["F2"], label: "Edit selected node" },
  { keys: ["Del"], label: "Delete node" },
  { keys: ["Space"], label: "Collapse / expand" },
  { keys: ["⌘/Ctrl", "Z"], label: "Undo" },
  { keys: ["⌘/Ctrl", "⇧", "Z"], label: "Redo" },
  { keys: ["⌘/Ctrl", "C"], label: "Copy branch" },
  { keys: ["⌘/Ctrl", "V"], label: "Paste branch" },
  { keys: ["Alt", "↑↓"], label: "Reorder among siblings" },
  { keys: ["←→↑↓"], label: "Walk the tree" },
  { keys: ["⌘/Ctrl", "0"], label: "Fit map to screen" },
];

export const fmtBytes = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const relTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
