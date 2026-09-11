import { useState } from "react";
import { href } from "../hooks";
import { PublicFooter, PublicNav } from "./Landing";
import { Button, Input } from "../components/ui";
import { ICoffee, IHeart, ILock, ISparkle, ICheck, IArrowRight } from "../components/icons";
import { BMC_URL, KOFI_URL } from "../lib/model";

function PageShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">{eyebrow}</p>
        <h1 className="mt-3 font-display font-extrabold tracking-tight text-3xl sm:text-5xl">{title}</h1>
        <div className="mt-10 space-y-8">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}

const Section = ({ h, children }: { h: string; children: React.ReactNode }) => (
  <section>
    <h2 className="font-display font-bold text-lg border-b border-line pb-2 mb-3">{h}</h2>
    <div className="text-sm text-muted leading-relaxed space-y-3">{children}</div>
  </section>
);

/* ================= Pricing ================= */
export function Pricing() {
  const [key, setKey] = useState("");
  return (
    <PageShell eyebrow="Pricing" title="One plan: free.">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-accent bg-surface p-6 shadow-lift relative overflow-hidden">
          <span className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-md bg-ok/10 text-ok font-bold">current</span>
          <h2 className="font-display font-extrabold text-2xl">SprigPad Free</h2>
          <p className="font-display font-extrabold text-5xl mt-3">$0<span className="text-base font-semibold text-muted"> / forever</span></p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              "Unlimited maps & nodes",
              "All 6 export formats, no watermark",
              "Full offline support",
              "Templates, themes, presentation mode",
              "No account, no ads, no tracking",
            ].map((f) => (
              <li key={f} className="flex gap-2.5"><ICheck size={16} className="text-ok shrink-0 mt-0.5" />{f}</li>
            ))}
          </ul>
          <Button variant="primary" size="lg" className="w-full mt-7" onClick={() => (window.location.hash = "/app")}>
            Open the app <IArrowRight size={16} />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-amber/40 bg-ambersoft p-6">
            <h2 className="font-display font-bold text-lg flex items-center gap-2"><ICoffee size={18} className="text-amber" /> Tip jar</h2>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              If SprigPad earned its place in your workflow, a coffee keeps the lights on. A gift, not a purchase — nothing unlocks,
              because nothing is locked.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="amber" onClick={() => window.open(KOFI_URL, "_blank", "noopener")}><IHeart size={15} /> Ko-fi</Button>
              <Button variant="secondary" onClick={() => window.open(BMC_URL, "_blank", "noopener")}>Buy Me a Coffee</Button>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6 opacity-80">
            <h2 className="font-display font-bold text-lg flex items-center gap-2"><ISparkle size={18} className="text-faint" /> Premium <span className="font-mono text-[10px] uppercase tracking-widest text-faint border border-line rounded px-1.5 py-0.5">someday</span></h2>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              A future optional tier might add niceties (custom themes, bigger icon sets). Core features stay free, forever, by principle.
            </p>
            <div className="mt-4 flex gap-2">
              <Input placeholder="License key" value={key} onChange={(e) => setKey(e.target.value)} disabled aria-label="License key (coming soon)" />
              <Button disabled title="Coming soon"><ILock size={15} /></Button>
            </div>
            <p className="font-mono text-[10px] text-faint mt-2">License activation is not available yet.</p>
          </div>
        </div>
      </div>
      <Section h="The fine print">
        <p>Donations are voluntary gifts processed by Ko-fi / Buy Me a Coffee — SprigPad never sees your payment details and gives nothing in exchange. That's deliberate.</p>
      </Section>
    </PageShell>
  );
}

/* ================= Privacy ================= */
export function Privacy() {
  return (
    <PageShell eyebrow="Legal" title="Privacy policy">
      <p className="font-mono text-xs text-faint">Last updated: January 2026 · The short version: we collect nothing, because we can't.</p>
      <Section h="1. What we collect">
        <p><strong className="text-ink">Nothing.</strong> SprigPad has no server for your content, no account system, no cookies, no analytics, no telemetry, no third-party scripts and no advertising identifiers. Visiting the site transfers only the static files needed to render it.</p>
      </Section>
      <Section h="2. Where your data lives">
        <p>Your mind maps are stored exclusively in your own browser using IndexedDB and localStorage. Exported files are written to your device through your browser's normal download mechanism. We never receive, store, mirror or back up your content.</p>
      </Section>
      <Section h="3. Your controls">
        <p>Export everything (Settings → Data management), import backups, or erase all local data with one confirmed click. Each of these actions is user-initiated; SprigPad never performs them on its own.</p>
      </Section>
      <Section h="4. Hosting">
        <p>The static site is served by a static hosting provider (Vercel/Cloudflare). They deliver files and see standard server logs (IP, user agent) as any web host does. They have no access to your maps, which never leave your device.</p>
      </Section>
      <Section h="5. GDPR note">
        <p>We hold no personal data and therefore act as neither controller nor processor of your content. If you clear your browser data, your maps are unrecoverable by anyone — including us. Regular .json exports are the intended backup path.</p>
      </Section>
      <Section h="6. Children">
        <p>SprigPad is a general-audience tool that collects no data from anyone, children included.</p>
      </Section>
    </PageShell>
  );
}

/* ================= Terms ================= */
export function Terms() {
  return (
    <PageShell eyebrow="Legal" title="Terms of service">
      <p className="font-mono text-xs text-faint">Last updated: January 2026</p>
      <Section h="1. The deal">
        <p>SprigPad is free software provided "as is", without warranty of any kind, express or implied. There is no account and no contract between us; using the tool is acceptance of these terms.</p>
      </Section>
      <Section h="2. Your data, your responsibility">
        <p>You own your mind maps entirely; SprigPad claims no rights to your content. Because data lives only in your browser, you are solely responsible for backups. Export regularly — if browser storage is cleared without a backup file, the data is unrecoverable.</p>
      </Section>
      <Section h="3. Donations">
        <p>Donations via Ko-fi or Buy Me a Coffee are voluntary, non-refundable gifts. They confer no goods, services, features or obligations.</p>
      </Section>
      <Section h="4. Future premium">
        <p>If an optional premium tier is ever introduced, it will be governed by separate terms. Core mind-mapping functionality remains free.</p>
      </Section>
      <Section h="5. Liability">
        <p>To the maximum extent permitted by law, total liability is limited to $0. The tool is unfit for no particular purpose and fit for no guaranteed one.</p>
      </Section>
      <Section h="6. Trademarks">
        <p>"Mind mapping" is used as a generic descriptive term. SprigPad is an original, independent brand.</p>
      </Section>
    </PageShell>
  );
}

/* ================= 404 ================= */
export function NotFound() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <PublicNav />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md py-20">
          <svg viewBox="0 0 200 120" className="w-56 mx-auto" aria-hidden="true">
            <path d="M40 60h40m10 0h20m10 0h30" stroke="var(--line-strong)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 10" />
            <rect x="14" y="44" width="52" height="32" rx="9" fill="var(--accent)" />
            <text x="40" y="65" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="ui-sans-serif">root</text>
            <rect x="112" y="44" width="52" height="32" rx="9" fill="var(--sunken)" stroke="var(--line-strong)" strokeDasharray="4 4" />
            <text x="138" y="64" textAnchor="middle" fill="var(--faint)" fontSize="12" fontFamily="ui-monospace">404</text>
          </svg>
          <h1 className="mt-6 font-display font-extrabold text-3xl tracking-tight">Disconnected branch</h1>
          <p className="mt-3 text-sm text-muted leading-relaxed">This page isn't attached to anything. Maybe it was pruned, maybe it never grew.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="primary" onClick={() => (window.location.hash = "/")}>Back to home</Button>
            <Button variant="secondary" onClick={() => (window.location.hash = "/app")}>Open the app</Button>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
