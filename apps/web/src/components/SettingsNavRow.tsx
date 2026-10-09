import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

export function SettingsNavRow({
  to,
  icon,
  title,
  meta,
  badge,
  className,
  tone = "primary",
}: {
  to: string;
  icon: ReactNode;
  title: string;
  meta?: string;
  badge?: string;
  className?: string;
  tone?: "primary" | "violet" | "emerald" | "amber" | "rose" | "sky";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
  };

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-3.5 py-3.5 shadow-sm transition active:scale-[0.99]",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {badge ? (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {badge}
              </span>
            ) : null}
          </div>
          {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function SettingsBack({ to = "/ajustes", label = "Ajustes" }: { to?: string; label?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      ← {label}
    </Link>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
