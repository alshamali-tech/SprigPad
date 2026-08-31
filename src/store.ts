import { create } from "zustand";
import type { MapNode, MapRecord, MindMap, ThemePref } from "./lib/model";
import { UNDO_LIMIT, makeMap } from "./lib/model";
import {
  addChild, addSibling, cloneTree, countNodes, findNode, firstChildOf, mapTitle,
  patchNode, patchStyle, removeNode, reorder, setText, siblingOf, toggleCollapse,
} from "./lib/mapEngine";
import { listMaps, saveMap, type StorageStatus } from "./lib/db";

/* ================= UI store ================= */
export type ToastKind = "success" | "error" | "info" | "warning";
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface UIState {
  theme: ThemePref;
  toasts: Toast[];
  sidebarOpen: boolean;
  announce: string;
  setTheme: (t: ThemePref) => void;
  toast: (kind: ToastKind, title: string, body?: string, actionLabel?: string, onAction?: () => void) => void;
  dismissToast: (id: number) => void;
  setSidebar: (open: boolean) => void;
  say: (msg: string) => void;
}

let toastSeq = 1;

export const useUI = create<UIState>((set, get) => ({
  theme: (typeof localStorage !== "undefined" && (localStorage.getItem("bp-theme") as ThemePref)) || "system",
  toasts: [],
  sidebarOpen: true,
  announce: "",
  setTheme: (t) => {
    localStorage.setItem("bp-theme", t);
    const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    set({ theme: t });
  },
  toast: (kind, title, body, actionLabel, onAction) => {
    const id = toastSeq++;
    set({ toasts: [...get().toasts.slice(-3), { id, kind, title, body, actionLabel, onAction }] });
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setSidebar: (open) => set({ sidebarOpen: open }),
  say: (msg) => set({ announce: msg }),
}));

/* ================= App store ================= */
interface AppState {
  booted: boolean;
  maps: MapRecord[];
  loading: boolean;
  storage: StorageStatus;
  firstVisit: boolean;
  returningEmpty: boolean;
  refresh: () => Promise<void>;
  setStorage: (s: StorageStatus) => void;
  setBootFlags: (firstVisit: boolean, returningEmpty: boolean) => void;
  markBooted: () => void;
}

export const useApp = create<AppState>((set) => ({
  booted: false,
  maps: [],
  loading: true,
  storage: { persistent: null, quota: 0, usage: 0, incognito: false, checked: false },
  firstVisit: false,
  returningEmpty: false,
  refresh: async () => {
    const maps = await listMaps();
    set({ maps, loading: false });
  },
  setStorage: (storage) => set({ storage }),
  setBootFlags: (firstVisit, returningEmpty) => set({ firstVisit, returningEmpty }),
  markBooted: () => set({ booted: true }),
}));

/* ================= Map (editor) store ================= */
interface MapState {
  map: MindMap | null;
  selectedId: string | null;
  editingId: string | null;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  past: MapNode[];
  future: MapNode[];
  clipboard: MapNode | null;

  load: (map: MindMap) => void;
  unload: () => void;
  select: (id: string | null) => void;
  setEditing: (id: string | null) => void;

  commit: (mutate: (root: MapNode) => { root: MapNode; focusId?: string | null; edit?: boolean } | null) => void;
  addChildTo: (id: string) => void;
  addSiblingTo: (id: string) => void;
  deleteNode: (id: string) => void;
  updateText: (id: string, text: string) => void;
  styleNode: (id: string, patch: Partial<MapNode["style"]>) => void;
  metaNode: (id: string, patch: Partial<Pick<MapNode, "notes" | "link" | "collapsed">>) => void;
  collapseNode: (id: string) => void;
  reorderNode: (id: string, dir: -1 | 1) => void;
  copyNode: (id: string) => void;
  pasteNode: (id: string) => void;

  undo: () => void;
  redo: () => void;
  navigate: (dir: "parent" | "child" | "prev" | "next") => void;

  setTitle: (title: string) => void;
  setDirection: (d: MindMap["direction"]) => void;
  setEdgeStyle: (e: MindMap["edgeStyle"]) => void;
  setViewport: (v: { x: number; y: number; zoom: number }) => void;
  markSaving: () => void;
  markSaved: () => void;
}

const emptyFuture = (): MapNode[] => [];

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  selectedId: null,
  editingId: null,
  dirty: false,
  saving: false,
  lastSavedAt: null,
  past: [],
  future: [],
  clipboard: null,

  load: (map) => set({ map: structuredClone(map), selectedId: map.root.id, editingId: null, dirty: false, saving: false, lastSavedAt: Date.parse(map.updatedAt), past: [], future: [], clipboard: get().clipboard }),
  unload: () => set({ map: null, selectedId: null, editingId: null, dirty: false, past: [], future: [] }),
  select: (id) => set({ selectedId: id }),
  setEditing: (id) => set({ editingId: id }),

  commit: (mutate) => {
    const { map } = get();
    if (!map) return;
    const rootCopy = cloneTree(map.root);
    const res = mutate(rootCopy);
    if (!res) return;
    set({
      map: { ...map, root: res.root },
      past: [...get().past.slice(-(UNDO_LIMIT - 1)), cloneTree(map.root)],
      future: emptyFuture(),
      dirty: true,
      selectedId: res.focusId !== undefined ? res.focusId : get().selectedId,
      editingId: res.edit && res.focusId ? res.focusId : null,
    });
  },

  addChildTo: (id) =>
    get().commit((root) => {
      const r = addChild(root, id);
      return r ? { root: r.root, focusId: r.id, edit: true } : null;
    }),
  addSiblingTo: (id) =>
    get().commit((root) => {
      const r = addSibling(root, id);
      return r ? { root: r.root, focusId: r.id, edit: true } : null;
    }),
  deleteNode: (id) =>
    get().commit((root) => {
      const r = removeNode(root, id);
      return r ? { root: r.root, focusId: r.parentId } : null;
    }),
  updateText: (id, text) =>
    get().commit((root) => {
      const r = setText(root, id, text);
      return r ? { root: r, focusId: id } : null;
    }),
  styleNode: (id, patch) =>
    get().commit((root) => {
      const r = patchStyle(root, id, patch);
      return r ? { root: r, focusId: id } : null;
    }),
  metaNode: (id, patch) =>
    get().commit((root) => {
      const r = patchNode(root, id, patch);
      return r ? { root: r, focusId: id } : null;
    }),
  collapseNode: (id) =>
    get().commit((root) => {
      const r = toggleCollapse(root, id);
      return r ? { root: r, focusId: id } : null;
    }),
  reorderNode: (id, dir) =>
    get().commit((root) => {
      const r = reorder(root, id, dir);
      return r ? { root: r, focusId: id } : null;
    }),
  copyNode: (id) => {
    const { map } = get();
    if (!map) return;
    const f = findNode(map.root, id);
    if (f) set({ clipboard: cloneTree(f.node) });
  },
  pasteNode: (id) =>
    get().commit((root) => {
      const clip = get().clipboard;
      const f = findNode(root, id);
      if (!clip || !f) return null;
      const copy = cloneTree(clip);
      copy.id = Math.random().toString(36).slice(2, 10);
      const reid = (n: MapNode): MapNode => ({ ...n, id: Math.random().toString(36).slice(2, 10) + n.id.slice(0, 3), children: n.children.map(reid) });
      const fresh = reid(copy);
      f.node.collapsed = false;
      f.node.children.push(fresh);
      return { root, focusId: fresh.id };
    }),

  undo: () => {
    const { past, map } = get();
    if (!map || past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [...get().future, cloneTree(map.root)].slice(-UNDO_LIMIT),
      map: { ...map, root: cloneTree(prev) },
      dirty: true,
      selectedId: findNode(prev, get().selectedId ?? "") ? get().selectedId : map.root.id,
    });
  },
  redo: () => {
    const { future, map } = get();
    if (!map || future.length === 0) return;
    const next = future[future.length - 1];
    set({
      future: future.slice(0, -1),
      past: [...get().past, cloneTree(map.root)].slice(-UNDO_LIMIT),
      map: { ...map, root: cloneTree(next) },
      dirty: true,
      selectedId: findNode(next, get().selectedId ?? "") ? get().selectedId : map.root.id,
    });
  },

  navigate: (dir) => {
    const { map, selectedId } = get();
    if (!map || !selectedId) return;
    const f = findNode(map.root, selectedId);
    if (!f) return;
    let target: string | null = null;
    if (dir === "child") target = firstChildOf(f.node);
    if (dir === "parent") target = f.parent?.id ?? null;
    if (dir === "next") target = siblingOf(map.root, selectedId, 1);
    if (dir === "prev") target = siblingOf(map.root, selectedId, -1);
    if (target) set({ selectedId: target });
  },

  setTitle: (title) => {
    const { map } = get();
    if (!map) return;
    set({ map: { ...map, title }, dirty: true });
  },
  setDirection: (d) => {
    const { map } = get();
    if (!map) return;
    set({ map: { ...map, direction: d }, dirty: true });
  },
  setEdgeStyle: (e) => {
    const { map } = get();
    if (!map) return;
    set({ map: { ...map, edgeStyle: e }, dirty: true });
  },
  setViewport: (v) => {
    const { map } = get();
    if (!map) return;
    set({ map: { ...map, viewport: v } });
  },
  markSaving: () => set({ saving: true }),
  markSaved: () => set({ saving: false, dirty: false, lastSavedAt: Date.now() }),
}));

/* helper used across pages */
export async function createNewMap(title = "Untitled map"): Promise<MindMap> {
  const map = makeMap(title);
  const rec = await saveMap(map);
  void rec;
  const count = parseInt(localStorage.getItem("bp-map-create-count") ?? "0", 10) + 1;
  localStorage.setItem("bp-map-create-count", String(count));
  localStorage.setItem("bp-has-used", "1");
  await useApp.getState().refresh();
  return map;
}

export const nodeCountOf = (m: MindMap) => countNodes(m.root);
export const titleOf = mapTitle;
