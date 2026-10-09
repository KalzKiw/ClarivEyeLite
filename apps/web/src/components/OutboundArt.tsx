import { Component, Suspense, type ReactNode } from "react";
import { LoadingMark, PackSpinner } from "@/components/PackSpinner";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  /** @deprecated Ignorado: el spinner unifica tamaños vía size */
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
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

/** Marca visual ligera: PackSpinner (sustituye la escena outbound pesada). */
export function OutboundArt({ className, size = "lg", label }: Props) {
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-[#0b1a2e]", className)}>
      <SceneErrorBoundary fallback={<LoadingMark fill label={label ?? "Cargando…"} size={size} />}>
        <Suspense fallback={<LoadingMark fill label={label ?? "Cargando…"} size={size} />}>
          <PackSpinner size={size} label={label} />
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
