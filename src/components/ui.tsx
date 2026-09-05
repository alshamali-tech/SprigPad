import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { useUI } from "../store";
import { IAlert, ICheck, IInfo, IX } from "./icons";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ================= Button ================= */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "amber" | "dark";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantCls: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accentdeep shadow-sm border border-transparent",
  secondary: "bg-surface text-ink border border-line hover:border-linestrong hover:bg-sunken",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-sunken border border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
  amber: "bg-amber text-[#221605] hover:opacity-90 border border-transparent font-semibold",
  dark: "bg-ink text-paper hover:opacity-90 border border-transparent",
};
const sizeCls = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-base gap-2" };

export const Button = ({ variant = "secondary", size = "md", className = "", children, ...rest }: BtnProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 select-none",
      "active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap max-w-full",
      variantCls[variant],
      sizeCls[size],
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

export const IconBtn = ({ label, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => (
  <button
    aria-label={label}
    title={label}
    className={cn(
      "inline-flex items-center justify-center rounded-lg h-9 w-9 shrink-0 text-muted transition-all duration-150",
      "hover:text-ink hover:bg-sunken active:scale-90 disabled:opacity-40 disabled:pointer-events-none",
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

/* ================= Badge ================= */
export const Badge = ({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "accent" | "ok" | "warn" | "amber"; children: ReactNode; className?: string }) => {
  const tones = {
    neutral: "bg-sunken text-muted border-line",
    accent: "bg-accentsoft text-accent border-transparent",
    ok: "bg-ok/10 text-ok border-transparent",
    warn: "bg-danger/10 text-danger border-transparent",
    amber: "bg-ambersoft text-amber border-transparent",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-4 font-medium", tones[tone], className)}>
      {children}
    </span>
  );
};

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="kbd">{children}</kbd>;

/* ================= Input ================= */
export const Input = ({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      /* text-base on phones: 16px prevents iOS from zooming the page on focus */
      "w-full h-10 rounded-lg border border-line bg-surface px-3 text-base sm:text-sm text-ink placeholder:text-faint",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 transition-all",
      className
    )}
    {...rest}
  />
);

export const TextArea = ({ className = "", ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "w-full rounded-lg border border-line bg-surface px-3 py-2 text-base sm:text-sm text-ink placeholder:text-faint min-h-[90px]",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 transition-all resize-y",
      className
    )}
    {...rest}
  />
);

export const Select = ({ className = "", children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25",
      className
    )}
    {...rest}
  >
    {children}
  </select>
);

/* ================= Segmented ================= */
export const Segmented = <T extends string>({ options, value, onChange, ariaLabel }: { options: { value: T; label: ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; ariaLabel: string }) => (
  <div role="group" aria-label={ariaLabel} className="inline-flex rounded-lg border border-line bg-sunken p-0.5 gap-0.5">
    {options.map((o) => (
      <button
        key={o.value}
        title={o.title}
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className={cn(
          "px-2.5 h-8 rounded-md text-xs font-medium transition-all duration-150 inline-flex items-center gap-1.5",
          value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/* ================= Modal ================= */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((n) => !n.hasAttribute("disabled"));
    const first = focusables()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && (i <= 0)) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      restore.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/45 dark:bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={cn("anim-modal relative w-full rounded-xl border border-line bg-surface shadow-lift max-h-[90vh] flex flex-col", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line shrink-0">
          <h2 className="font-display font-bold text-base text-ink">{title}</h2>
          <IconBtn label="Close dialog" onClick={onClose}>
            <IX size={18} />
          </IconBtn>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = "Delete", danger = true }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-muted leading-relaxed">{body}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ================= Dropdown ================= */
export function Dropdown({ trigger, items, align = "right" }: { trigger: ReactNode; items: { label: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={cn("anim-pop absolute z-40 mt-1.5 min-w-[190px] rounded-lg border border-line bg-surface p-1 shadow-lift", align === "right" ? "right-0" : "left-0")} role="menu">
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={cn(
                "w-full text-left px-3 h-9 rounded-md text-sm flex items-center gap-2 transition-colors disabled:opacity-40",
                it.danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-sunken"
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



/* ================= Toasts ================= */
export function ToastViewport() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[100] flex flex-col gap-2 w-[min(92vw,360px)]" aria-live="polite" role="status">
      {toasts.map((t) => (
        <ToastCard key={t.id} id={t.id} kind={t.kind} title={t.title} body={t.body} actionLabel={t.actionLabel} onAction={t.onAction} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ id, kind, title, body, actionLabel, onAction, onClose }: { id: number; kind: string; title: string; body?: string; actionLabel?: string; onAction?: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, actionLabel ? 9000 : 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const icon = kind === "success" ? <ICheck size={16} /> : kind === "error" ? <IX size={16} /> : kind === "warning" ? <IAlert size={16} /> : <IInfo size={16} />;
  const color = kind === "success" ? "text-ok" : kind === "error" ? "text-danger" : kind === "warning" ? "text-amber" : "text-accent";
  return (
    <div className="anim-toast rounded-xl border border-line bg-surface shadow-lift p-3.5 flex items-start gap-3">
      <span className={cn("mt-0.5 shrink-0", color)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink leading-tight">{title}</p>
        {body && <p className="text-xs text-muted mt-1 leading-relaxed">{body}</p>}
        {actionLabel && (
          <button
            className="mt-2 text-xs font-semibold text-accent hover:underline"
            onClick={() => {
              onAction?.();
              onClose();
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <button aria-label="Dismiss notification" onClick={onClose} className="text-faint hover:text-ink transition-colors shrink-0">
        <IX size={14} />
      </button>
    </div>
  );
}

/* ================= EmptyState ================= */
export const EmptyState = ({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6 reveal is-in">
    <div className="h-14 w-14 rounded-2xl bg-sunken border border-line flex items-center justify-center text-faint mb-4">{icon}</div>
    <h3 className="font-display font-bold text-lg text-ink">{title}</h3>
    <p className="text-sm text-muted mt-1.5 max-w-sm leading-relaxed">{body}</p>
    {children && <div className="mt-5 flex flex-wrap gap-2 justify-center">{children}</div>}
  </div>
);

/* ================= Stat ================= */
export const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) => (
  <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
    <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{label}</p>
    <p className="font-display text-2xl font-bold text-ink mt-1 tabular-nums">{value}</p>
    {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
  </div>
);
