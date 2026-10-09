import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

export function SettingsNavRow({
  to,
  icon,
  title,
  meta,
  className,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  meta?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition active:scale-[0.99]",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function SettingsBack({ to = "/ajustes", label = "Ajustes" }: { to?: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      ← {label}
    </Link>
  );
}
