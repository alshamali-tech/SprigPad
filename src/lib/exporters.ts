/* Client-side export engines. Everything runs in the browser. */
import { jsPDF } from "jspdf";
import type { MapNode, MapRecord, MindMap, ThemePref } from "./model";
import { APP_NAME, APP_VERSION, EXPORT_SCHEMA_VERSION } from "./model";
import { edgePath, layoutMap, measureNode } from "./layoutEngine";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const fileSafe = (s: string) => s.trim().replace(/[^\w\d-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "branchpad";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const downloadText = (filename: string, text: string, mime = "text/plain") =>
  downloadBlob(filename, new Blob([text], { type: mime + ";charset=utf-8" }));

/* ---------------- JSON ---------------- */
export interface ExportEnvelope {
  version: string;
  app: string;
  exportedAt: string;
  maps: MindMap[];
  settings: { theme: ThemePref };
}

export function mapsToJson(maps: MindMap[], theme: ThemePref): string {
  const envelope: ExportEnvelope = {
    version: EXPORT_SCHEMA_VERSION,
    app: APP_NAME,
    exportedAt: new Date().toISOString(),
    maps,
    settings: { theme },
  };
  return JSON.stringify(envelope, null, 2);
}

export const mapToJsonFile = (map: MindMap, theme: ThemePref) =>
  downloadText(`${fileSafe(map.title)}.branchpad.json`, mapsToJson([map], theme), "application/json");

/* ---------------- OPML ---------------- */
function opmlOutline(n: MapNode, indent: number): string {
  const pad = "  ".repeat(indent);
  const inner = n.children.map((c) => opmlOutline(c, indent + 1)).join("\n");
  const attrs = `text="${esc(n.text)}"` + (n.notes ? ` _note="${esc(n.notes)}"` : "") + (n.link ? ` link="${esc(n.link)}"` : "");
  return inner ? `${pad}<outline ${attrs}>\n${inner}\n${pad}</outline>` : `${pad}<outline ${attrs} />`;
}

export function toOpml(map: MindMap): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${esc(map.title)}</title>
    <ownerName>${APP_NAME}</ownerName>
    <dateCreated>${map.createdAt}</dateCreated>
  </head>
  <body>
${opmlOutline(map.root, 2)}
  </body>
</opml>`;
}

/* ---------------- Markdown ---------------- */
function mdLines(n: MapNode, depth: number, out: string[]) {
  out.push(`${"  ".repeat(depth)}- ${n.text}${n.link ? ` — [link](${n.link})` : ""}`);
  if (n.notes) out.push(`${"  ".repeat(depth + 1)}> ${n.notes.replace(/\n/g, " ")}`);
  n.children.forEach((c) => mdLines(c, depth + 1, out));
}

export function toMarkdown(map: MindMap): string {
  const out: string[] = [`# ${map.title}`, ""];
  map.root.children.forEach((c) => mdLines(c, 0, out));
  if (map.root.children.length === 0) out.push(`- ${map.root.text}`);
  out.push("", `_Exported from ${APP_NAME} v${APP_VERSION} — ${new Date().toLocaleString()}_`);
  return out.join("\n");
}

/* ---------------- SVG ---------------- */
const FONT_STACK = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_SIZE = { sm: 12, md: 14, lg: 17 } as const;

export function buildSvg(map: MindMap, opts: { pad?: number; background?: string } = {}): string {
  const pad = opts.pad ?? 48;
  const layout = layoutMap(map.root, map.direction);
  const { bbox } = layout;
  const W = bbox.w + pad * 2;
  const H = bbox.h + pad * 2;
  const ox = pad - bbox.x;
  const oy = pad - bbox.y;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(W)}" height="${Math.ceil(H)}" viewBox="0 0 ${Math.ceil(W)} ${Math.ceil(H)}">`
  );
  if (opts.background) parts.push(`<rect width="100%" height="100%" fill="${opts.background}"/>`);
  parts.push(`<g transform="translate(${ox},${oy})">`);

  for (const e of layout.edges) {
    parts.push(
      `<path d="${edgePath(e.from, e.to, map.direction, map.edgeStyle)}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`
    );
  }

  layout.positions.forEach((p) => {
    const isRoot = p.depth === 0;
    const s = p.node.style;
    const rx = s.shape === "pill" ? p.h / 2 : s.shape === "rect" ? 5 : 10;
    const x = p.x, y = p.y;
    parts.push(`<g>`);
    parts.push(
      `<rect x="${x}" y="${y}" width="${p.w}" height="${p.h}" rx="${rx}" fill="${s.bg}"${s.border ? ` stroke="${s.border}" stroke-width="1.5"` : ""}/>`
    );
    const fontSize = isRoot ? 18 : FONT_SIZE[s.size];
    const lineH = isRoot ? 24 : Math.round(fontSize * 1.35);
    const totalH = p.lines.length * lineH;
    const startY = y + p.h / 2 - totalH / 2 + lineH * 0.72;
    p.lines.forEach((line, i) => {
      parts.push(
        `<text x="${x + p.w / 2}" y="${startY + i * lineH}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="${s.bold || isRoot ? 700 : 400}" font-style="${s.italic ? "italic" : "normal"}" fill="${s.fg}">${esc(line)}</text>`
      );
    });
    if (p.node.collapsed && p.node.children.length > 0) {
      parts.push(
        `<circle cx="${x + p.w}" cy="${y + p.h / 2}" r="7" fill="${s.bg}" stroke="#94a3b8"/><text x="${x + p.w}" y="${y + p.h / 2 + 3.5}" text-anchor="middle" font-family="${FONT_STACK}" font-size="9" fill="${s.fg}">${p.node.children.length}</text>`
      );
    }
    parts.push(`</g>`);
  });

  parts.push(`</g>`, `<text x="${W - pad}" y="${H - pad / 2.4}" text-anchor="end" font-family="${FONT_STACK}" font-size="10" fill="#94a3b8">${APP_NAME} · ${esc(map.title)}</text>`, `</svg>`);
  return parts.join("\n");
}

export const mapToSvgFile = (map: MindMap) =>
  downloadText(`${fileSafe(map.title)}.svg`, buildSvg(map, { background: "#ffffff" }), "image/svg+xml");

/* ---------------- PNG ---------------- */
export async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const img = new Image();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not rasterize SVG"));
      img.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(img.width * scale);
    canvas.height = Math.ceil(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png")
    );
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function mapToPngFile(map: MindMap): Promise<void> {
  const svg = buildSvg(map, { background: "#ffffff" });
  const blob = await svgToPngBlob(svg);
  downloadBlob(`${fileSafe(map.title)}.png`, blob);
}

/* ---------------- PDF ---------------- */
export async function mapToPdfFile(map: MindMap): Promise<void> {
  const svg = buildSvg(map, { background: "#ffffff" });
  const png = await svgToPngBlob(svg, 2);
  const url = URL.createObjectURL(png);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("image load failed"));
      img.src = url;
    });
    const landscape = img.width >= img.height;
    const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "px", format: [img.width, img.height], hotfixes: ["px_scaling"] });
    pdf.addImage(img, "PNG", 0, 0, img.width, img.height);
    pdf.save(`${fileSafe(map.title)}.pdf`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------- OPML / MD downloads ---------------- */
export const mapToOpmlFile = (map: MindMap) => downloadText(`${fileSafe(map.title)}.opml`, toOpml(map), "text/x-opml");
export const mapToMarkdownFile = (map: MindMap) => downloadText(`${fileSafe(map.title)}.md`, toMarkdown(map), "text/markdown");

export type ExportFormat = "json" | "opml" | "markdown" | "svg" | "png" | "pdf";

export async function exportMap(map: MindMap, format: ExportFormat, theme: ThemePref): Promise<void> {
  switch (format) {
    case "json":
      return mapToJsonFile(map, theme);
    case "opml":
      return mapToOpmlFile(map);
    case "markdown":
      return mapToMarkdownFile(map);
    case "svg":
      return mapToSvgFile(map);
    case "png":
      return mapToPngFile(map);
    case "pdf":
      return mapToPdfFile(map);
  }
}

export const exportAllJson = (records: MapRecord[], theme: ThemePref) => {
  const maps: MindMap[] = records.map(({ nodeCount: _n, ...m }) => m);
  downloadText(`branchpad-backup-${new Date().toISOString().slice(0, 10)}.json`, mapsToJson(maps, theme), "application/json");
};

/* measure re-export so renderers can share metrics */
export { measureNode };
