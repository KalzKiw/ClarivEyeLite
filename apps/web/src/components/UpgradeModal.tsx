import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UpgradeArt } from "@/components/UpgradeArt";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import { savePlan } from "@/lib/store";

type Billing = "monthly" | "annual";

const PRICE = {
  monthly: { label: "29 €/mes", hint: "Sin permanencia" },
  annual: { label: "19 €/mes", hint: "228 €/año · ahorras 34%" },
};

const PRO_BULLETS = [
  "Pedidos abiertos ilimitados",
  "Hasta 3 usuarios en el equipo",
  "ClarivScan sin tope de cupo",
];

export function UpgradeModal({
  open,
  onClose,
  onUpgraded,
  openCount,
}: {
  open: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
  openCount?: number;
}) {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [billing, setBilling] = useState<Billing>("annual");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function goPro() {
    if (!isOwner) return;
    savePlan("pro");
    onUpgraded?.();
    onClose();
  }

  const used = typeof openCount === "number" ? openCount : FREE_OPEN_LIMIT;
  const price = PRICE[billing];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1a0b2e]/75 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />

      {/* Popup estilo banner horizontal */}
      <div
        className="relative z-10 mx-0 flex w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl shadow-2xl shadow-violet-950/50 sm:mx-auto sm:flex-row sm:rounded-3xl"
        style={{ background: "linear-gradient(118deg, #5b21b6 0%, #6d28d9 48%, #7e22ce 100%)" }}
      >
        {/* Círculos de fondo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-16 -top-20 size-64 rounded-full bg-[#4c1d95]/80" />
          <div className="absolute -bottom-24 left-8 size-72 rounded-full bg-[#4c1d95]/55" />
          <div className="absolute -right-10 top-1/3 size-48 rounded-full bg-[#86198f]/25 blur-2xl" />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full p-2 text-white/90 transition hover:bg-white/15"
          aria-label="Cerrar"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        {/* Izquierda — ilustración */}
        <div className="relative flex min-h-[200px] items-end justify-center px-4 pt-8 sm:w-[42%] sm:min-h-[340px] sm:items-center sm:pt-6">
          <UpgradeArt className="h-[210px] w-auto drop-shadow-xl sm:h-[280px]" />
        </div>

        {/* Derecha — copy + CTA */}
        <div className="relative flex flex-1 flex-col justify-center px-6 pb-8 pt-2 sm:px-8 sm:py-10 sm:pr-12">
          <p className="text-sm font-semibold text-white/90">
            ¡Espera! No frenes la salida
            {used >= FREE_OPEN_LIMIT ? ` · ${used}/${FREE_OPEN_LIMIT} abiertos` : ""}
          </p>
          <h2
            id="upgrade-title"
            className="font-display mt-2 text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white sm:text-[1.85rem]"
          >
            Pasa a Pro y sigue escaneando sin límite de pedidos
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            Free llega hasta {FREE_OPEN_LIMIT} pedidos abiertos. Con Pro desbloqueas cupo ilimitado y
            equipo — en menos de un minuto.
          </p>

          <ul className="mt-4 space-y-2">
            {PRO_BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check size={12} strokeWidth={3} className="text-white" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          {/* Toggle facturación */}
          <div className="mt-5 inline-flex self-start rounded-full bg-black/25 p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                billing === "monthly" ? "bg-white text-violet-900" : "text-white/75 hover:text-white",
              )}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                billing === "annual" ? "bg-white text-violet-900" : "text-white/75 hover:text-white",
              )}
            >
              Anual · {PRICE.annual.label}
            </button>
          </div>
          <p className="mt-1.5 text-xs font-medium text-white/70">
            {price.label} · {price.hint}
          </p>

          {isOwner ? (
            <button
              type="button"
              onClick={goPro}
              className="mt-5 w-full max-w-xs rounded-full bg-[#e11d48] px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg shadow-rose-950/30 transition active:scale-[0.98] hover:bg-[#be123c] sm:w-auto"
            >
              Activar Pro ahora
            </button>
          ) : (
            <p className="mt-5 rounded-xl bg-black/25 px-4 py-3 text-sm font-medium text-white">
              Pide al dueño que active Pro en Ajustes.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-white/65">
            <button type="button" onClick={onClose} className="hover:text-white hover:underline">
              Seguir en Free
            </button>
            <Link to="/ajustes" onClick={onClose} className="hover:text-white hover:underline">
              Ver planes en Ajustes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
