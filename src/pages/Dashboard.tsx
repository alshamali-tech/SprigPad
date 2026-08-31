import { useEffect, useMemo, useState } from "react";
import type { MapRecord, MindMap } from "../lib/model";
import { fmtBytes, relTime } from "../lib/model";
import { prune } from "../lib/mapEngine";
import { edgePath, layoutMap } from "../lib/layoutEngine";
import { deleteMap, saveMap } from "../lib/db";
import { exportMap } from "../lib/exporters";
import { createNewMap, useApp, useUI } from "../store";
import { href, navigate, useTabSync } from "../hooks";
import { Badge, Button, ConfirmDialog, Dropdown, EmptyState, IconBtn, Input, Segmented, Stat } from "../components/ui";
import { IDownload, IGrid, IInbox, IList, IMore, IPencil, ISearch, ITemplate, ITrash, IUpload, ICopy, IArrowRight, ISparkle } from "../components/icons";

/* ---------- mini SVG preview ---------- */
export function MapThumb({ map, className = "" }: { map: MindMap; className?: string }) {
  const layout = useMemo(() => {
    const pruned = prune(map.root, 90, 4);
    return layoutMap(pruned, map.direction);
  }, [map]);
  const { bbox } = layout;
  const pad = 12;
  return (
    <svg viewBox={`${bbox.x - pad} ${bbox.y - pad} ${bbox.w + pad * 2} ${bbox.h + pad * 2}`} className={"w-full h-full " + className} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {layout.edges.map((e) => (
        <path key={e.from.id + e.to.id} d={edgePath(e.from, e.to, map.direction, "bezier")} fill="none" stroke="var(--line-strong)" strokeWidth={Math.max(1.5, bbox.w / 220)} strokeLinecap="round" opacity={0.75} />
      ))}
      {[...layout.positions.values()].map((p) => (
        <rect key={p.id} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.h / 3} fill={p.node.style.bg} opacity={p.depth === 0 ? 1 : 0.92} />
      ))}
    </svg>
  );
}

/* ---------- card ---------- */
function MapCard({ rec, view, onDelete }: { rec: MapRecord; view: "grid" | "list"; onDelete: (r: MapRecord) => void }) {
  const toast = useUI((s) => s.toast);
  const refresh = useApp((s) => s.refresh);
  const theme = useUI((s) => s.theme);

  const duplicate = async () => {
    const copy: MindMap = {
      ...rec,
      id: Math.random().toString(36).slice(2, 12),
      title: rec.title + " (copy)",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      root: structuredClone(rec.root),
    };
    await saveMap(copy);
    await refresh();
    toast("success", "Map duplicated", `“${copy.title}” is ready to edit.`);
  };

  const open = () => navigate(`/app/editor/${rec.id}`);

  if (view === "list") {
    return (
      <div className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 pr-3 shadow-card hover:shadow-lift hover:border-linestrong transition-all duration-200">
        <button onClick={open} className="h-12 w-20 shrink-0 rounded-lg bg-canvas dotgrid dotgrid-fine border border-line overflow-hidden" aria-label={`Open ${rec.title}`}>
          <MapThumb map={rec} />
        </button>
        <button onClick={open} className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-sm text-ink truncate group-hover:text-accent transition-colors">{rec.title}</p>
          <p className="font-mono text-[11px] text-faint mt-0.5">{rec.nodeCount} nodes · {relTime(rec.updatedAt)}</p>
        </button>
        <CardMenu rec={rec} onDelete={() => onDelete(rec)} onDuplicate={duplicate} theme={theme} />
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-line bg-surface shadow-card hover:shadow-lift hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <button onClick={open} className="relative h-36 bg-canvas dotgrid dotgrid-fine border-b border-line overflow-hidden" aria-label={`Open ${rec.title}`}>
        <div className="absolute inset-2 transition-transform duration-300 group-hover:scale-[1.04]">
          <MapThumb map={rec} />
        </div>
      </button>
      <div className="p-3.5 flex items-start gap-2 flex-1">
        <button onClick={open} className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-sm text-ink truncate group-hover:text-accent transition-colors">{rec.title}</p>
          <p className="font-mono text-[11px] text-faint mt-1">{rec.nodeCount} nodes · {relTime(rec.updatedAt)}</p>
        </button>
        <CardMenu rec={rec} onDelete={() => onDelete(rec)} onDuplicate={duplicate} theme={theme} />
      </div>
    </div>
  );
}

function CardMenu({ rec, onDelete, onDuplicate, theme }: { rec: MapRecord; onDelete: () => void; onDuplicate: () => void; theme: string }) {
  const toast = useUI((s) => s.toast);
  return (
    <Dropdown
      trigger={
        <IconBtn label={`Actions for ${rec.title}`} className="opacity-60 group-hover:opacity-100 h-8 w-8">
          <IMore size={16} />
        </IconBtn>
      }
      items={[
        { label: <><IPencil size={15} /> Open editor</>, onClick: () => navigate(`/app/editor/${rec.id}`) },
        { label: <><ICopy size={15} /> Duplicate</>, onClick: onDuplicate },
        {
          label: <><IDownload size={15} /> Export .json</>,
          onClick: async () => {
            const { nodeCount: _n, ...map } = rec;
            await exportMap(map, "json", theme as "light" | "dark" | "system");
            localStorage.setItem("bp-last-export", String(Date.now()));
            toast("success", "Exported", `${rec.title}.branchpad.json downloaded.`);
          },
        },
        { label: <><ITrash size={15} /> Delete</>, onClick: onDelete, danger: true },
      ]}
    />
  );
}

/* ---------- page ---------- */
export default function Dashboard() {
  const maps = useApp((s) => s.maps);
  const loading = useApp((s) => s.loading);
  const refresh = useApp((s) => s.refresh);
  const storage = useApp((s) => s.storage);
  const toast = useUI((s) => s.toast);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">(() => (localStorage.getItem("bp-view") as "grid" | "list") || "grid");
  const [toDelete, setToDelete] = useState<MapRecord | null>(null);
  const [creating, setCreating] = useState(false);

  useTabSync(() => void refresh());
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return maps;
    return maps.filter((m) => m.title.toLowerCase().includes(q));
  }, [maps, query]);

  const totalNodes = useMemo(() => maps.reduce((a, m) => a + m.nodeCount, 0), [maps]);
  const usageRatio = storage.quota > 0 ? storage.usage / storage.quota : 0;

  const newMap = async () => {
    setCreating(true);
    try {
      const map = await createNewMap();
      toast("success", "Map created", "Auto-save is on — everything you type is stored locally.");
      navigate(`/app/editor/${map.id}`);
    } catch {
      toast("error", "Could not create map", "Browser storage refused the write. Check storage quota.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      {/* header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl">Your maps</h1>
          <p className="text-sm text-muted mt-0.5">Stored in this browser · auto-saved · export for safekeeping.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button onClick={() => navigate("/app/import-export")}>
            <IUpload size={16} /> Import
          </Button>
          <Button onClick={() => navigate("/app/templates")}>
            <ITemplate size={16} /> Templates
          </Button>
          <Button variant="primary" onClick={newMap} disabled={creating}>
            <ISparkle size={16} /> New map
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Maps" value={maps.length} sub="unlimited allowed" />
        <Stat label="Nodes" value={totalNodes.toLocaleString()} sub="across all maps" />
        <Stat label="Local usage" value={storage.checked ? fmtBytes(storage.usage) : "…"} sub={storage.quota > 0 ? `${(usageRatio * 100).toFixed(1)}% of browser quota` : "quota unknown"} />
        <Stat
          label="Backup status"
          value={
            <span className={"inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold " + (storage.incognito ? "bg-danger/10 text-danger" : "bg-ok/10 text-ok")}>
              <span className={"h-1.5 w-1.5 rounded-full " + (storage.incognito ? "bg-danger" : "bg-ok")} />
              {storage.incognito ? "private window" : "safe in browser"}
            </span>
          }
          sub={storage.persistent ? "persistent storage granted" : "export .json to be sure"}
        />
      </div>

      {/* controls */}
      {maps.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <ISearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input placeholder="Search maps…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search maps" />
          </div>
          <Segmented
            ariaLabel="View mode"
            value={view}
            onChange={(v) => {
              setView(v);
              localStorage.setItem("bp-view", v);
            }}
            options={[
              { value: "grid", label: <><IGrid size={14} /> Grid</> },
              { value: "list", label: <><IList size={14} /> List</> },
            ]}
          />
          <a href={href("/app/import-export")} className="ml-auto font-mono text-xs text-faint hover:text-accent transition-colors hidden sm:block">
            export all →
          </a>
        </div>
      )}

      {/* content */}
      <div className="mt-6">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface overflow-hidden animate-pulse">
                <div className="h-36 bg-sunken" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-sunken" />
                  <div className="h-3 w-1/3 rounded bg-sunken" />
                </div>
              </div>
            ))}
          </div>
        ) : maps.length === 0 ? (
          <EmptyState icon={<IInbox size={24} />} title="No maps yet — the canvas is all yours" body="Create a blank map, start from one of ten templates, or import a backup file from another device.">
            <Button variant="primary" onClick={newMap}><ISparkle size={16} /> Create first map</Button>
            <Button onClick={() => navigate("/app/templates")}><ITemplate size={16} /> Browse templates</Button>
            <Button onClick={() => navigate("/app/import-export")}><IUpload size={16} /> Import file</Button>
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ISearch size={24} />} title={`Nothing matches “${query}”`} body="Try a different word — search looks at map titles." />
        ) : view === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m, i) => (
              <div key={m.id} className="anim-fadeup" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <MapCard rec={m} view="grid" onDelete={setToDelete} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MapCard key={m.id} rec={m} view="list" onDelete={setToDelete} />
            ))}
          </div>
        )}
      </div>

      {/* nudge for returning power users */}
      {maps.length >= 3 && (
        <div className="mt-8 rounded-xl border border-line bg-surface p-4 flex flex-wrap items-center gap-3">
          <IDownload size={18} className="text-accent shrink-0" />
          <p className="text-sm text-muted flex-1 min-w-[220px]">
            <strong className="text-ink">{maps.length} maps live in this browser.</strong> A single .json backup protects all of them from browser cleanups.
          </p>
          <Button size="sm" onClick={() => navigate("/app/import-export")}>
            Export all <IArrowRight size={14} />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteMap(toDelete.id);
          await refresh();
          toast("info", "Map deleted", `“${toDelete.title}” was removed from this browser.`);
        }}
        title="Delete this map?"
        body={
          <>
            <strong className="text-ink">“{toDelete?.title}”</strong> and its {toDelete?.nodeCount} nodes will be removed from this browser.
            If you haven't exported a .json backup, this is permanent — there is no server copy to restore from.
          </>
        }
      />
    </div>
  );
}
