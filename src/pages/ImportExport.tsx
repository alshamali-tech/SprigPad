import { useCallback, useRef, useState } from "react";
import type { MindMap } from "../lib/model";
import { fmtBytes } from "../lib/model";
import { countNodes } from "../lib/mapEngine";
import { parseFile, ImportError } from "../lib/importers";
import { exportMap, exportAllJson, type ExportFormat } from "../lib/exporters";
import { saveMap } from "../lib/db";
import { useApp, useUI } from "../store";
import { navigate } from "../hooks";
import { Badge, Button, cn } from "../components/ui";
import { IAlert, ICheck, ICode, IDownload, IFile, IUpload, IX, IArrowRight } from "../components/icons";

const FORMATS: { fmt: ExportFormat; ext: string; name: string; desc: string }[] = [
  { fmt: "json", ext: ".json", name: "JSON backup", desc: "The real backup — full fidelity: styles, notes, links, layout." },
  { fmt: "opml", ext: ".opml", name: "OPML", desc: "Universal outline format for outliners and other map tools." },
  { fmt: "markdown", ext: ".md", name: "Markdown", desc: "Nested bullet list — drops straight into docs and wikis." },
  { fmt: "svg", ext: ".svg", name: "SVG", desc: "Crisp vector image of the laid-out map." },
  { fmt: "png", ext: ".png", name: "PNG", desc: "2× resolution raster for slides and chat." },
  { fmt: "pdf", ext: ".pdf", name: "PDF", desc: "Print-ready page, sized to the map." },
];

export default function ImportExportPage() {
  const maps = useApp((s) => s.maps);
  const refresh = useApp((s) => s.refresh);
  const theme = useUI((s) => s.theme);
  const toast = useUI((s) => s.toast);
  const [selected, setSelected] = useState<string>("all");
  const [busyFmt, setBusyFmt] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<{ filename: string; size: number; maps: MindMap[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async (fmt: ExportFormat) => {
    setBusyFmt(fmt);
    try {
      if (selected === "all") {
        if (fmt !== "json") throw new Error("Use a single map for this format.");
        exportAllJson(maps, theme);
      } else {
        const rec = maps.find((m) => m.id === selected);
        if (!rec) throw new Error("Map not found.");
        const { nodeCount: _n, ...map } = rec;
        await exportMap(map, fmt, theme);
      }
      localStorage.setItem("bp-last-export", String(Date.now()));
      toast("success", "Export complete", fmt === "json" && selected === "all" ? `All ${maps.length} maps bundled into one backup file.` : "File downloaded — that's your portable copy.");
    } catch {
      toast("error", "Export failed", "This browser refused the render. JSON always works — try that.");
    } finally {
      setBusyFmt(null);
    }
  };

  const readFile = useCallback(
    async (file: File) => {
      setError(null);
      setPending(null);
      if (file.size > 8 * 1024 * 1024) {
        setError("That file is over 8 MB — mind map files are usually far smaller. Double-check it's the right one.");
        return;
      }
      setReading(true);
      try {
        const text = await file.text();
        const parsed = parseFile(file.name, text);
        setPending({ filename: file.name, size: file.size, maps: parsed });
      } catch (e) {
        setError(e instanceof ImportError ? e.message : "Could not read that file. Accepted: .json, .opml, .md, .mm, .txt");
      } finally {
        setReading(false);
      }
    },
    []
  );

  const importPending = async () => {
    if (!pending) return;
    try {
      for (const m of pending.maps) {
        // fresh map id to avoid clobbering an existing map with the same id
        await saveMap({ ...m, id: Math.random().toString(36).slice(2, 14), updatedAt: new Date().toISOString() });
      }
      localStorage.setItem("bp-has-used", "1");
      await refresh();
      toast("success", `Imported ${pending.maps.length} map${pending.maps.length > 1 ? "s" : ""}`, "Restored from " + pending.filename + ". Welcome back.");
      setPending(null);
      navigate("/app");
    } catch {
      toast("error", "Import failed at the save step", "The file parsed fine but the browser refused the write (storage may be full).");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">Your data, in your hands</p>
          <h1 className="mt-2 font-display font-extrabold tracking-tight text-2xl sm:text-3xl">Import &amp; export</h1>
          <p className="text-sm text-muted mt-1.5">The .json backup is the source of truth — the browser cache is just a convenience.</p>
        </div>
        <Button variant="ghost" className="ml-auto" onClick={() => navigate("/app")}>← Back to dashboard</Button>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6 items-start">
        {/* ---------- export ---------- */}
        <section className="rounded-xl border border-line bg-surface shadow-card p-5">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><IDownload size={18} className="text-accent" /> Export</h2>
          <div className="mt-4">
            <label htmlFor="export-map" className="font-mono text-[10px] uppercase tracking-widest text-faint block mb-1.5">What to export</label>
            <select
              id="export-map"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="all">All maps — one backup file ({maps.length})</option>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>{m.title} · {m.nodeCount} nodes</option>
              ))}
            </select>
          </div>
          <div className="mt-4 space-y-2">
            {FORMATS.map((f) => {
              const disabled = selected === "all" && f.fmt !== "json";
              return (
                <div key={f.fmt} className={cn("flex items-center gap-3 rounded-lg border border-line p-3 transition-all", !disabled && "hover:border-linestrong hover:bg-sunken/50", disabled && "opacity-45")}>
                  <span className="font-mono text-[11px] font-bold text-accent bg-accentsoft rounded-md px-2 py-1 w-14 text-center shrink-0">{f.ext}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{f.name}</p>
                    <p className="text-xs text-muted leading-snug">{f.desc}</p>
                  </div>
                  <Button size="sm" onClick={() => void doExport(f.fmt)} disabled={disabled || busyFmt !== null}>
                    {busyFmt === f.fmt ? "…" : "Save"}
                  </Button>
                </div>
              );
            })}
          </div>
          {selected === "all" && <p className="mt-3 text-[11px] text-faint">Image formats export one map at a time — pick a single map above to enable them.</p>}
        </section>

        {/* ---------- import ---------- */}
        <section className="rounded-xl border border-line bg-surface shadow-card p-5">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><IUpload size={18} className="text-accent" /> Import</h2>
          <div
            className={cn(
              "mt-4 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer",
              dragOver ? "border-accent bg-accentsoft scale-[1.01]" : "border-line hover:border-linestrong hover:bg-sunken/40"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void readFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            aria-label="Choose a file to import"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".json,.opml,.md,.mm,.txt,application/json,text/xml,text/markdown,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ""; }} />
            {reading ? (
              <p className="font-mono text-xs text-muted">reading file…</p>
            ) : (
              <>
                <IFile size={28} className="mx-auto text-faint" />
                <p className="mt-3 text-sm font-semibold text-ink">Drop a file here, or click to browse</p>
                <p className="mt-1 font-mono text-[11px] text-faint">.json · .opml · .md · .mm (FreeMind) · .txt</p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3.5 flex items-start gap-2.5" role="alert">
              <IAlert size={16} className="text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-danger">Import rejected</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{error}</p>
                <p className="text-[11px] text-faint mt-1">Your existing maps were not touched.</p>
              </div>
            </div>
          )}

          {pending && (
            <div className="mt-4 rounded-lg border border-ok/40 bg-ok/5 p-3.5">
              <p className="text-sm font-semibold text-ink flex items-center gap-2"><ICheck size={15} className="text-ok" /> File looks good</p>
              <p className="font-mono text-[11px] text-faint mt-1">{pending.filename} · {fmtBytes(pending.size)}</p>
              <ul className="mt-2.5 space-y-1.5">
                {pending.maps.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted">
                    <Badge tone="accent">{countNodes(m.root)} nodes</Badge>
                    <span className="truncate">{m.title}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3.5 flex gap-2">
                <Button variant="primary" size="sm" onClick={() => void importPending()}>
                  Import {pending.maps.length} map{pending.maps.length > 1 ? "s" : ""} <IArrowRight size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPending(null)}><IX size={14} /> Discard</Button>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-lg bg-sunken/60 border border-line p-3.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint mb-2">Also accepted</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <span className="flex items-center gap-1.5"><ICode size={13} className="text-accent" /> FreeMind / Freeplane .mm</span>
              <span className="flex items-center gap-1.5"><ICode size={13} className="text-accent" /> OPML from outliners</span>
              <span className="flex items-center gap-1.5"><ICode size={13} className="text-accent" /> Markdown outlines</span>
            </div>
            <p className="text-[11px] text-faint mt-2.5 leading-relaxed">
              Version rule: older SprigPad files are migrated forward automatically; files from a newer major version are rejected rather than risked.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
