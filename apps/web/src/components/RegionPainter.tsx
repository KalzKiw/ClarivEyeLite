import { useCallback, useRef, useState } from "react";
import type { NormRect } from "@clariveye-lite/domain";
import { cn } from "@/lib/cn";

type Props = {
  /** Object URL or data URL of preview image */
  imageUrl: string;
  value: NormRect | null;
  onChange: (rect: NormRect) => void;
  label: string;
  colorClass?: string;
};

/**
 * Arrastra un rectángulo sobre la imagen (coords 0–1).
 */
export function RegionPainter({
  imageUrl,
  value,
  onChange,
  label,
  colorClass = "border-primary bg-primary/20",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );

  const toNorm = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
    };
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toNorm(e.clientX, e.clientY);
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const p = toNorm(e.clientX, e.clientY);
    setDrag({ ...drag, x1: p.x, y1: p.y });
  }

  function onPointerUp() {
    if (!drag) return;
    const rect: NormRect = {
      x0: Math.min(drag.x0, drag.x1),
      y0: Math.min(drag.y0, drag.y1),
      x1: Math.max(drag.x0, drag.x1),
      y1: Math.max(drag.y0, drag.y1),
    };
    if (rect.x1 - rect.x0 > 0.02 && rect.y1 - rect.y0 > 0.02) {
      onChange(rect);
    }
    setDrag(null);
  }

  const shown = drag
    ? {
        x0: Math.min(drag.x0, drag.x1),
        y0: Math.min(drag.y0, drag.y1),
        x1: Math.max(drag.x0, drag.x1),
        y1: Math.max(drag.y0, drag.y1),
      }
    : value;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Arrastra un rectángulo sobre la zona.</p>
      <div
        ref={wrapRef}
        className="relative touch-none overflow-hidden rounded-lg border border-border bg-muted select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img src={imageUrl} alt="Documento" className="pointer-events-none block w-full" draggable={false} />
        {shown ? (
          <div
            className={cn("pointer-events-none absolute border-2", colorClass)}
            style={{
              left: `${shown.x0 * 100}%`,
              top: `${shown.y0 * 100}%`,
              width: `${(shown.x1 - shown.x0) * 100}%`,
              height: `${(shown.y1 - shown.y0) * 100}%`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
