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
    <div className="overflow-hidden rounded-xl border border-[#7c3aed]/40 bg-[#f5f3ff] shadow-sm">
      <div className="flex items-stretch gap-0">
        <div
          className="w-1.5 shrink-0 bg-gradient-to-b from-[#c084fc] via-[#8b5cf6] to-[#6d28d9]"
          aria-hidden
        />
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#3b0764]">Cupo Free agotado</p>
            <p className="text-xs font-medium text-[#5b21b6]">
              {openCount}/{FREE_OPEN_LIMIT} pedidos abiertos · ClarivScan en pausa
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#6d28d9] px-3 py-2 text-xs font-bold text-white shadow-sm transition active:scale-[0.97] hover:bg-[#5b21b6]"
          >
            <Sparkles size={14} />
            Ver planes Pro
          </button>
        </div>
      </div>
    </div>
  );
}
