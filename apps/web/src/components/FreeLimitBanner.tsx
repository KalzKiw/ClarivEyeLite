import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Sparkles } from "lucide-react";
import { BoxMascot } from "@/components/BoxMascot";

/** Banner de cupo Free con progreso y CTA a Pro. */
export function FreeLimitBanner({
  openCount,
  onOpenUpgrade,
}: {
  openCount: number;
  onOpenUpgrade: () => void;
}) {
  const pct = Math.min(100, Math.round((openCount / FREE_OPEN_LIMIT) * 100));
  const full = openCount >= FREE_OPEN_LIMIT;

  return (
    <button
      type="button"
      onClick={onOpenUpgrade}
      className="relative w-full overflow-hidden rounded-2xl border border-violet-300/80 bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-700 p-4 text-left text-white shadow-md transition active:scale-[0.99] hover:brightness-105"
    >
      <div className="pointer-events-none absolute -right-2 -top-2 opacity-90">
        <BoxMascot mood={full ? "wow" : "happy"} className="h-[72px] w-[72px]" />
      </div>
      <div className="relative z-10 max-w-[75%] space-y-2">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
          <Sparkles size={12} />
          Cupo Free
        </p>
        <p className="text-base font-semibold leading-snug">
          {full
            ? "Has llenado tus pedidos abiertos"
            : `${openCount} de ${FREE_OPEN_LIMIT} pedidos abiertos`}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs font-medium text-white/90">
          {full ? "Pasa a Pro y sigue sin freno →" : "Pro = ilimitados + equipo →"}
        </p>
      </div>
    </button>
  );
}
