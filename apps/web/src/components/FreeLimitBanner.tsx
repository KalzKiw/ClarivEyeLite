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
  const fill = Math.min(100, (openCount / FREE_OPEN_LIMIT) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm shadow-violet-900/5">
      <div
        className="h-1 w-full bg-zinc-100"
        aria-hidden
      >
        <div
          className="h-full bg-gradient-to-r from-fuchsia-400 via-violet-500 to-violet-700 transition-all"
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-900">Cupo Free agotado</p>
          <p className="text-xs font-medium text-zinc-600">
            {openCount}/{FREE_OPEN_LIMIT} pedidos abiertos · ClarivScan en pausa
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpgrade}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm shadow-violet-800/20 transition active:scale-[0.97] hover:bg-violet-800"
        >
          <Sparkles size={14} />
          Ver planes Pro
        </button>
      </div>
    </div>
  );
}
