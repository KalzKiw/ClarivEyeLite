import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Sparkles } from "lucide-react";

/** Mini-banner al estilo del popup (morado + CTA coral). */
export function FreeLimitBanner({
  openCount,
  onOpenUpgrade,
}: {
  openCount: number;
  onOpenUpgrade: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-md shadow-violet-900/20"
      style={{ background: "linear-gradient(105deg, #5b21b6 0%, #7c3aed 55%, #86198f 100%)" }}
    >
      <div className="pointer-events-none absolute -left-6 -top-8 size-28 rounded-full bg-[#4c1d95]/70" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 right-10 size-32 rounded-full bg-[#4c1d95]/45" aria-hidden />

      <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/85">¡Espera! Cupo Free lleno</p>
          <p className="text-sm font-bold leading-snug text-white">
            {openCount}/{FREE_OPEN_LIMIT} abiertos · pasa a Pro en 1 clic
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpgrade}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#e11d48] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm transition active:scale-[0.97] hover:bg-[#be123c]"
        >
          <Sparkles size={14} />
          Ver Pro
        </button>
      </div>
    </div>
  );
}
