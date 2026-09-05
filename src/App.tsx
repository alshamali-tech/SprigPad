import { Component, useEffect, useState, type ReactNode } from "react";
import { useRoute, navigate, useStorageWatch, useTabSync } from "./hooks";
import { dbSupported, listMaps } from "./lib/db";
import { useApp, useUI } from "./store";
import { ToastViewport, cn } from "./components/ui";
import { Logo, IGrid, ITemplate, IUpload, ISliders, IMenuGlyph, IChevronLeft } from "./components/icons";
import Landing from "./pages/Landing";
import { Pricing, Privacy, Terms, NotFound } from "./pages/StaticPages";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import TemplatesPage from "./pages/Templates";
import ImportExportPage from "./pages/ImportExport";
import SettingsPage from "./pages/Settings";
import { WelcomeModal, ImportPromptModal, StorageBanner, DonateNudge, useExportReminder } from "./components/overlays";

/* ---------------- error boundary ---------------- */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center text-xl font-bold">!</div>
            <h1 className="mt-4 font-display font-extrabold text-2xl">A branch snapped</h1>
            <p className="mt-2 text-sm text-muted leading-relaxed">Something threw an unexpected error. Your maps are safe in local storage — reloading almost always fixes it.</p>
            <p className="mt-3 font-mono text-[11px] text-faint break-all">{this.state.error.message}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.hash = "/app"; window.location.reload(); }} className="mt-5 h-10 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accentdeep transition-colors">
              Reload BranchPad
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------------- boot: detect first visit / wiped storage ---------------- */
function useBoot() {
  const markBooted = useApp((s) => s.markBooted);
  const setBootFlags = useApp((s) => s.setBootFlags);
  const refresh = useApp((s) => s.refresh);
  const [fatal, setFatal] = useState(false);

  useEffect(() => {
    if (!dbSupported()) {
      setFatal(true);
      return;
    }
    (async () => {
      try {
        const maps = await listMaps();
        const hasUsed = localStorage.getItem("bp-has-used") === "1";
        const firstVisit = !hasUsed && maps.length === 0;
        const returningEmpty = hasUsed && maps.length === 0;
        localStorage.setItem("bp-last-visit", String(Date.now()));
        useApp.getState().setStorage(useApp.getState().storage);
        setBootFlags(firstVisit, returningEmpty);
        await refresh();
      } catch {
        /* IndexedDB temporarily blocked — the app still renders */
        await refresh().catch(() => undefined);
      } finally {
        markBooted();
      }
    })();
  }, [markBooted, refresh, setBootFlags]);

  return fatal;
}

/* ---------------- app shell ---------------- */
const NAV = [
  { to: "/app", label: "Dashboard", icon: IGrid, match: (p: string[]) => p.length <= 1 },
  { to: "/app/templates", label: "Templates", icon: ITemplate, match: (p: string[]) => p[1] === "templates" },
  { to: "/app/import-export", label: "Import / Export", icon: IUpload, match: (p: string[]) => p[1] === "import-export" },
  { to: "/app/settings", label: "Settings", icon: ISliders, match: (p: string[]) => p[1] === "settings" },
];

function AppShell({ parts }: { parts: string[] }) {
  const route = useRoute();
  const collapsed = localStorage.getItem("bp-sidebar") === "1";
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const announce = useUI((s) => s.announce);
  useExportReminder();

  useEffect(() => setMobileOpen(false), [route.path]);

  const isEditor = parts[1] === "editor";

  const nav = (
    <nav className="flex-1 px-2.5 space-y-1" aria-label="App">
      {NAV.map((n) => {
        const active = n.match(parts);
        return (
          <a
            key={n.to}
            href={"#" + n.to}
            title={n.label}
            className={cn(
              "flex items-center gap-3 rounded-lg h-10 px-3 text-sm font-medium transition-all duration-150",
              active ? "bg-accentsoft text-accent" : "text-muted hover:text-ink hover:bg-sunken",
              isCollapsed && "justify-center px-0"
            )}
            aria-current={active ? "page" : undefined}
          >
            <n.icon size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">{n.label}</span>}
          </a>
        );
      })}
    </nav>
  );

  const brand = (
    <a href="#/" className={cn("flex items-center gap-2.5 px-4 h-14 border-b border-line shrink-0", isCollapsed && "justify-center px-0")} title="BranchPad home">
      <Logo size={26} />
      {!isCollapsed && <span className="font-display font-bold tracking-tight">BranchPad</span>}
    </a>
  );

  return (
    <div className="h-dvh flex flex-col bg-paper text-ink overflow-hidden">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main");
          if (main) {
            main.setAttribute("tabindex", "-1");
            main.focus({ preventScroll: false });
          }
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:z-[110] focus:top-2 focus:left-2 focus:bg-accent focus:text-white focus:px-3 focus:py-2 focus:rounded-lg text-sm"
      >
        Skip to content
      </a>

      {/* mobile top bar */}
      <div className="lg:hidden shrink-0 border-b border-line bg-surface flex items-center px-2 gap-1 print-hide pt-[env(safe-area-inset-top)]" style={{ height: "calc(52px + env(safe-area-inset-top))" }}>
        <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-muted hover:bg-sunken">
          <IMenuGlyph size={19} />
        </button>
        <a href="#/app" className="flex items-center gap-2 min-w-0">
          <Logo size={22} />
          <span className="font-display font-bold text-sm tracking-tight truncate">BranchPad</span>
        </a>
        <span className="ml-auto font-mono text-[10px] text-faint pr-2">local-only</span>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* desktop sidebar */}
        <aside className={cn("print-hide hidden lg:flex flex-col border-r border-line bg-surface transition-all duration-300 shrink-0", isCollapsed ? "w-[64px]" : "w-[228px]")}>
          {brand}
          <div className="h-3" />
          {nav}
          <div className="p-2.5 border-t border-line">
            <button
              onClick={() => {
                setIsCollapsed((v) => {
                  localStorage.setItem("bp-sidebar", v ? "0" : "1");
                  return !v;
                });
              }}
              className={cn("w-full h-9 rounded-lg text-muted hover:text-ink hover:bg-sunken inline-flex items-center gap-2 text-xs font-medium transition-colors", isCollapsed ? "justify-center" : "px-3")}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <IChevronLeft size={15} className={cn("transition-transform duration-300", isCollapsed && "rotate-180")} />
              {!isCollapsed && "Collapse"}
            </button>
          </div>
        </aside>

        {/* mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-[75] print-hide">
            <div className="absolute inset-0 bg-ink/45" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="absolute left-0 top-0 bottom-0 w-[248px] bg-surface border-r border-line shadow-lift flex flex-col anim-fadeup">
              <div className="flex items-center justify-between pr-2">
                {brand}
                <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-muted hover:bg-sunken">✕</button>
              </div>
              <div className="h-3" />
              {nav}
              <p className="p-4 font-mono text-[10px] text-faint">free · offline · yours</p>
            </div>
          </div>
        )}

        {/* main column */}
        <main id="main" className="flex-1 flex flex-col min-w-0 min-h-0">
          <StorageBanner />
          <div className={cn("flex-1 min-h-0", isEditor ? "flex flex-col" : "overflow-y-auto")}>
            {parts[1] === "editor" && parts[2] ? (
              <Editor mapId={parts[2]} />
            ) : parts[1] === "templates" ? (
              <TemplatesPage />
            ) : parts[1] === "import-export" ? (
              <ImportExportPage />
            ) : parts[1] === "settings" ? (
              <SettingsPage />
            ) : (
              <Dashboard />
            )}
          </div>
        </main>
      </div>

      {/* screen reader announcements */}
      <div aria-live="polite" className="sr-only">{announce}</div>
      <WelcomeModal />
      <ImportPromptModal />
      <DonateNudge />
    </div>
  );
}

/* ---------------- fatal: no IndexedDB ---------------- */
function FatalNoStorage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="max-w-md text-center rounded-xl border border-line bg-surface p-8 shadow-card">
        <Logo size={40} />
        <h1 className="mt-4 font-display font-extrabold text-2xl">This browser can't run BranchPad</h1>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          BranchPad stores your maps in your browser's IndexedDB, and this browser doesn't support it (or has blocked it). Please use a
          recent version of Chrome, Firefox, Safari or Edge.
        </p>
      </div>
    </div>
  );
}

/* ---------------- service worker ---------------- */
function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline caching unavailable — app still works online */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
}

/* ---------------- router ---------------- */
function Router() {
  const route = useRoute();
  const { parts } = route;
  useStorageWatch();
  useServiceWorker();
  useTabSync(() => void useApp.getState().refresh());
  const fatal = useBoot();

  if (fatal) return <FatalNoStorage />;

  if (parts[0] === "app") return <AppShell parts={parts} />;
  if (parts.length === 0) return <Landing />;
  if (parts[0] === "pricing") return <Pricing />;
  if (parts[0] === "privacy") return <Privacy />;
  if (parts[0] === "terms") return <Terms />;
  return <NotFound />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router />
      <ToastViewport />
    </ErrorBoundary>
  );
}
