import { useMemo, useState } from "react";
import { TEMPLATES, instantiateTemplate } from "../lib/templates";
import { countNodes } from "../lib/mapEngine";
import { saveMap } from "../lib/db";
import { makeMap } from "../lib/model";
import { useApp, useUI } from "../store";
import { navigate } from "../hooks";
import { Badge, Button } from "../components/ui";
import { IArrowRight, ITemplate } from "../components/icons";
import { MapThumb } from "./Dashboard";

export default function TemplatesPage() {
  const toast = useUI((s) => s.toast);
  const refresh = useApp((s) => s.refresh);
  const [busy, setBusy] = useState<string | null>(null);

  const previews = useMemo(
    () =>
      TEMPLATES.map((t) => {
        const map = makeMap(t.name);
        map.root = t.build();
        return { t, map, nodes: countNodes(map.root) };
      }),
    []
  );

  const useTemplate = async (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setBusy(id);
    try {
      const map = instantiateTemplate(t);
      const count = parseInt(localStorage.getItem("bp-map-create-count") ?? "0", 10) + 1;
      localStorage.setItem("bp-map-create-count", String(count));
      localStorage.setItem("bp-has-used", "1");
      await saveMap(map);
      await refresh();
      toast("success", "Template ready", `“${t.name}” is yours to reshape.`);
      navigate(`/app/editor/${map.id}`);
    } catch {
      toast("error", "Couldn't create map", "Browser storage refused the write.");
      setBusy(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold flex items-center gap-2">
            <ITemplate size={14} /> Template gallery
          </p>
          <h1 className="mt-2 font-display font-extrabold tracking-tight text-2xl sm:text-3xl">Start from structure, not a blank canvas.</h1>
          <p className="text-sm text-muted mt-1.5">Ten battle-tested shapes for thinking. Each becomes a normal, fully editable map.</p>
        </div>
        <Button variant="ghost" className="ml-auto" onClick={() => navigate("/app")}>
          ← Back to dashboard
        </Button>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {previews.map(({ t, map, nodes }, i) => (
          <div key={t.id} className="anim-fadeup group rounded-xl border border-line bg-surface shadow-card hover:shadow-lift hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
            <div className="h-36 bg-canvas dotgrid dotgrid-fine border-b border-line p-2">
              <div className="h-full transition-transform duration-300 group-hover:scale-[1.04]">
                <MapThumb map={map} />
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base">{t.name}</h2>
                <Badge tone="accent" className="ml-auto">{t.tag}</Badge>
              </div>
              <p className="text-xs text-muted mt-1.5 leading-relaxed flex-1">{t.blurb}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[11px] text-faint">{nodes} nodes</span>
                <Button size="sm" variant="primary" onClick={() => void useTemplate(t.id)} disabled={busy !== null}>
                  {busy === t.id ? "Creating…" : <>Use template <IArrowRight size={14} /></>}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
