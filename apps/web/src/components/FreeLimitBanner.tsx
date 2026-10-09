import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { BoxMascot } from "@/components/BoxMascot";

/**
 * Banner de conversión: morado + Boxie + copy + CTA.
 * Tipografía = Sora (misma que el resto de la app).
 */
export function FreeLimitBanner({
  openCount,
  onOpenUpgrade,
}: {
  openCount: number;
  onOpenUpgrade: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-lg shadow-violet-900/25"
      style={{ background: "linear-gradient(115deg, #5b21b6 0%, #6d28d9 45%, #7e22ce 100%)" }}
    >
      <div className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-[#4c1d95]/75" aria-hidden />
      <div className="pointer-events-none absolute -bottom-14 left-16 size-44 rounded-full bg-[#4c1d95]/5" aria-hidden />

      <div className="relative flex items-center gap-3 px-3.5 py-3 sm:gap-4 sm:px-4 sm:py-3.5">
        <BoxMascot mood="happy" className="h-14 w-[52px] shrink-0 drop-shadow-md sm:h-16 sm:w-[58px]" />

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-white/90 sm:text-xs">
            ¡Espera! No frenes la salida
          </p>
          <p className="text-sm font-semibold leading-snug tracking-tight text-white sm:text-[15px]">
            Cupo Free lleno · {openCount}/{FREE_OPEN_LIMIT} abiertos
          </p>
          <p className="mt-0.5 hidden text-xs text-white/75 sm:block">
            Pasa a Pro y sigue con ClarivScan sin tope.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenUpgrade}
          className="shrink-0 rounded-full bg-[#e11d48] px-3.5 py-2.5 text-[11px] font-semibold tracking-wide text-white shadow-md shadow-rose-950/25 transition active:scale-[0.97] hover:bg-[#be123c] sm:px-5 sm:text-xs"
        >
          Ver Pro
        </button>
      </div>
    </div>
  );
}
