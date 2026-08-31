import { useEffect, useState } from "react";
import { useApp, useUI } from "../store";
import { href, navigate } from "../hooks";
import { Badge, Button, Modal } from "./ui";
import { IAlert, ICoffee, IDatabase, IDownload, IHeart, IUpload, IX } from "./icons";
import { KOFI_URL } from "../lib/model";

/* ---------- Welcome (first visit) ---------- */
export function WelcomeModal() {
  const open = useApp((s) => s.firstVisit);
  const setBootFlags = useApp((s) => s.setBootFlags);
  const close = () => {
    localStorage.setItem("bp-has-used", "1");
    setBootFlags(false, useApp.getState().returningEmpty);
  };
  return (
    <Modal open={open} onClose={close} title="Welcome to BranchPad">
      <div className="space-y-4 text-sm text-muted leading-relaxed">
        <p>
          <strong className="text-ink">Your maps live in this browser.</strong> Nothing is uploaded, ever — there is no server, no account,
          no tracking. Close the tab and come back: everything is still here.
        </p>
        <div className="rounded-lg border border-line bg-sunken/60 p-3.5 space-y-2.5">
          <p className="flex items-start gap-2.5">
            <IDatabase size={16} className="mt-0.5 shrink-0 text-accent" />
            <span>Maps auto-save to your browser's local storage as you type.</span>
          </p>
          <p className="flex items-start gap-2.5">
            <IDownload size={16} className="mt-0.5 shrink-0 text-accent" />
            <span>
              A downloaded <code className="font-mono text-xs bg-sunken border border-line rounded px-1">.json</code> file is your portable
              backup — import it on any device, any browser.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <IAlert size={16} className="mt-0.5 shrink-0 text-amber" />
            <span>Browsers can clear site data on their own. Export a backup every so often.</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="primary"
            onClick={() => {
              close();
              navigate("/app/editor/new");
            }}
          >
            Create my first map
          </Button>
          <Button
            onClick={() => {
              close();
              navigate("/app/import-export");
            }}
          >
            <IUpload size={16} /> Import a file
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Returning user, empty database ---------- */
export function ImportPromptModal() {
  const open = useApp((s) => s.returningEmpty);
  const setBootFlags = useApp((s) => s.setBootFlags);
  const close = () => setBootFlags(useApp.getState().firstVisit, false);
  const daysAway = (() => {
    const last = parseInt(localStorage.getItem("bp-last-visit") ?? "0", 10);
    if (!last) return null;
    return Math.floor((Date.now() - last) / 86400000);
  })();
  return (
    <Modal open={open} onClose={close} title="Welcome back">
      <div className="space-y-4 text-sm text-muted leading-relaxed">
        <p>
          You've used BranchPad here before, but this browser's cached copy of your maps is empty
          {daysAway !== null && daysAway >= 6 ? ` after ${daysAway} days away — some browsers (like Safari) clear storage after a week` : ""}.
        </p>
        <p className="text-ink font-medium">If you exported a backup file, import it to restore everything.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              close();
              navigate("/app/import-export");
            }}
          >
            <IUpload size={16} /> Import backup
          </Button>
          <Button variant="ghost" onClick={close}>
            Start fresh
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Storage health banners ---------- */
export function StorageBanner() {
  const storage = useApp((s) => s.storage);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem("bp-banner-hidden") === "1");
  const [persisted, setPersisted] = useState(false);

  const ratio = storage.quota > 0 ? storage.usage / storage.quota : 0;
  const nearFull = storage.checked && storage.quota > 0 && ratio > 0.8;

  if (hidden || !storage.checked) return null;

  const dismiss = () => {
    sessionStorage.setItem("bp-banner-hidden", "1");
    setHidden(true);
  };

  if (nearFull) {
    return (
      <Banner tone="danger" onDismiss={dismiss}>
        <span className="font-semibold">Storage nearly full.</span> Your browser may evict BranchPad data.{" "}
        <a href={href("/app/import-export")} className="underline font-semibold">
          Export your maps now
        </a>
        .
      </Banner>
    );
  }
  if (storage.incognito) {
    return (
      <Banner tone="warn" onDismiss={dismiss}>
        <span className="font-semibold">Private / incognito window.</span> Your maps will be erased when this window closes.{" "}
        <a href={href("/app/import-export")} className="underline font-semibold">
          Export before leaving
        </a>
        .
      </Banner>
    );
  }
  if (!persisted && storage.persistent === false && storage.quota > 0) {
    return (
      <Banner tone="warn" onDismiss={dismiss}>
        <span className="font-semibold">This browser may clear data when storage runs low.</span>{" "}
        <button
          className="underline font-semibold"
          onClick={async () => {
            const { requestPersist } = await import("../lib/db");
            const ok = await requestPersist();
            if (ok) {
              setPersisted(true);
              dismiss();
            } else dismiss();
          }}
        >
          Request persistent storage
        </button>{" "}
        or export regularly.
      </Banner>
    );
  }
  return null;
}

function Banner({ tone, children, onDismiss }: { tone: "warn" | "danger"; children: React.ReactNode; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className={
        "anim-fadeup flex items-center gap-2.5 px-4 py-2.5 text-sm border-b " +
        (tone === "danger" ? "bg-danger/10 text-danger border-danger/20" : "bg-ambersoft text-ink border-amber/25")
      }
    >
      <IAlert size={16} className={tone === "danger" ? "text-danger shrink-0" : "text-amber shrink-0"} />
      <p className="min-w-0 flex-1">{children}</p>
      <button aria-label="Dismiss warning" onClick={onDismiss} className="opacity-60 hover:opacity-100 shrink-0">
        <IX size={15} />
      </button>
    </div>
  );
}

/* ---------- Donate nudge (after 5th map, 1/session, 7-day cooldown) ---------- */
export function DonateNudge() {
  const [show, setShow] = useState(false);
  const toast = useUI((s) => s.toast);
  const mapCount = useApp((s) => s.maps.length);

  useEffect(() => {
    const count = parseInt(localStorage.getItem("bp-map-create-count") ?? "0", 10);
    const lastToast = parseInt(localStorage.getItem("bp-last-donate-toast") ?? "0", 10);
    const already = sessionStorage.getItem("bp-donate-shown") === "1";
    if (count >= 5 && !already && Date.now() - lastToast > 7 * 86400000) {
      const t = setTimeout(() => {
        setShow(true);
        sessionStorage.setItem("bp-donate-shown", "1");
      }, 2500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapCount]);

  if (!show) return null;
  const close = () => {
    localStorage.setItem("bp-last-donate-toast", String(Date.now()));
    setShow(false);
  };
  return (
    <div className="fixed bottom-4 left-4 z-[95] w-[min(92vw,340px)] anim-toast rounded-xl border border-amber/40 bg-surface shadow-lift overflow-hidden">
      <div className="h-1 bg-amber" />
      <div className="p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ICoffee size={17} className="text-amber" /> Enjoying BranchPad?
        </p>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          It's free forever — no ads, no premium core features. If it saved you time, a coffee on Ko-fi says thanks.
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="amber" size="sm" onClick={() => window.open(KOFI_URL, "_blank", "noopener")}>
            <IHeart size={14} /> Ko-fi
          </Button>
          <Button variant="ghost" size="sm" onClick={close}>
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Export reminder (7-day cadence) ---------- */
export function useExportReminder() {
  const toast = useUI((s) => s.toast);
  const maps = useApp((s) => s.maps);
  useEffect(() => {
    if (maps.length === 0) return;
    const last = parseInt(localStorage.getItem("bp-last-export") ?? "0", 10);
    const reminded = sessionStorage.getItem("bp-export-reminded") === "1";
    if (!reminded && last > 0 && Date.now() - last > 7 * 86400000) {
      sessionStorage.setItem("bp-export-reminded", "1");
      const t = setTimeout(() => {
        toast("info", "Time for a backup", "It's been over a week since your last export. Your .json file is the only copy that survives a browser clean.", "Export all maps", () => navigate("/app/import-export"));
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [maps.length, toast]);
}

export const OfflinePill = ({ online }: { online: boolean }) => (
  <Badge tone={online ? "ok" : "warn"} className={online ? "" : "anim-pulse-dot"}>
    <span className={"h-1.5 w-1.5 rounded-full " + (online ? "bg-ok" : "bg-amber")} />
    {online ? "offline-ready" : "offline"}
  </Badge>
);
