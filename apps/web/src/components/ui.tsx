import type { OrderStatus } from "@clariveye-lite/domain";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-primary text-primary-foreground shadow-sm hover:brightness-110",
    ghost: "bg-card text-foreground border border-border hover:bg-accent",
    danger: "bg-card text-destructive border border-destructive/40 hover:bg-destructive/10",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition duration-150 active:scale-[0.97] active:brightness-95 disabled:pointer-events-none disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-md border border-border bg-background px-3 py-2.5 text-base outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20",
        props.className,
      )}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>;
}

/** Mapea estados Lite → tonos ClarivEye */
export function StatusPill({ status, children }: { status: OrderStatus; children: ReactNode }) {
  const tone =
    status === "entregado"
      ? "bg-[hsl(var(--status-delivered-bg))] text-[hsl(var(--status-delivered-fg))]"
      : status === "listo"
        ? "bg-[hsl(var(--status-preparado-bg))] text-[hsl(var(--status-preparado-fg))]"
        : status === "preparando"
          ? "bg-[hsl(var(--status-empresa-bg))] text-[hsl(var(--status-empresa-fg))]"
          : "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))]";
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-[5.5rem] items-center justify-center whitespace-nowrap rounded-md px-2.5 text-[11px] font-semibold leading-none",
        tone,
      )}
    >
      {children}
    </span>
  );
}
