import { useEffect, useRef, useState } from "react";
import { checkStorage, onSync, requestPersist } from "./lib/db";
import { useApp } from "./store";

/* ---------- tiny hash router ---------- */
export interface Route {
  path: string;
  parts: string[];
}

const parseHash = (): Route => {
  const raw = window.location.hash.replace(/^#/, "");
  const path = raw.startsWith("/") ? raw : "/" + raw;
  const parts = path.split("/").filter(Boolean);
  return { path, parts };
};

export function navigate(to: string) {
  window.location.hash = to.startsWith("/") ? to : "/" + to;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const href = (to: string) => "#" + (to.startsWith("/") ? to : "/" + to);

/* ---------- reveal on scroll ---------- */
export function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    if (el.classList.contains("reveal")) io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/* ---------- storage health watcher ---------- */
export function useStorageWatch() {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const s = await checkStorage();
      if (!cancelled) useApp.getState().setStorage(s);
    };
    void run();
    const onFirstGesture = () => {
      void requestPersist().then(() => run());
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);
}

/* ---------- cross-tab sync listener ---------- */
export function useTabSync(onChange: () => void) {
  useEffect(() => onSync(() => onChange()), [onChange]);
}

/* ---------- online / offline ---------- */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/* ---------- matchMedia ---------- */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const cb = () => setMatches(mq.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, [query]);
  return matches;
}

/* ---------- simple debounced effect ---------- */
export function useDebouncedEffect(fn: () => void, deps: unknown[], ms: number) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    const t = setTimeout(() => cb.current(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, ms]);
}
