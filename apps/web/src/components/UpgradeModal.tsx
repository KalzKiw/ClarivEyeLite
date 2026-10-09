import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Check, Minus, Package, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { BoxMascot } from "@/components/BoxMascot";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import { savePlan } from "@/lib/store";

type Billing = "monthly" | "annual";

const FREE_FEATURES: Array<{ ok: boolean; label: string }> = [
  { ok: true, label: `Hasta ${FREE_OPEN_LIMIT} pedidos abiertos` },
  { ok: true, label: "1 usuario (dueño)" },
  { ok: true, label: "ClarivScan básico" },
  { ok: false, label: "Equipo / operarios" },
  { ok: false, label: "Cupo ilimitado" },
  { ok: false, label: "Prioridad de soporte" },
];

const PRO_FEATURES: Array<{ ok: boolean; label: string }> = [
  { ok: true, label: "Pedidos abiertos ilimitados" },
  { ok: true, label: "Hasta 3 usuarios" },
  { ok: true, label: "ClarivScan sin freno" },
  { ok: true, label: "Equipo / operarios" },
  { ok: true, label: "Perfiles de lectura por negocio" },
  { ok: true, label: "Soporte prioritario" },
];

const PRICE = {
  monthly: { amount: 29, period: "mes", note: "Sin permanencia" },
  annual: { amount: 19, period: "mes", note: "Ahorras 120 €/año" },
};

function FeatureRow({
  ok,
  label,
  onDark,
  compact,
}: {
  ok: boolean;
  label: string;
  onDark?: boolean;
  compact?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start leading-snug",
        compact ? "gap-1.5 text-[11px] sm:gap-2.5 sm:text-[13px]" : "gap-2.5 text-[13px]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex shrink-0 items-center justify-center rounded-full",
          compact ? "size-4 sm:size-[18px]" : "size-[18px]",
          ok
            ? onDark
              ? "bg-white/20 text-white"
              : "bg-violet-100 text-violet-700"
            : onDark
              ? "bg-white/10 text-white/40"
              : "bg-zinc-100 text-zinc-400",
        )}
      >
        {ok ? (
          <Check size={compact ? 9 : 11} strokeWidth={3} />
        ) : (
          <Minus size={compact ? 9 : 11} strokeWidth={2.5} />
        )}
      </span>
      <span
        className={cn(
          "min-w-0 break-words",
          ok ? "font-medium" : "line-through decoration-1",
          onDark ? (ok ? "text-white" : "text-white/40") : ok ? "text-zinc-800" : "text-zinc-400",
        )}
      >
        {label}
      </span>
    </li>
  );
}

/** Barra de cupo en 3 slots (FREE_OPEN_LIMIT). */
function QuotaSlots({ used }: { used: number }) {
  const filled = Math.min(FREE_OPEN_LIMIT, Math.max(0, used));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white/90">Cupo Free</p>
        <p className="text-sm font-bold tabular-nums text-white">
          {filled}/{FREE_OPEN_LIMIT} llenos
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2" role="img" aria-label={`${filled} de ${FREE_OPEN_LIMIT} pedidos abiertos`}>
        {Array.from({ length: FREE_OPEN_LIMIT }, (_, i) => {
          const isFull = i < filled;
          return (
            <div
              key={i}
              className={cn(
                "flex h-10 flex-col items-center justify-center rounded-xl border-2 transition sm:h-12",
                isFull
                  ? "border-fuchsia-200/80 bg-gradient-to-b from-[#fce7f3] to-[#f0abfc] shadow-sm shadow-fuchsia-950/20"
                  : "border-white/25 bg-black/20",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide sm:text-[11px]",
                  isFull ? "text-violet-900" : "text-white/50",
                )}
              >
                {isFull ? "Lleno" : "Libre"}
              </span>
              <span className={cn("text-xs font-bold sm:text-sm", isFull ? "text-violet-950" : "text-white/40")}>
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-sm font-medium leading-snug text-white">
        Has alcanzado el límite de pedidos. Pásate a Premium para tener pedidos sin límite.
      </p>
    </div>
  );
}

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

  const price = PRICE[billing];
  const used = typeof openCount === "number" ? openCount : FREE_OPEN_LIMIT;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1e1035]/70 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#faf8ff] shadow-2xl shadow-violet-950/40 sm:rounded-3xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className="relative px-4 pb-5 pt-3 sm:px-7 sm:pb-6 sm:pt-6"
            style={{
              background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 42%, #a21caf 100%)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 pr-10">
              <BoxMascot mood="wow" className="h-14 w-[52px] shrink-0 drop-shadow-md sm:h-[72px] sm:w-[66px]" />
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  <Package size={12} />
                  Planes ClarivEye
                </div>
                <h2
                  id="upgrade-title"
                  className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl"
                >
                  Pricing
                </h2>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/20 bg-black/15 p-3.5 sm:p-4">
              <QuotaSlots used={used} />
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-6">
            <div className="flex justify-center">
              <div
                className="inline-flex rounded-full border border-violet-200 bg-white p-1 shadow-sm"
                role="group"
                aria-label="Periodo de facturación"
              >
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5",
                    billing === "monthly"
                      ? "bg-zinc-900 text-white shadow"
                      : "text-zinc-600 hover:text-zinc-900",
                  )}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5",
                    billing === "annual"
                      ? "bg-violet-700 text-white shadow"
                      : "text-zinc-600 hover:text-zinc-900",
                  )}
                >
                  Anual
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      billing === "annual"
                        ? "bg-fuchsia-200 text-fuchsia-900"
                        : "bg-violet-100 text-violet-700",
                    )}
                  >
                    −34%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-4">
              <div className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:text-[11px]">
                  Free
                </p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 sm:mt-2 sm:text-4xl">
                  0 €
                  <span className="text-xs font-semibold text-zinc-500 sm:text-base"> /siempre</span>
                </p>
                <p className="mt-1 text-[11px] font-medium leading-snug text-zinc-600 sm:text-sm">
                  Ideal para probar
                </p>
                <ul className="mt-3 flex-1 space-y-2 sm:mt-4 sm:space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <FeatureRow key={f.label} ok={f.ok} label={f.label} compact />
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 w-full rounded-lg border-2 border-zinc-200 bg-zinc-50 py-2.5 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-white sm:mt-5 sm:rounded-xl sm:py-3 sm:text-sm"
                >
                  Seguir Free
                </button>
              </div>

              <div
                className="relative flex min-w-0 flex-col rounded-xl border-2 border-violet-600 p-3 sm:rounded-2xl sm:p-5"
                style={{
                  background: "linear-gradient(165deg, #5b21b6 0%, #6d28d9 55%, #86198f 100%)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white sm:text-[11px]">
                    Pro
                  </p>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-[10px]">
                    <Sparkles size={10} />
                    Top
                  </span>
                </div>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:mt-2 sm:text-4xl">
                  {price.amount} €
                  <span className="text-xs font-semibold text-white/85 sm:text-base">
                    {" "}
                    /{price.period}
                  </span>
                </p>
                <p className="mt-1 text-[11px] font-medium leading-snug text-fuchsia-100 sm:text-sm">
                  {price.note}
                </p>
                <ul className="mt-3 flex-1 space-y-2 sm:mt-4 sm:space-y-2.5">
                  {PRO_FEATURES.map((f) => (
                    <FeatureRow key={f.label} ok={f.ok} label={f.label} onDark compact />
                  ))}
                </ul>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={goPro}
                    className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-white py-2.5 text-xs font-bold text-violet-900 shadow-md transition active:scale-[0.98] hover:bg-fuchsia-50 sm:mt-5 sm:gap-2 sm:rounded-xl sm:py-3 sm:text-sm"
                  >
                    <Zap size={14} fill="currentColor" />
                    Activar Pro
                  </button>
                ) : (
                  <p className="mt-4 rounded-lg bg-black/20 px-2 py-2 text-center text-[10px] font-medium text-white sm:mt-5 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs">
                    Pide al dueño que active Pro.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
