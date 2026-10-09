import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Sparkles } from "lucide-react";

/** Banner compacto que invita a Pro cuando el cupo free está lleno. */
export function FreeLimitBanner({
  openCount,
  onOpenUpgrade,
}: {
  openCount: number;
  onOpenUpgrade: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
      <div className="flex items-stretch gap-0">
        <div className="w-1 shrink-0 bg-primary" aria-hidden />
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Cupo Free agotado</p>
            <p className="text-xs text-muted-foreground">
              {openCount}/{FREE_OPEN_LIMIT} pedidos abiertos · ClarivScan en pausa
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition active:scale-[0.97] hover:brightness-110"
          >
            <Sparkles size={14} />
            Suscribirse a Pro
          </button>
        </div>
      </div>
    </div>
  );
}
