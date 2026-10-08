import { cn } from "@/lib/cn";

/** Caja isométrica ClarivEye — marca / carga */
export function ClarivBox({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="drop-shadow-md">
        <polygon points="32,6 58,20 58,44 32,58 6,44 6,20" fill="hsl(var(--primary))" opacity="0.95" />
        <polygon points="32,6 58,20 32,34 6,20" fill="white" opacity="0.22" />
        <polygon points="32,34 58,20 58,44 32,58" fill="black" opacity="0.18" />
        <polygon points="32,34 6,20 6,44 32,58" fill="black" opacity="0.28" />
        <polyline
          points="6,20 32,34 58,20"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.7"
        />
        <line x1="32" y1="34" x2="32" y2="58" stroke="white" strokeWidth="1.5" opacity="0.55" />
      </svg>
    </span>
  );
}
