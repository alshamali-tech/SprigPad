import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapNode } from "../lib/model";
import { AUTOSAVE_MS, NODE_COLORS } from "../lib/model";
import { findNode, flattenDFS, pathTo, countNodes } from "../lib/mapEngine";
import { edgePath, layoutMap, type LayoutResult } from "../lib/layoutEngine";
import { getMap, saveMap } from "../lib/db";
import { exportMap, type ExportFormat } from "../lib/exporters";
import { createNewMap, useMapStore, useUI } from "../store";
import { navigate, useDebouncedEffect, useOnline, useMediaQuery } from "../hooks";
import { Button, Dropdown, IconBtn, Input, Kbd, Segmented, TextArea, cn } from "../components/ui";
import {
  IBack, IChildNode, ISiblingNode, ITrash, IUndo, IRedo, IZoomIn, IZoomOut, IFit, IPencil, IPlay,
  IDownload, ICopy, IClipboard, IFold, ISliders, IX, ILink, IChevronLeft, IChevronRight, IWifiOff,
  IChevronDown, ICheck, NodeIcon, NODE_ICON_KEYS, IDot,
} from "../components/icons";

/* ============================================================ */
export default function Editor({ mapId }: { mapId: string }) {
  const store = useMapStore();
  const toast = useUI((s) => s.toast);
  const theme = useUI((s) => s.theme);
  const online = useOnline();
  const mapRef = useRef(store.map);
  mapRef.current = store.map;

  /* ---------- load ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (mapId === "new") {
          const m = await createNewMap();
          if (!cancelled) {
            useMapStore.getState().load(m);
            navigate(`/app/editor/${m.id}`, );
          }
          return;
        }
        const rec = await getMap(mapId);
        if (cancelled) return;
        if (!rec) {
          toast("error", "Map not found", "It may have been deleted in another tab. Returning to dashboard.");
          navigate("/app");
          return;
        }
        useMapStore.getState().load(rec);
        const n = countNodes(rec.root);
        if (n > 3000 && sessionStorage.getItem("bp-large-warned") !== "1") {
          sessionStorage.setItem("bp-large-warned", "1");
          toast("warning", "Large map", `${n.toLocaleString()} nodes — layout animations are disabled for speed, but everything works.`);
        }
      } catch {
        if (!cancelled) {
          toast("error", "Couldn't open map", "IndexedDB refused the read. Try reloading.");
          navigate("/app");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  /* ---------- autosave ---------- */
  const firstRender = useRef(true);
  useDebouncedEffect(
    () => {
      const m = mapRef.current;
      if (!m || firstRender.current) return;
      const st = useMapStore.getState();
      st.markSaving();
      saveMap(m)
        .then(() => useMapStore.getState().markSaved())
        .catch((err: unknown) => {
          const quota = err instanceof Error && /quota/i.test(err.name + err.message);
          useMapStore.getState().markSaved();
          toast(
            quota ? "error" : "warning",
            quota ? "Storage full — export now" : "Save hiccup",
            quota ? "The browser refused the write. Download a .json backup immediately." : "IndexedDB write failed; will retry on next edit.",
            quota ? "Export all maps" : undefined,
            quota ? () => navigate("/app/import-export") : undefined
          );
        });
    },
    [store.map],
    AUTOSAVE_MS
  );
  useEffect(() => {
    firstRender.current = false;
  }, []);
  useEffect(() => {
    const flush = () => {
      const m = mapRef.current;
      if (m) void saveMap(m).catch(() => undefined);
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      // flush pending edits when leaving the editor
      const m = mapRef.current;
      const st = useMapStore.getState();
      if (m && st.dirty) void saveMap(m).catch(() => undefined);
    };
  }, []);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useMapStore.getState();
      if (!st.map) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const sel = st.selectedId;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "c" && sel) {
        e.preventDefault();
        st.copyNode(sel);
        useUI.getState().toast("info", "Branch copied", "Paste it under any node with Ctrl+V.");
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && sel) {
        e.preventDefault();
        st.pasteNode(sel);
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        fitSignal.current?.();
        return;
      }
      if (mod) return;
      switch (e.key) {
        case "Tab":
          e.preventDefault();
          if (sel) st.addChildTo(sel);
          break;
        case "Enter":
          e.preventDefault();
          if (sel) st.addSiblingTo(sel);
          break;
        case "F2":
          e.preventDefault();
          if (sel) st.setEditing(sel);
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (sel && sel !== st.map?.root.id) st.deleteNode(sel);
          break;
        case " ":
          e.preventDefault();
          if (sel) st.collapseNode(sel);
          break;
        case "Escape":
          st.select(null);
          setCtx(null);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (e.altKey && sel) st.reorderNode(sel, 1);
          else st.navigate("next");
          break;
        case "ArrowUp":
          e.preventDefault();
          if (e.altKey && sel) st.reorderNode(sel, -1);
          else st.navigate("prev");
          break;
        case "ArrowRight":
          e.preventDefault();
          st.navigate("child");
          break;
        case "ArrowLeft":
          e.preventDefault();
          st.navigate("parent");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fitSignal = useRef<(() => void) | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string } | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!store.map) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-line border-t-accent animate-spin" aria-hidden="true" />
          <p className="font-mono text-xs text-faint mt-3">opening map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 print-canvas">
      <EditorHeader onPresent={() => setPresenting(true)} theme={theme} online={online} />
      <EditorToolbar onPanelToggle={() => setPanelOpen((v) => !v)} />
      <div className="flex-1 flex min-h-0">
        <Canvas fitSignal={fitSignal} onContext={setCtx} />
        {isDesktop ? <StylePanel /> : panelOpen ? <StylePanelMobile onClose={() => setPanelOpen(false)} /> : null}
      </div>
      {ctx && <ContextMenu ctx={ctx} close={() => setCtx(null)} />}
      {presenting && <Presentation onExit={() => setPresenting(false)} />}
    </div>
  );
}

/* ================= header ================= */
function EditorHeader({ onPresent, theme, online }: { onPresent: () => void; theme: string; online: boolean }) {
  const map = useMapStore((s) => s.map)!;
  const setTitle = useMapStore((s) => s.setTitle);
  const saving = useMapStore((s) => s.saving);
  const dirty = useMapStore((s) => s.dirty);
  const lastSavedAt = useMapStore((s) => s.lastSavedAt);
  const toast = useUI((s) => s.toast);
  const nodeCount = useMemo(() => countNodes(map.root), [map.root]);

  const doExport = async (fmt: ExportFormat) => {
    try {
      await exportMap(map, fmt, theme as "light" | "dark" | "system");
      localStorage.setItem("bp-last-export", String(Date.now()));
      toast("success", `Exported as ${fmt.toUpperCase()}`, "Map saved and file downloaded.");
    } catch {
      toast("error", "Export failed", "Rasterizing didn't work in this browser. Try SVG or JSON instead.");
    }
  };

  return (
    <div className="print-hide shrink-0 border-b border-line bg-surface px-2 sm:px-3 h-14 flex items-center gap-1.5 sm:gap-3">
      <IconBtn label="Back to dashboard" onClick={() => navigate("/app")}>
        <IBack size={18} />
      </IconBtn>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <input
          value={map.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Map title"
          maxLength={120}
          className="min-w-0 w-full max-w-[46ch] bg-transparent font-display font-bold text-base sm:text-lg tracking-tight focus:outline-none focus:bg-sunken rounded-lg px-2 h-9 transition-colors"
        />
        <span className="hidden md:inline-flex font-mono text-[11px] text-faint whitespace-nowrap">{nodeCount} nodes</span>
      </div>
      <SaveStatus saving={saving} dirty={dirty} lastSavedAt={lastSavedAt} />
      {!online && (
        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-amber" title="You're offline — everything still works and saves locally">
          <IWifiOff size={14} /> offline
        </span>
      )}
      <Dropdown
        align="right"
        trigger={
          <Button size="sm" variant="secondary" aria-label="Export map">
            <IDownload size={15} /> <span className="hidden sm:inline">Export</span> <IChevronDown size={13} />
          </Button>
        }
        items={(["json", "opml", "markdown", "svg", "png", "pdf"] as ExportFormat[]).map((f) => ({
          label: (
            <>
              <span className="font-mono text-[10px] uppercase w-7 text-faint">.{f === "markdown" ? "md" : f}</span> {f === "json" ? "JSON — full backup" : f === "opml" ? "OPML — outliners" : f === "markdown" ? "Markdown — nested list" : f.toUpperCase() + " — image/print"}
            </>
          ),
          onClick: () => void doExport(f),
        }))}
      />
      <Button size="sm" variant="primary" onClick={onPresent} className="hidden sm:inline-flex">
        <IPlay size={14} /> Present
      </Button>
    </div>
  );
}

function SaveStatus({ saving, dirty, lastSavedAt }: { saving: boolean; dirty: boolean; lastSavedAt: number | null }) {
  const label = saving ? "Saving…" : dirty ? "Unsaved" : "Saved";
  const time = lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-faint whitespace-nowrap" aria-live="polite">
      <span className={cn("h-2 w-2 rounded-full", saving ? "bg-amber anim-pulse-dot" : dirty ? "bg-danger" : "bg-ok")} />
      {label}
      {time && !saving && !dirty && <span>· {time}</span>}
    </span>
  );
}

/* ================= toolbar ================= */
function EditorToolbar({ onPanelToggle }: { onPanelToggle: () => void }) {
  const sel = useMapStore((s) => s.selectedId);
  const map = useMapStore((s) => s.map)!;
  const past = useMapStore((s) => s.past);
  const future = useMapStore((s) => s.future);
  const clipboard = useMapStore((s) => s.clipboard);
  const st = useMapStore.getState();
  const isRoot = sel === map.root.id;
  const selNode = sel ? findNode(map.root, sel) : null;
  const collapsible = !!selNode && selNode.node.children.length > 0;

  const T = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <IconBtn label={label} onClick={onClick} disabled={disabled}>
      {children}
    </IconBtn>
  );
  const Sep = () => <span className="w-px h-5 bg-line mx-1 shrink-0" aria-hidden="true" />;

  return (
    <div className="print-hide shrink-0 border-b border-line bg-surface/70 backdrop-blur px-2 h-11 flex items-center gap-0.5 overflow-x-auto">
      <T label="Undo (Ctrl+Z)" onClick={() => st.undo()} disabled={past.length === 0}><IUndo size={17} /></T>
      <T label="Redo (Ctrl+Shift+Z)" onClick={() => st.redo()} disabled={future.length === 0}><IRedo size={17} /></T>
      <Sep />
      <T label="Add child (Tab)" onClick={() => sel && st.addChildTo(sel)} disabled={!sel}><IChildNode size={17} /></T>
      <T label="Add sibling (Enter)" onClick={() => sel && st.addSiblingTo(sel)} disabled={!sel || isRoot}><ISiblingNode size={17} /></T>
      <T label="Edit text (F2)" onClick={() => sel && st.setEditing(sel)} disabled={!sel}><IPencil size={16} /></T>
      <T label={collapsible && selNode?.node.collapsed ? "Expand (Space)" : "Collapse (Space)"} onClick={() => sel && st.collapseNode(sel)} disabled={!collapsible}>
        <IFold size={16} className={selNode?.node.collapsed ? "rotate-180" : ""} />
      </T>
      <Sep />
      <T label="Copy branch (Ctrl+C)" onClick={() => sel && st.copyNode(sel)} disabled={!sel}><ICopy size={16} /></T>
      <T label="Paste branch (Ctrl+V)" onClick={() => sel && st.pasteNode(sel)} disabled={!sel || !clipboard}><IClipboard size={16} /></T>
      <Sep />
      <T label="Delete node (Del)" onClick={() => sel && !isRoot && st.deleteNode(sel)} disabled={!sel || isRoot}>
        <ITrash size={16} className={sel && !isRoot ? "text-danger" : ""} />
      </T>
      <span className="ml-auto flex items-center gap-1 pr-1">
        <span className="hidden lg:flex items-center gap-1.5 mr-2 font-mono text-[10px] text-faint whitespace-nowrap">
          <Kbd>Tab</Kbd> child · <Kbd>Enter</Kbd> sibling · <Kbd>F2</Kbd> edit
        </span>
        <IconBtn label="Toggle style panel" onClick={onPanelToggle} className="lg:hidden">
          <ISliders size={17} />
        </IconBtn>
      </span>
    </div>
  );
}

/* ================= canvas ================= */
function Canvas({ fitSignal, onContext }: { fitSignal: React.MutableRefObject<(() => void) | null>; onContext: (c: { x: number; y: number; id: string } | null) => void }) {
  const map = useMapStore((s) => s.map)!;
  const selectedId = useMapStore((s) => s.selectedId);
  const editingId = useMapStore((s) => s.editingId);
  const select = useMapStore((s) => s.select);
  const setEditing = useMapStore((s) => s.setEditing);
  const setViewport = useMapStore((s) => s.setViewport);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState(map.viewport);
  const viewRef = useRef(view);
  viewRef.current = view;
  const didInit = useRef<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panState = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number; mid: { x: number; y: number }; vx: number; vy: number } | null>(null);

  const layout: LayoutResult = useMemo(() => layoutMap(map.root, map.direction), [map.root, map.direction]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  /* resize observer */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    const l = layoutRef.current;
    const el = wrapRef.current;
    if (!el) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    const z = Math.max(0.2, Math.min(1.3, Math.min((cw - 90) / l.bbox.w, (ch - 90) / l.bbox.h)));
    const v = { zoom: z, x: cw / 2 - (l.bbox.x + l.bbox.w / 2) * z, y: ch / 2 - (l.bbox.y + l.bbox.h / 2) * z };
    setView(v);
    setViewport(v);
  }, [setViewport]);
  fitSignal.current = fit;

  /* initial fit per map */
  useEffect(() => {
    if (didInit.current === map.id) return;
    didInit.current = map.id;
    const saved = map.viewport;
    if (saved.x === 0 && saved.y === 0 && saved.zoom === 1) {
      requestAnimationFrame(fit);
    } else {
      setView(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.id]);

  /* keep store in sync occasionally (for persistence) */
  useEffect(() => {
    const t = setTimeout(() => setViewport(viewRef.current), 800);
    return () => clearTimeout(t);
  }, [view, setViewport]);

  const zoomAt = useCallback(
    (mx: number, my: number, factor: number) => {
      const v = viewRef.current;
      const nz = Math.max(0.2, Math.min(2.5, v.zoom * factor));
      const nv = { zoom: nz, x: mx - ((mx - v.x) / v.zoom) * nz, y: my - ((my - v.y) / v.zoom) * nz };
      setView(nv);
    },
    [setView]
  );

  /* wheel zoom (non-passive) */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /* pointer pan + pinch */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.canvasBg) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: viewRef.current.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, vx: viewRef.current.x, vy: viewRef.current.y };
      panState.current = null;
    } else {
      panState.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()];
      const rect = wrapRef.current!.getBoundingClientRect();
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const p = pinchRef.current;
      const nz = Math.max(0.2, Math.min(2.5, p.zoom * (dist / p.dist)));
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const omx = p.mid.x - rect.left, omy = p.mid.y - rect.top;
      setView({ zoom: nz, x: mid.x - ((omx - p.vx) / p.zoom) * nz, y: mid.y - ((omy - p.vy) / p.zoom) * nz });
      return;
    }
    const p = panState.current;
    if (!p) return;
    const dx = e.clientX - p.sx, dy = e.clientY - p.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) p.moved = true;
    if (p.moved) setView({ ...viewRef.current, x: p.vx + dx, y: p.vy + dy });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinchRef.current = null;
    const p = panState.current;
    if (p && !p.moved) {
      select(null);
      onContext(null);
    }
    panState.current = null;
  };

  const zoomBy = (f: number) => zoomAt(size.w / 2, size.h / 2, f);

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 min-w-0 overflow-hidden dotgrid touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-canvas-bg="1"
      role="application"
      aria-label="Mind map canvas. Use arrow keys to walk the tree, Tab to add a child."
    >
      {/* world layer */}
      <div className="absolute left-0 top-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }} data-canvas-bg="1">
        <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1" data-canvas-bg="1" aria-hidden="true">
          {layout.edges.map((e) => (
            <path key={e.from.id + e.to.id} d={edgePath(e.from, e.to, map.direction, map.edgeStyle)} fill="none" stroke="var(--line-strong)" strokeWidth={2 / Math.max(view.zoom, 0.7)} strokeLinecap="round" opacity={0.8} data-canvas-bg="1" />
          ))}
        </svg>
        {[...layout.positions.values()].map((p) => (
          <NodeView key={p.id} p={p} isRoot={p.depth === 0} selected={selectedId === p.id} editing={editingId === p.id} onSelect={() => select(p.id)} onEdit={() => setEditing(p.id)} onContext={(e) => { select(p.id); onContext({ x: e.clientX, y: e.clientY, id: p.id }); }} />
        ))}
      </div>

      {/* zoom controls */}
      <div className="print-hide absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 flex items-center rounded-xl border border-line bg-surface shadow-card overflow-hidden">
        <IconBtn label="Zoom out" onClick={() => zoomBy(1 / 1.25)} className="rounded-none h-10 w-10"><IZoomOut size={17} /></IconBtn>
        <button className="h-10 px-2 font-mono text-xs text-muted hover:bg-sunken min-w-[52px]" onClick={() => { setView((v) => ({ ...v, zoom: 1 })); }} aria-label="Reset zoom to 100%">
          {Math.round(view.zoom * 100)}%
        </button>
        <IconBtn label="Zoom in" onClick={() => zoomBy(1.25)} className="rounded-none h-10 w-10"><IZoomIn size={17} /></IconBtn>
        <IconBtn label="Fit map to screen (Ctrl+0)" onClick={fit} className="rounded-none h-10 w-10 border-l border-line"><IFit size={16} /></IconBtn>
      </div>

      <MiniMap layout={layout} view={view} size={size} onJump={(wx, wy) => setView((v) => ({ ...v, x: size.w / 2 - wx * v.zoom, y: size.h / 2 - wy * v.zoom }))} />

      <p className="print-hide absolute top-3 left-1/2 -translate-x-1/2 font-mono text-[10px] text-faint pointer-events-none hidden sm:block">
        drag to pan · scroll to zoom · right-click a node for more
      </p>
    </div>
  );
}

/* ---------- single node ---------- */
function NodeView({ p, isRoot, selected, editing, onSelect, onEdit, onContext }: {
  p: { id: string; node: MapNode; x: number; y: number; w: number; h: number };
  isRoot: boolean;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const s = p.node.style;
  const updateText = useMapStore((st) => st.updateText);
  const setEditing = useMapStore((st) => st.setEditing);
  const [draft, setDraft] = useState(p.node.text);
  useEffect(() => {
    if (editing) setDraft(p.node.text);
  }, [editing, p.node.text]);

  const shape = s.shape === "pill" ? "rounded-full" : s.shape === "rect" ? "rounded-[5px]" : "rounded-[10px]";
  const fontSize = isRoot ? 18 : s.size === "sm" ? 12 : s.size === "lg" ? 17 : 14;

  const commit = () => {
    updateText(p.id, draft);
    setEditing(null);
  };

  return (
    <div
      className={cn("bp-node bp-pos absolute flex items-center justify-center text-center px-3 cursor-pointer", shape, editing && "cursor-text")}
      style={{
        left: p.x,
        top: p.y,
        width: p.w,
        height: p.h,
        background: s.bg,
        color: s.fg,
        border: s.border ? `1.5px solid ${s.border}` : "1.5px solid transparent",
        boxShadow: selected ? "0 0 0 2.5px var(--accent), var(--shadow)" : "var(--shadow)",
        fontSize,
        fontWeight: s.bold || isRoot ? 700 : 500,
        fontStyle: s.italic ? "italic" : "normal",
        lineHeight: 1.3,
        zIndex: selected ? 5 : 2,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContext(e);
      }}
      role="treeitem"
      aria-selected={selected}
      aria-label={`Node: ${p.node.text}`}
      tabIndex={-1}
    >
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setEditing(null);
            }
          }}
          rows={Math.max(1, p.node.text.split("\n").length)}
          className="bp-node-edit w-full h-full resize-none text-center bg-black/10 rounded-md outline-none outline-2 outline-white/40 p-1"
          /* on touch devices keep ≥16px so iOS doesn't zoom the whole canvas on focus */
          style={{ color: s.fg, fontSize: window.matchMedia("(pointer: coarse)").matches ? Math.max(16, fontSize) : fontSize, fontWeight: s.bold || isRoot ? 700 : 500 }}
          aria-label="Edit node text"
        />
      ) : (
        <span className="flex items-center justify-center gap-1.5 min-w-0 break-words w-full">
          {s.icon && <span className="shrink-0"><NodeIcon icon={s.icon} size={Math.round(fontSize * 0.95)} /></span>}
          <span className="min-w-0">{p.node.text}</span>
        </span>
      )}

      {p.node.collapsed && p.node.children.length > 0 && !editing && (
        <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface text-muted font-mono text-[10px] px-1.5 py-0.5 shadow-sm">
          {p.node.children.length}
        </span>
      )}
      {(p.node.notes || p.node.link) && !editing && (
        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-accent text-white flex items-center justify-center shadow-sm" title={p.node.link ? "Has link" : "Has notes"}>
          {p.node.link ? <ILink size={9} /> : <IDot size={8} />}
        </span>
      )}
    </div>
  );
}

/* ---------- minimap ---------- */
function MiniMap({ layout, view, size, onJump }: { layout: LayoutResult; view: { x: number; y: number; zoom: number }; size: { w: number; h: number }; onJump: (wx: number, wy: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const W = 168, H = 110, pad = 8;
  const scale = Math.min((W - pad * 2) / layout.bbox.w, (H - pad * 2) / layout.bbox.h);
  const ox = pad + (W - pad * 2 - layout.bbox.w * scale) / 2 - layout.bbox.x * scale;
  const oy = pad + (H - pad * 2 - layout.bbox.h * scale) / 2 - layout.bbox.y * scale;
  const vp = {
    x: ox + ((0 - view.x) / view.zoom) * scale,
    y: oy + ((0 - view.y) / view.zoom) * scale,
    w: (size.w / view.zoom) * scale,
    h: (size.h / view.zoom) * scale,
  };
  const jump = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    onJump(((e.clientX - rect.left) - ox) / scale, ((e.clientY - rect.top) - oy) / scale);
  };
  return (
    <div
      ref={ref}
      className="print-hide absolute bottom-4 right-4 hidden md:block rounded-xl border border-line bg-surface/90 backdrop-blur shadow-card overflow-hidden cursor-pointer"
      style={{ width: W, height: H }}
      onPointerDown={jump}
      aria-hidden="true"
    >
      <svg width={W} height={H}>
        {[...layout.positions.values()].map((p) => (
          <rect key={p.id} x={ox + p.x * scale} y={oy + p.y * scale} width={Math.max(2, p.w * scale)} height={Math.max(1.5, p.h * scale)} rx={1} fill={p.node.style.bg} opacity={0.85} />
        ))}
        <rect x={vp.x} y={vp.y} width={vp.w} height={vp.h} fill="var(--accent)" opacity={0.12} stroke="var(--accent)" strokeWidth={1} rx={2} />
      </svg>
    </div>
  );
}

/* ================= context menu ================= */
function ContextMenu({ ctx, close }: { ctx: { x: number; y: number; id: string }; close: () => void }) {
  const st = useMapStore.getState();
  const map = useMapStore((s) => s.map)!;
  const clipboard = useMapStore((s) => s.clipboard);
  const node = findNode(map.root, ctx.id);
  const isRoot = ctx.id === map.root.id;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-ctx-menu]")) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  if (!node) return null;
  const x = Math.min(ctx.x, window.innerWidth - 220);
  const y = Math.min(ctx.y, window.innerHeight - 320);

  const Item = ({ label, onClick, danger, disabled }: { label: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) => (
    <button
      disabled={disabled}
      onClick={() => {
        close();
        onClick();
      }}
      className={cn("w-full text-left px-3 h-9 rounded-md text-sm flex items-center gap-2.5 transition-colors disabled:opacity-40", danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-sunken")}
    >
      {label}
    </button>
  );

  return (
    <div data-ctx-menu className="anim-pop fixed z-[80] w-[210px] max-h-[min(70vh,430px)] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lift" style={{ left: x, top: y }} role="menu">
      <Item label={<><IChildNode size={15} /> Add child <Kbd>Tab</Kbd></>} onClick={() => st.addChildTo(ctx.id)} />
      <Item label={<><ISiblingNode size={15} /> Add sibling <Kbd>↵</Kbd></>} onClick={() => st.addSiblingTo(ctx.id)} disabled={isRoot} />
      <Item label={<><IPencil size={14} /> Edit text <Kbd>F2</Kbd></>} onClick={() => st.setEditing(ctx.id)} />
      <Item label={<><IFold size={14} /> {node.node.collapsed ? "Expand" : "Collapse"} <Kbd>␣</Kbd></>} onClick={() => st.collapseNode(ctx.id)} disabled={node.node.children.length === 0} />
      <Item label={<><ICopy size={14} /> Copy branch</>} onClick={() => st.copyNode(ctx.id)} />
      <Item label={<><IClipboard size={14} /> Paste inside</>} onClick={() => st.pasteNode(ctx.id)} disabled={!clipboard} />
      <div className="my-1.5 px-2 flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-faint mr-1">color</span>
        {NODE_COLORS.slice(0, 6).map((c) => (
          <button
            key={c.bg}
            aria-label={`Set color ${c.name}`}
            className="h-5 w-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
            style={{ background: c.bg }}
            onClick={() => {
              close();
              st.styleNode(ctx.id, { bg: c.bg, fg: c.fg, border: null });
            }}
          />
        ))}
      </div>
      <Item label={<><ITrash size={14} /> Delete <Kbd>Del</Kbd></>} onClick={() => st.deleteNode(ctx.id)} danger disabled={isRoot} />
    </div>
  );
}

/* ================= style panel ================= */
function StylePanelInner() {
  const map = useMapStore((s) => s.map)!;
  const sel = useMapStore((s) => s.selectedId);
  const st = useMapStore.getState();
  const node = sel ? findNode(map.root, sel) : null;
  const s = node?.node.style;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-5">
        <div>
          <PanelLabel>Layout</PanelLabel>
          <div className="space-y-2.5">
            <Segmented
              ariaLabel="Tree direction"
              value={map.direction}
              onChange={(d) => st.setDirection(d)}
              options={[
                { value: "both", label: "Both" },
                { value: "right", label: "Right" },
                { value: "down", label: "Down" },
              ]}
            />
            <div />
            <Segmented
              ariaLabel="Edge style"
              value={map.edgeStyle}
              onChange={(e2) => st.setEdgeStyle(e2)}
              options={[
                { value: "bezier", label: "Curved" },
                { value: "elbow", label: "Elbow" },
                { value: "straight", label: "Straight" },
              ]}
            />
          </div>
        </div>

        {!node ? (
          <p className="text-xs text-faint leading-relaxed border border-dashed border-line rounded-lg p-3">
            Select a node to style it — color, shape, size, icon, notes and links.
          </p>
        ) : (
          <>
            <div>
              <PanelLabel>Node · “{node.node.text.slice(0, 22)}{node.node.text.length > 22 ? "…" : ""}”</PanelLabel>
              <div className="flex flex-wrap gap-1.5">
                {NODE_COLORS.map((c) => (
                  <button
                    key={c.bg}
                    aria-label={`Color ${c.name}`}
                    title={c.name}
                    onClick={() => st.styleNode(sel!, { bg: c.bg, fg: c.fg, border: null })}
                    className={cn("h-7 w-7 rounded-lg border border-black/10 transition-transform hover:scale-110", s!.bg === c.bg && "ring-2 ring-accent ring-offset-2 ring-offset-surface")}
                    style={{ background: c.bg }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <PanelLabel>Shape</PanelLabel>
                <Segmented ariaLabel="Node shape" value={s!.shape} onChange={(v) => st.styleNode(sel!, { shape: v })} options={[{ value: "rounded", label: "Soft" }, { value: "rect", label: "Box" }, { value: "pill", label: "Pill" }]} />
              </div>
              <div>
                <PanelLabel>Size</PanelLabel>
                <Segmented ariaLabel="Node size" value={s!.size} onChange={(v) => st.styleNode(sel!, { size: v })} options={[{ value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]} />
              </div>
            </div>
            <div>
              <PanelLabel>Emphasis</PanelLabel>
              <div className="flex gap-1.5">
                <button onClick={() => st.styleNode(sel!, { bold: !s!.bold })} aria-pressed={s!.bold} className={cn("h-9 w-9 rounded-lg border text-sm font-bold transition-colors", s!.bold ? "bg-ink text-paper border-ink" : "border-line text-muted hover:border-linestrong")}>B</button>
                <button onClick={() => st.styleNode(sel!, { italic: !s!.italic })} aria-pressed={s!.italic} className={cn("h-9 w-9 rounded-lg border text-sm italic font-serif transition-colors", s!.italic ? "bg-ink text-paper border-ink" : "border-line text-muted hover:border-linestrong")}>I</button>
              </div>
            </div>
            <div>
              <PanelLabel>Icon</PanelLabel>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => st.styleNode(sel!, { icon: null })} aria-pressed={!s!.icon} className={cn("h-8 px-2 rounded-lg border text-[11px] font-mono transition-colors", !s!.icon ? "bg-ink text-paper border-ink" : "border-line text-muted hover:border-linestrong")}>none</button>
                {NODE_ICON_KEYS.map((k) => (
                  <button key={k} onClick={() => st.styleNode(sel!, { icon: k })} aria-label={`Icon ${k}`} aria-pressed={s!.icon === k} className={cn("h-8 w-8 rounded-lg border flex items-center justify-center transition-colors", s!.icon === k ? "bg-ink text-paper border-ink" : "border-line text-muted hover:border-linestrong hover:text-ink")}>
                    <NodeIcon icon={k} size={15} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <PanelLabel>Notes</PanelLabel>
              <TextArea placeholder="Private notes for this node…" value={node.node.notes ?? ""} onChange={(e) => st.metaNode(sel!, { notes: e.target.value || null })} />
            </div>
            <div>
              <PanelLabel>Link</PanelLabel>
              <Input placeholder="https://…" value={node.node.link ?? ""} onChange={(e) => st.metaNode(sel!, { link: e.target.value || null })} />
            </div>
            <p className="font-mono text-[10px] text-faint">
              {node.node.children.length} direct children · depth {node.depth}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[10px] uppercase tracking-widest text-faint mb-1.5">{children}</p>
);

function StylePanel() {
  return (
    <aside className="print-hide hidden lg:block w-[268px] shrink-0 border-l border-line bg-surface">
      <div className="h-10 px-4 flex items-center border-b border-line">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted flex items-center gap-2"><ISliders size={13} /> Inspector</p>
      </div>
      <StylePanelInner />
    </aside>
  );
}

function StylePanelMobile({ onClose }: { onClose: () => void }) {
  return (
    <div className="print-hide fixed inset-0 z-[70] lg:hidden">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 bottom-0 w-[min(88vw,300px)] bg-surface border-l border-line shadow-lift anim-fadeup flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b border-line shrink-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Inspector</p>
          <IconBtn label="Close panel" onClick={onClose}><IX size={17} /></IconBtn>
        </div>
        <div className="flex-1 min-h-0">
          <StylePanelInner />
        </div>
      </div>
    </div>
  );
}

/* ================= presentation mode ================= */
function Presentation({ onExit }: { onExit: () => void }) {
  const map = useMapStore((s) => s.map)!;
  const order = useMemo(() => flattenDFS(map.root), [map.root]);
  const [i, setI] = useState(0);
  const node = order[Math.min(i, order.length - 1)];
  const trail = useMemo(() => pathTo(map.root, node.id), [map.root, node.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") setI((v) => Math.min(order.length - 1, v + 1));
      if (e.key === "ArrowLeft" || e.key === "Backspace") setI((v) => Math.max(0, v - 1));
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order.length, onExit]);

  return (
    <div className="fixed inset-0 z-[85] bg-ink dark:bg-black text-paper flex flex-col" role="dialog" aria-modal="true" aria-label="Presentation mode">
      <div className="h-14 px-3 sm:px-4 flex items-center gap-2 sm:gap-3 border-b border-white/10 shrink-0">
        <span className="font-mono text-xs text-white/60 min-w-0 truncate">{map.title}</span>
        <span className="ml-auto shrink-0 font-mono text-xs text-white/60 tabular-nums">{i + 1} / {order.length}</span>
        <button onClick={onExit} className="shrink-0 h-9 px-3 rounded-lg border border-white/15 text-sm text-white/80 hover:bg-white/10 transition-colors inline-flex items-center gap-2" aria-label="Exit presentation">
          <IX size={15} /> Exit <span className="hidden sm:inline"><Kbd>Esc</Kbd></span>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div key={node.id} className="anim-pop max-w-2xl w-full text-center">
          <p className="font-mono text-[11px] text-white/40 tracking-wide flex flex-wrap items-center justify-center gap-1.5 mb-6">
            {trail.map((t, j) => (
              <span key={t.id} className="flex items-center gap-1.5">
                {j > 0 && <IChevronRight size={11} className="text-white/30" />}
                <span className={j === trail.length - 1 ? "text-accent" : ""}>{t.text.slice(0, 24)}</span>
              </span>
            ))}
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12" style={{ borderLeft: `6px solid ${node.style.bg}` }}>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight leading-tight break-words">{node.text}</h2>
            {node.notes && <p className="mt-5 text-base sm:text-lg text-white/70 leading-relaxed whitespace-pre-wrap">{node.notes}</p>}
            {node.link && (
              <a href={node.link} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1.5 text-accent hover:underline text-sm break-all">
                <ILink size={14} /> {node.link}
              </a>
            )}
          </div>
          {node.children.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {node.children.map((c, j) => (
                <button key={c.id} onClick={() => setI(i + 1 + j)} className="px-3 py-1.5 rounded-full border border-white/15 text-sm text-white/75 hover:bg-white/10 transition-colors">
                  {c.text.slice(0, 30)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="h-16 px-3 flex items-center justify-center gap-3 border-t border-white/10 shrink-0 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="h-9 px-3 sm:px-4 rounded-lg bg-white/10 text-white border border-white/15 text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <IChevronLeft size={15} /> Prev
        </button>
        <div className="hidden sm:flex gap-1 max-w-[40vw] overflow-hidden">
          {order.slice(Math.max(0, i - 6), i + 7).map((n, j) => (
            <span key={n.id} className={cn("h-1.5 rounded-full transition-all", j === Math.min(6, i) ? "w-5 bg-accent" : "w-1.5 bg-white/25")} />
          ))}
        </div>
        <button
          onClick={() => setI((v) => Math.min(order.length - 1, v + 1))}
          disabled={i >= order.length - 1}
          className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accentdeep transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          Next <IChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
