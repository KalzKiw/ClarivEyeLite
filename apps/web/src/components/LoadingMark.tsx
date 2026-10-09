import { cn } from "@/lib/cn";

/** Fallback ligero (sin three.js) para Suspense / estados de carga. */
export function LoadingMark({
  className,
  label = "Cargando…",
  size = "sm",
  fill = false,
}: {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  fill?: boolean;
}) {
  const dim = size === "lg" ? "h-10 w-10" : size === "md" ? "h-8 w-8" : "h-6 w-6";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-muted-foreground",
        fill && "absolute inset-0 h-full w-full",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-2 border-primary/25 border-t-primary",
          dim,
        )}
        aria-hidden
      />
      {label ? <span className="text-xs font-medium">{label}</span> : null}
    </div>
  );
}
