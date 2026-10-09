import { Component, Suspense, type ReactNode } from "react";
import { OutboundScene } from "@/components/OutboundScene";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  compact?: boolean;
};

class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    if (this.state.err) return this.props.fallback;
    return this.props.children;
  }
}

function Fallback({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[#0b1a2e]",
        compact ? "h-full w-full" : "absolute inset-0",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 px-4">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-[#1e3a5f] ring-1 ring-[#3b82f6]/40" />
        <p className="text-sm font-medium text-white/70">Cargando escena…</p>
      </div>
    </div>
  );
}

/** Panel visual: escena 3D (R3F) con fallback sólido si WebGL falla. */
export function OutboundArt({ className, compact = false }: Props) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <SceneErrorBoundary fallback={<Fallback compact={compact} />}>
        <Suspense fallback={<Fallback compact={compact} />}>
          <OutboundScene compact={compact} />
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
