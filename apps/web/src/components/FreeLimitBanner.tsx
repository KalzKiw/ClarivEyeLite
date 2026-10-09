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
    <div className="overflow-hidden rounded-xl border border-[#7c3aed]/35 bg-gradient-to-br from-[#5b21b6]/15 via-[#faf5ff] to-card shadow-sm shadow-violet-900/5">
      <div className="flex items-stretch gap-0">
        <div
          className="w-1.5 shrink-0 bg-gradient-to-b from-[#e879f9] via-[#a78bfa] to-[#7c3aed]"
          aria-hidden
        />
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#4c1d95]">Cupo Free agotado</p>
            <p className="text-xs text-[#6b21a8]/75">
              {openCount}/{FREE_OPEN_LIMIT} pedidos abiertos · ClarivScan en pausa
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-700/25 transition active:scale-[0.97] hover:brightness-110"
          >
            <Sparkles size={14} />
            Ver planes Pro
          </button>
        </div>
      </div>
    </div>
  );
}
