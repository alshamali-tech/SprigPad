import { useMemo, useState } from "react";
import type { MapNode } from "../lib/model";
import { NODE_COLORS, ROOT_STYLE, defaultStyle, makeNode } from "../lib/model";
import { addChild, countNodes } from "../lib/mapEngine";
import { edgePath, layoutMap } from "../lib/layoutEngine";
import { href, useReveal } from "../hooks";
import { KOFI_URL, BMC_URL, SHORTCUTS, APP_VERSION } from "../lib/model";
import { Button, Kbd } from "../components/ui";
import {
  IChevronDown, ICoffee, IDatabase, IDownload, IHeart, IKeyboard, IShield, ISparkle,
  ITemplate, IWifi, Logo, IArrowRight, ICheck, IX, IExternal,
} from "../components/icons";

/* ================= shared chrome ================= */
export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md print-hide">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-6">
        <a href={href("/")} className="flex items-center gap-2.5 min-w-0">
          <Logo size={30} />
          <span className="font-display font-bold text-lg tracking-tight">BranchPad</span>
        </a>
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main">
          {[
            ["Features", "features"],
            ["Your data", "data"],
            ["Compare", "compare"],
            ["FAQ", "faq"],
          ].map(([label, id]) => (
            <button
              key={id}
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="px-3 h-9 inline-flex items-center rounded-lg text-sm text-muted hover:text-ink hover:bg-sunken transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href={href("/pricing")} className="hidden sm:inline-flex px-3 h-9 items-center rounded-lg text-sm text-muted hover:text-ink hover:bg-sunken transition-colors">
            Pricing
          </a>
          <Button variant="primary" size="sm" onClick={() => (window.location.hash = "/app")}>
            Open the app <IArrowRight size={15} />
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface print-hide">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <a href={href("/")} className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-display font-bold text-lg tracking-tight">BranchPad</span>
          </a>
          <p className="text-sm text-muted mt-3 max-w-xs leading-relaxed">
            Free, offline-first mind mapping. Unlimited maps, every export format, and data that never leaves your browser.
          </p>
          <p className="flex items-center gap-1.5 mt-4 text-xs text-faint">
            Made with <IHeart size={13} className="text-danger" /> · free forever ·
            <a href={KOFI_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-amber hover:underline font-medium">
              <ICoffee size={13} /> Ko-fi
            </a>
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint mb-3">Product</p>
          <ul className="space-y-2 text-sm">
            <li><a className="text-muted hover:text-ink transition-colors" href={href("/app")}>Dashboard</a></li>
            <li><a className="text-muted hover:text-ink transition-colors" href={href("/app/templates")}>Templates</a></li>
            <li><a className="text-muted hover:text-ink transition-colors" href={href("/app/import-export")}>Import &amp; export</a></li>
            <li><a className="text-muted hover:text-ink transition-colors" href={href("/pricing")}>Pricing</a></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-faint mb-3">Legal &amp; links</p>
          <ul className="space-y-2 text-sm">
            <li><a className="text-muted hover:text-ink transition-colors" href={href("/privacy")}>Privacy policy</a></li>
            <li><a className="text-muted hover:text-ink transition-colors" href={href("/terms")}>Terms of service</a></li>
            <li>
              <a className="text-muted hover:text-ink transition-colors inline-flex items-center gap-1" href={BMC_URL} target="_blank" rel="noopener">
                Buy Me a Coffee <IExternal size={12} />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
          <span className="font-mono">v{APP_VERSION}</span>
          <span>·</span>
          <span>No trackers. No cookies. No account.</span>
          <span className="sm:ml-auto">
            BranchPad is an independent tool, not affiliated with or endorsed by MindMeister, MeisterLabs or XMind.
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ================= live demo mind map ================= */
const WORDS = ["Research", "Draft", "Review", "Ship", "Notes", "Tasks", "People", "Budget", "Timeline", "Risks", "Wins", "Ideas", "Follow-up", "Metrics"];

function demoTree(): MapNode {
  const root = makeNode("Launch plan", { ...ROOT_STYLE });
  const b = (text: string, i: number, kids: string[] = []) => {
    const n = makeNode(text, defaultStyle(NODE_COLORS[i], 1));
    n.children = kids.map((k) => makeNode(k, defaultStyle(NODE_COLORS[i], 2)));
    return n;
  };
  root.children = [b("Research", 0, ["Surveys", "Interviews"]), b("Build", 2, ["Prototype"]), b("Share", 8, ["Newsletter"])];
  return root;
}

function LiveDemo() {
  const [root, setRoot] = useState<MapNode>(demoTree);
  const [adds, setAdds] = useState(0);
  const layout = useMemo(() => layoutMap(root, "both"), [root]);
  const { bbox } = layout;
  const pad = 30;
  const count = countNodes(root);

  const clickNode = (id: string) => {
    if (count >= 24) return;
    const next = structuredClone(root);
    const word = WORDS[adds % WORDS.length];
    addChild(next, id, word);
    setRoot(next);
    setAdds((a) => a + 1);
  };

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[28px] border border-line bg-surface/60 dotgrid dotgrid-fine -z-10" aria-hidden="true" />
      <div className="anim-float">
        <svg
          viewBox={`${bbox.x - pad} ${bbox.y - pad} ${bbox.w + pad * 2} ${bbox.h + pad * 2}`}
          className="w-full h-auto max-h-[460px] select-none"
          role="img"
          aria-label="Interactive mind map demo. Click a node to add a branch."
        >
          {layout.edges.map((e) => (
            <path
              key={e.from.id + e.to.id}
              d={edgePath(e.from, e.to, "both", "bezier")}
              fill="none"
              stroke="var(--line-strong)"
              strokeWidth={2}
              strokeLinecap="round"
              pathLength={1}
              className="anim-draw"
            />
          ))}
          {[...layout.positions.values()].map((p) => (
            <g key={p.id} onClick={() => clickNode(p.id)} className="cursor-pointer anim-pop" style={{ transformOrigin: `${p.x + p.w / 2}px ${p.y + p.h / 2}px` }}>
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx={p.depth === 0 ? 12 : 9}
                fill={p.node.style.bg}
                stroke={p.node.style.border ?? "transparent"}
                strokeWidth={1.5}
              >
                <title>Click to grow a branch</title>
              </rect>
              {p.lines.map((line, i) => (
                <text
                  key={i}
                  x={p.x + p.w / 2}
                  y={p.y + p.h / 2 + (i - (p.lines.length - 1) / 2) * (p.depth === 0 ? 24 : 19)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={p.depth === 0 ? 17 : p.depth === 1 ? 14 : 13}
                  fontWeight={p.depth <= 1 ? 700 : 500}
                  fill={p.node.style.fg}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 shadow-card">
        <span className="h-2 w-2 rounded-full bg-ok anim-pulse-dot" />
        <span className="font-mono text-[11px] text-muted whitespace-nowrap">
          live — click a node{count >= 24 ? " · fully grown" : ` · ${count} nodes`}
        </span>
      </div>
    </div>
  );
}

/* ================= FAQ ================= */
const FAQS: [string, string][] = [
  ["Is BranchPad really free?", "Yes — 100% free, forever. There is no premium tier for core features, no map limit, no export paywall and no watermark. If you'd like to support development, there's a Ko-fi, but it's never required and never nags."],
  ["Where is my data stored?", "Only in your browser (IndexedDB + localStorage). BranchPad has no server for your content, no account system and no cloud sync. A downloaded .json file is your portable backup — it works on any device."],
  ["What happens if I clear my browser data?", "Your maps are erased with it — we hold no copy and cannot recover anything. That's the trade for true privacy. Export a .json backup regularly (the app will remind you) and you can restore everything with one import."],
  ["Can I import maps from other tools?", "Yes. BranchPad imports its own .json backups, OPML (used by many outliners), Markdown outlines, and FreeMind/Freeplane .mm files. Unsupported or corrupted files are rejected cleanly — your existing data is never touched."],
  ["Does it work offline?", "Fully. After the first load the app is cached by a service worker, and since there is no server to talk to, everything — creating, editing, exporting — keeps working with zero connection."],
  ["Is this a MindMeister alternative?", "It can serve that role. BranchPad is an independent mind mapping tool that removes the things people paywall: map limits, export restrictions and mandatory accounts. We're not affiliated with or endorsed by MindMeister in any way."],
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="max-w-3xl mx-auto divide-y divide-line rounded-xl border border-line bg-surface shadow-card overflow-hidden">
      {FAQS.map(([q, a], i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-sunken/60 transition-colors"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
          >
            <span className="font-semibold text-sm sm:text-base text-ink">{q}</span>
            <IChevronDown size={18} className={"shrink-0 text-faint transition-transform duration-300 " + (open === i ? "rotate-180 text-accent" : "")} />
          </button>
          <div className={"grid transition-all duration-300 " + (open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
            <div className="overflow-hidden">
              <p className="px-5 pb-5 text-sm text-muted leading-relaxed">{a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= page ================= */
export default function Landing() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="min-h-screen bg-paper text-ink">
      <PublicNav />

      {/* ---------- hero ---------- */}
      <section className="noise relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          <div>
            <p className="anim-fadeup font-mono text-[11px] sm:text-xs uppercase tracking-[0.18em] text-accent font-semibold">
              Offline-first mind mapping · no servers involved
            </p>
            <h1 className="anim-fadeup mt-4 font-display font-extrabold tracking-tight text-[2.55rem] leading-[1.04] sm:text-6xl sm:leading-[1.02]" style={{ animationDelay: "60ms" }}>
              Free mind mapping.
              <br />
              <span className="relative inline-block">
                No account.
                <svg className="absolute left-0 -bottom-1.5 w-full" viewBox="0 0 220 12" fill="none" aria-hidden="true" preserveAspectRatio="none">
                  <path d="M3 9c40-6 140-6 214-3" stroke="var(--amber)" strokeWidth="5" strokeLinecap="round" pathLength={1} className="anim-draw" style={{ animationDelay: "700ms" }} />
                </svg>
              </span>
              <br />
              No limits. Works offline.
            </h1>
            <p className="anim-fadeup mt-6 text-base sm:text-lg text-muted leading-relaxed max-w-lg" style={{ animationDelay: "140ms" }}>
              BranchPad is an open canvas for your thinking — unlimited maps, every export format included, and data that never leaves
              your browser. A free alternative to MindMeister, minus the paywall.
            </p>
            <div className="anim-fadeup mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "220ms" }}>
              <Button variant="primary" size="lg" onClick={() => (window.location.hash = "/app")}>
                Start mapping — it's free <IArrowRight size={17} />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => (window.location.hash = "/app/templates")}>
                <ITemplate size={17} /> Browse templates
              </Button>
            </div>
            <p className="anim-fadeup mt-6 font-mono text-[11px] text-faint tracking-wide" style={{ animationDelay: "300ms" }}>
              0 trackers · 0 cookies · 100% local · exports: JSON / OPML / MD / PNG / SVG / PDF
            </p>
          </div>
          <div className="anim-fadeup" style={{ animationDelay: "200ms" }}>
            <LiveDemo />
          </div>
        </div>

        {/* format marquee */}
        <div className="border-y border-line bg-surface/70 overflow-hidden py-3" aria-hidden="true">
          <div className="anim-marquee flex w-max gap-8 font-mono text-xs uppercase tracking-[0.2em] text-faint">
            {Array.from({ length: 2 }).map((_, r) => (
              <div key={r} className="flex gap-8">
                {["JSON backup", "OPML", "Markdown", "PNG", "SVG", "PDF", "FreeMind .mm", "no watermark", "no map limit", "works offline"].map((t) => (
                  <span key={t} className="flex items-center gap-8">
                    {t} <span className="text-accent">✳</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- features bento ---------- */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-24">
        <div className="reveal max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">Why BranchPad</p>
          <h2 className="mt-3 font-display font-extrabold tracking-tight text-3xl sm:text-4xl">
            Everything paywalled elsewhere, <span className="text-accent">free here.</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureTile className="reveal sm:col-span-2 lg:row-span-2" icon={<ISparkle size={20} />}>
            <h3 className="font-display font-bold text-xl">Unlimited everything</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed max-w-md">
              Unlimited maps, unlimited nodes, unlimited exports. The free tier isn't a trial — it's the whole product. Ten built-in
              templates get you from blank canvas to structured thinking in one click.
            </p>
            <div className="mt-6 flex items-end gap-6">
              <div>
                <p className="font-display font-extrabold text-5xl tabular-nums">∞</p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-faint mt-1">maps &amp; nodes</p>
              </div>
              <div>
                <p className="font-display font-extrabold text-5xl tabular-nums">6</p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-faint mt-1">export formats</p>
              </div>
              <div>
                <p className="font-display font-extrabold text-5xl tabular-nums">$0</p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-faint mt-1">forever</p>
              </div>
            </div>
          </FeatureTile>
          <FeatureTile className="reveal" icon={<IWifi size={20} />}>
            <h3 className="font-display font-bold text-lg">Offline-first</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              No connection? Perfect. The whole app runs locally and caches itself after first load. Airplanes welcome.
            </p>
          </FeatureTile>
          <FeatureTile className="reveal" icon={<IShield size={20} />}>
            <h3 className="font-display font-bold text-lg">Private by design</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Zero trackers, zero cookies, zero analytics. There is no server holding your ideas — they live in your browser, full stop.
            </p>
          </FeatureTile>
          <FeatureTile className="reveal" icon={<IDownload size={20} />}>
            <h3 className="font-display font-bold text-lg">Export everything</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">JSON, OPML, Markdown, PNG, SVG and PDF — all free, no watermark, no upsell dialog.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["json", "opml", "md", "png", "svg", "pdf"].map((f) => (
                <span key={f} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sunken border border-line text-muted">.{f}</span>
              ))}
            </div>
          </FeatureTile>
          <FeatureTile className="reveal" icon={<IKeyboard size={20} />}>
            <h3 className="font-display font-bold text-lg">Keyboard-first</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">Tab grows a branch, Enter adds a sibling, arrows walk the tree. Your hands never leave home row.</p>
            <div className="mt-3 flex flex-wrap gap-1.5 items-center">
              <Kbd>Tab</Kbd><Kbd>Enter</Kbd><Kbd>F2</Kbd><Kbd>⌘Z</Kbd>
            </div>
          </FeatureTile>
          <FeatureTile className="reveal sm:col-span-2 lg:col-span-1" icon={<IDatabase size={20} />}>
            <h3 className="font-display font-bold text-lg">Honest storage</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Auto-saves to your browser as you type, and nudges you to download a <span className="font-mono text-xs">.json</span> backup —
              the file is the source of truth, not our cache.
            </p>
          </FeatureTile>
        </div>
      </section>

      {/* ---------- data section: sticky two-column ---------- */}
      <section id="data" className="border-y border-line bg-surface noise">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start reveal">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">The storage contract</p>
            <h2 className="mt-3 font-display font-extrabold tracking-tight text-3xl sm:text-4xl">Your data has two homes. You hold the keys to both.</h2>
            <p className="mt-5 text-muted leading-relaxed max-w-md">
              Most apps keep your work on their servers and rent it back to you. BranchPad inverts that: the browser is the database, and a
              plain file is the backup. No vendor lock-in because there is no vendor.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-accentsoft text-accent">IndexedDB cache</span>
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-ambersoft text-amber">.json = truth</span>
            </div>
          </div>
          <div className="space-y-4">
            {[
              ["01", "Save as you type", "Every keystroke lands in your browser's IndexedDB within two seconds. Close the tab mid-thought; reopen it mid-thought."],
              ["02", "Export the file", "One click downloads a .branchpad.json — maps, styles, notes, layout, viewport. This file, not our cache, is your real backup."],
              ["03", "Restore anywhere", "Import that file on any device or browser and get an exact copy back. Browsers can wipe cache; files don't."],
            ].map(([n, t, b], i) => (
              <div key={n} className="reveal rounded-xl border border-line bg-paper p-5 sm:p-6 shadow-card hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300" style={{ transitionDelay: `${i * 40}ms` }}>
                <p className="font-mono text-xs text-accent font-bold tracking-widest">{n}</p>
                <h3 className="mt-2 font-display font-bold text-lg">{t}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{b}</p>
              </div>
            ))}
            <div className="reveal rounded-xl border border-amber/40 bg-ambersoft p-5 text-sm leading-relaxed">
              <strong>The one honest warning:</strong> if you clear browser data without a backup, those maps are gone — we can't recover
              what we never had. BranchPad reminds you to export, but the habit is yours.
            </div>
          </div>
        </div>
      </section>

      {/* ---------- comparison ---------- */}
      <section id="compare" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-24">
        <div className="reveal max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">Side by side</p>
          <h2 className="mt-3 font-display font-extrabold tracking-tight text-3xl sm:text-4xl">BranchPad vs. the paywall.</h2>
          <p className="mt-4 text-muted leading-relaxed">
            Mind mapping is a decades-old technique, not a subscription service. Here's how the two compare.
          </p>
        </div>
        <div className="reveal mt-10 overflow-x-auto rounded-xl border border-line shadow-card">
          <table className="w-full min-w-[560px] text-sm bg-surface">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left font-mono text-[11px] uppercase tracking-wider text-faint px-5 py-4"> </th>
                <th className="text-left px-5 py-4 bg-accentsoft/60">
                  <span className="flex items-center gap-2 font-display font-bold text-base"><Logo size={20} /> BranchPad</span>
                </th>
                <th className="text-left font-display font-bold text-base px-5 py-4 text-muted">MindMeister (free tier)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Price", "$0 — forever", "$7.50–$19 / month for personal"],
                ["Maps on the free plan", "Unlimited", "3"],
                ["Export on the free plan", "All 6 formats included", "Removed for free users (June 2026)"],
                ["Works offline", ["yes", "Fully, after first load"], ["no", "Requires connection"]],
                ["Account required", ["yes", "None — open and go"], ["no", "Email sign-up"]],
                ["Watermark on exports", ["yes", "None"], ["no", "On free exports"]],
                ["Where your data lives", "Your browser + your files", "Their servers"],
              ].map(([label, bp, mm]) => {
                const bpArr = Array.isArray(bp) ? bp : ["yes", bp as string];
                const mmArr = Array.isArray(mm) ? mm : ["no", mm as string];
                return (
                  <tr key={label as string} className="hover:bg-sunken/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-muted whitespace-nowrap">{label as string}</td>
                    <td className="px-5 py-3.5 bg-accentsoft/40">
                      <span className="flex items-start gap-2">
                        <ICheck size={16} className="text-ok shrink-0 mt-0.5" />
                        <span className="font-semibold">{bpArr[1]}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-start gap-2 text-muted">
                        <IX size={16} className="text-faint shrink-0 mt-0.5" />
                        <span>{mmArr[1]}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="reveal mt-3 text-xs text-faint">
          Comparison based on MindMeister's published pricing and free-tier changes as of mid-2026. BranchPad is an independent tool — not
          affiliated with, endorsed by, or connected to MindMeister or MeisterLabs.
        </p>
      </section>

      {/* ---------- shortcuts strip ---------- */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 reveal">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">Fluent in keystrokes</p>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            {SHORTCUTS.slice(0, 9).map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3 py-1.5 border-b border-line/60">
                <span className="text-sm text-muted">{s.label}</span>
                <span className="flex gap-1 shrink-0">
                  {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-24">
        <div className="reveal text-center max-w-xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">Questions</p>
          <h2 className="mt-3 font-display font-extrabold tracking-tight text-3xl sm:text-4xl">Fair questions, straight answers.</h2>
        </div>
        <div className="reveal mt-10">
          <Faq />
        </div>
      </section>

      {/* ---------- donate + CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="reveal relative overflow-hidden rounded-2xl border border-amber/40 bg-ambersoft noise">
          <div className="relative z-10 px-6 py-12 sm:px-12 grid lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
            <div>
              <h2 className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl">Free forever. Funded by kindness.</h2>
              <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed max-w-lg">
                BranchPad has no investors to please and no data to sell. It's sustained by people who find it useful and toss a coffee's
                worth into the jar. Optional, guilt-free, no perks attached — that's the point.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="amber" size="lg" onClick={() => window.open(KOFI_URL, "_blank", "noopener")}>
                  <ICoffee size={17} /> Buy a coffee on Ko-fi
                </Button>
                <Button variant="secondary" size="lg" onClick={() => (window.location.hash = "/app")}>
                  Or just start mapping
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="h-36 w-36 rounded-3xl bg-amber/15 border border-amber/40 flex items-center justify-center text-amber rotate-6">
                <ICoffee size={64} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function FeatureTile({ className = "", icon, children }: { className?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={"rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-card hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 " + className}>
      <div className="h-10 w-10 rounded-lg bg-accentsoft text-accent flex items-center justify-center">{icon}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
