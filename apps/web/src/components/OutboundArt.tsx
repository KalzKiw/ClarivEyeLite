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
        "bg-[#10253f]",
        compact ? "h-full w-full" : "absolute inset-0",
        "bg-[radial-gradient(ellipse_at_30%_40%,#1e4a8c_0%,#10253f_55%)]",
      )}
    />
  );
}

/** Panel visual: escena 3D (R3F) con fallback sólido si WebGL falla. */
export function OutboundArt({ className, compact = false }: Props) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <SceneErrorBoundary fallback={<Fallback compact={compact} />}>
        <Suspense fallback={<Fallback compact={compact} />}>
          <OutboundScene compact={compact} />
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
