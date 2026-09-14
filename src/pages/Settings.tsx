import { useState } from "react";
import { fmtBytes, APP_VERSION, KOFI_URL, CONTACT_EMAIL } from "../lib/model";
import { clearAll, requestPersist } from "../lib/db";
import { exportAllJson } from "../lib/exporters";
import { useApp, useUI } from "../store";
import { navigate } from "../hooks";
import { Badge, Button, ConfirmDialog, Input, Segmented } from "../components/ui";
import { ICoffee, IDatabase, IDownload, IHeart, ILock, IMonitor, IMoon, ISun, ITrash, IExternal, IShield, ICheck } from "../components/icons";

export default function SettingsPage() {
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);
  const maps = useApp((s) => s.maps);
  const storage = useApp((s) => s.storage);
  const refresh = useApp((s) => s.refresh);
  const toast = useUI((s) => s.toast);
  const [confirmClear, setConfirmClear] = useState(false);
  const [persistBusy, setPersistBusy] = useState(false);

  const ratio = storage.quota > 0 ? Math.min(1, storage.usage / storage.quota) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">Preferences</p>
      <h1 className="mt-2 font-display font-extrabold tracking-tight text-2xl sm:text-3xl">Settings</h1>

      {/* appearance */}
      <section className="mt-8 rounded-xl border border-line bg-surface shadow-card p-5">
        <h2 className="font-display font-bold text-lg">Appearance</h2>
        <p className="text-sm text-muted mt-1">Theme preference is stored in this browser only.</p>
        <div className="mt-4">
          <Segmented
            ariaLabel="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: <><ISun size={14} /> Light</> },
              { value: "dark", label: <><IMoon size={14} /> Dark</> },
              { value: "system", label: <><IMonitor size={14} /> System</> },
            ]}
          />
        </div>
      </section>

      {/* data */}
      <section className="mt-4 rounded-xl border border-line bg-surface shadow-card p-5">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><IDatabase size={18} className="text-accent" /> Data management</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border border-line p-2.5 sm:p-3.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">Maps</p>
            <p className="font-display font-extrabold text-xl sm:text-2xl mt-1 tabular-nums">{maps.length}</p>
          </div>
          <div className="rounded-lg border border-line p-2.5 sm:p-3.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">Space</p>
            <p className="font-display font-extrabold text-xl sm:text-2xl mt-1 tabular-nums">{storage.checked ? fmtBytes(storage.usage) : "…"}</p>
          </div>
          <div className="rounded-lg border border-line p-2.5 sm:p-3.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">Persist</p>
            <p className="mt-1.5">
              {storage.persistent ? <Badge tone="ok"><ICheck size={11} /> granted</Badge> : <Badge tone="amber">best-effort</Badge>}
            </p>
          </div>
        </div>
        {storage.quota > 0 && (
          <div className="mt-4">
            <div className="flex justify-between font-mono text-[11px] text-faint mb-1.5">
              <span>browser quota</span>
              <span>{fmtBytes(storage.usage)} / {fmtBytes(storage.quota)}</span>
            </div>
            <div className="h-2 rounded-full bg-sunken overflow-hidden">
              <div className={"h-full rounded-full transition-all duration-500 " + (ratio > 0.8 ? "bg-danger" : ratio > 0.5 ? "bg-amber" : "bg-accent")} style={{ width: `${Math.max(2, ratio * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              exportAllJson(maps, theme);
              localStorage.setItem("bp-last-export", String(Date.now()));
              toast("success", "Backup downloaded", `${maps.length} maps in one .json file.`);
            }}
            disabled={maps.length === 0}
          >
            <IDownload size={16} /> Export all ({maps.length})
          </Button>
          <Button onClick={() => navigate("/app/import-export")}>Import…</Button>
          {!storage.persistent && (
            <Button
              onClick={async () => {
                setPersistBusy(true);
                const ok = await requestPersist();
                setPersistBusy(false);
                toast(ok ? "success" : "info", ok ? "Persistent storage granted" : "Request declined", ok ? "The browser will fight harder to keep your maps." : "This browser won't promise persistence — export backups regularly.");
              }}
              disabled={persistBusy}
            >
              <IShield size={16} /> {persistBusy ? "Asking…" : "Request persistent storage"}
            </Button>
          )}
        </div>
        <div className="mt-6 rounded-lg border border-danger/25 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">Danger zone</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">Erases every map from this browser. There is no server copy and no undo — export first.</p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmClear(true)} disabled={maps.length === 0}>
            <ITrash size={14} /> Clear all local data
          </Button>
        </div>
      </section>

      {/* donate */}
      <section className="mt-4 rounded-xl border border-amber/40 bg-ambersoft p-5">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><ICoffee size={18} className="text-amber" /> Support SprigPad</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-xl">
          Why donate? Because free software survives on goodwill. Your tip funds hosting, coffee and the occasional weekend of deep work.
          It changes nothing in the app — no perks, no features, no guilt. That's the deal.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="amber" onClick={() => window.open(KOFI_URL, "_blank", "noopener")}><IHeart size={15} /> Support on Ko-fi</Button>
        </div>
      </section>

      {/* premium stub */}
      <section className="mt-4 rounded-xl border border-line bg-surface shadow-card p-5 opacity-90">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          SprigPad Pro <Badge tone="neutral">coming someday</Badge>
        </h2>
        <p className="text-sm text-muted mt-1.5">If a premium tier ever exists, it will add optional niceties — never core features. Enter a key here when that day comes.</p>
        <div className="mt-3 flex gap-2">
          <Input placeholder="XXXX-XXXX-XXXX" disabled aria-label="License key (not available yet)" />
          <Button disabled title="License activation is not available yet"><ILock size={15} /></Button>
        </div>
      </section>

      {/* about */}
      <section className="mt-4 rounded-xl border border-line bg-surface shadow-card p-5">
        <h2 className="font-display font-bold text-lg">About</h2>
        <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <p className="text-muted">Version <span className="font-mono text-ink">v{APP_VERSION}</span></p>
          <p className="text-muted">Storage <span className="font-mono text-ink">IndexedDB + files</span></p>
          <p className="text-muted">Tracking <span className="font-mono text-ok">none, verifiably</span></p>
          <p className="text-muted">Runs <span className="font-mono text-ink">100% in your browser</span></p>
        </div>
        <div className="mt-4 pt-4 border-t border-line">
          <p className="text-sm text-muted mb-2">Found a bug or have a feature request?</p>
          <a 
            href={`mailto:${CONTACT_EMAIL}?subject=SprigPad Feedback`}
            className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <span className="font-mono">{CONTACT_EMAIL}</span>
            <IExternal size={13} />
          </a>
        </div>
        <p className="mt-4 text-xs text-faint leading-relaxed">
          SprigPad is an independent, free, and open-source tool.
          Read the <a className="underline hover:text-ink" href="#/privacy">privacy policy</a> and <a className="underline hover:text-ink" href="#/terms">terms</a>.
        </p>
      </section>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearAll();
          await refresh();
          toast("info", "All local data cleared", "This browser now holds zero maps. A fresh start.");
        }}
        title="Erase everything?"
        confirmLabel="Yes, erase all"
        body={<>This deletes <strong className="text-ink">{maps.length} map{maps.length === 1 ? "" : "s"}</strong> from this browser permanently. If you have not downloaded a .json backup, they are gone for good — no server, no recycle bin, no mercy.</>}
      />
    </div>
  );
}
