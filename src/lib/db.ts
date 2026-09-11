import Dexie, { type Table } from "dexie";
import type { MapRecord, MindMap } from "./model";
import { SYNC_CHANNEL } from "./model";
import { countNodes } from "./mapEngine";

class SprigPadDB extends Dexie {
  maps!: Table<MapRecord, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    // Keep "branchpad" as the DB name for backward compatibility with existing user data
    super("branchpad");
    this.version(1).stores({
      maps: "id, updatedAt, title",
      meta: "key",
    });
  }
}

export const db = new SprigPadDB();

export const dbSupported = (): boolean => {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
};

export async function listMaps(): Promise<MapRecord[]> {
  return db.maps.orderBy("updatedAt").reverse().toArray();
}

export async function getMap(id: string): Promise<MapRecord | undefined> {
  return db.maps.get(id);
}

export function toRecord(map: MindMap): MapRecord {
  return { ...map, nodeCount: countNodes(map.root) };
}

export async function saveMap(map: MindMap): Promise<MapRecord> {
  const rec = toRecord({ ...map, updatedAt: new Date().toISOString() });
  await db.maps.put(rec);
  broadcast({ type: "map-updated", id: map.id });
  return rec;
}

export async function deleteMap(id: string): Promise<void> {
  await db.maps.delete(id);
  broadcast({ type: "map-deleted", id });
}

export async function clearAll(): Promise<void> {
  await db.maps.clear();
  await db.meta.clear();
  broadcast({ type: "cleared" });
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

/* ---------- storage health ---------- */
export interface StorageStatus {
  persistent: boolean | null;
  quota: number;
  usage: number;
  incognito: boolean;
  checked: boolean;
}

export async function checkStorage(): Promise<StorageStatus> {
  const base: StorageStatus = { persistent: null, quota: 0, usage: 0, incognito: false, checked: true };
  try {
    if (!navigator.storage?.estimate) return base;
    const est = await navigator.storage.estimate();
    const quota = est.quota ?? 0;
    const usage = est.usage ?? 0;
    // Very small quota is a strong private-window signal in Chrome/Firefox.
    const incognito = quota > 0 && quota < 120 * 1024 * 1024;
    let persistent: boolean | null = null;
    try {
      persistent = (await navigator.storage.persisted?.()) ?? null;
    } catch {
      persistent = null;
    }
    return { persistent, quota, usage, incognito, checked: true };
  } catch {
    return base;
  }
}

export async function requestPersist(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* noop */
  }
  return false;
}

/* ---------- cross-tab sync ---------- */
export type SyncMessage =
  | { type: "map-updated"; id: string }
  | { type: "map-deleted"; id: string }
  | { type: "cleared" };

let channel: BroadcastChannel | null = null;
export function broadcast(msg: SyncMessage) {
  try {
    channel = channel ?? new BroadcastChannel(SYNC_CHANNEL);
    channel.postMessage(msg);
  } catch {
    /* BroadcastChannel unsupported — single-tab mode */
  }
}

export function onSync(handler: (msg: SyncMessage) => void): () => void {
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL);
    ch.onmessage = (e: MessageEvent<SyncMessage>) => handler(e.data);
    return () => ch.close();
  } catch {
    return () => undefined;
  }
}
