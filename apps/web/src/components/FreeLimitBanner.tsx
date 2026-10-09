import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { ArrowRight } from "lucide-react";

/** Franja fina de cupo Free (sin mascota ni estilo popup). */
export function FreeLimitBanner({
  openCount,
  onOpenUpgrade,
}: {
  openCount: number;
  onOpenUpgrade: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpenUpgrade}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-left transition active:scale-[0.99] hover:bg-violet-100/80"
    >
      <p className="min-w-0 text-sm font-medium text-violet-950">
        Cupo Free {openCount}/{FREE_OPEN_LIMIT} ·{" "}
        <span className="font-semibold text-violet-700">Ver Pro</span>
      </p>
      <ArrowRight size={16} className="shrink-0 text-violet-700" />
    </button>
  );
}
