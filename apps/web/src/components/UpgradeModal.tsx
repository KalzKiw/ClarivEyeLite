import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Check, Minus, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { BoxMascot } from "@/components/BoxMascot";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import { savePlan } from "@/lib/store";

type Billing = "monthly" | "annual";

const FREE_FEATURES: Array<{ ok: boolean; label: string }> = [
  { ok: true, label: `Hasta ${FREE_OPEN_LIMIT} pedidos abiertos` },
  { ok: true, label: "1 usuario" },
  { ok: true, label: "ClarivScan básico" },
  { ok: false, label: "Equipo / operarios" },
  { ok: false, label: "Cupo ilimitado" },
];

const PRO_FEATURES: Array<{ ok: boolean; label: string }> = [
  { ok: true, label: "Pedidos abiertos ilimitados" },
  { ok: true, label: "Hasta 3 usuarios" },
  { ok: true, label: "ClarivScan sin freno" },
  { ok: true, label: "Equipo / operarios" },
  { ok: true, label: "Soporte prioritario" },
];

const PRICE = {
  monthly: { amount: 29, period: "mes", note: "Sin permanencia" },
  annual: { amount: 19, period: "mes", note: "Ahorras 120 €/año" },
};

function FeatureRow({ ok, label, onDark }: { ok: boolean; label: string; onDark?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-[13px] leading-snug">
      <span
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full",
          ok
            ? onDark
              ? "bg-white/20 text-white"
              : "bg-violet-100 text-violet-700"
            : onDark
              ? "bg-white/10 text-white/40"
              : "bg-zinc-100 text-zinc-400",
        )}
      >
        {ok ? <Check size={11} strokeWidth={3} /> : <Minus size={11} strokeWidth={2.5} />}
      </span>
      <span
        className={cn(
          ok ? "font-medium" : "line-through decoration-1",
          onDark ? (ok ? "text-white" : "text-white/40") : ok ? "text-zinc-800" : "text-zinc-400",
        )}
      >
        {label}
      </span>
    </li>
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

      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#faf8ff] shadow-2xl sm:max-w-3xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative border-b border-violet-100 bg-white px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full bg-zinc-100 p-2 text-zinc-600 transition hover:bg-zinc-200"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 pr-10">
              <BoxMascot mood="wow" className="h-14 w-[52px] shrink-0 sm:h-16 sm:w-[58px]" />
              <div className="min-w-0">
                <h2 id="upgrade-title" className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                  Pricing
                </h2>
                <p className="mt-1 text-sm leading-snug text-zinc-600">
                  Cupo Free agotado ({used}/{FREE_OPEN_LIMIT}). Pásate a Pro sin límite.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
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
                    "rounded-full px-4 py-2 text-xs font-semibold transition",
                    billing === "monthly" ? "bg-zinc-900 text-white shadow" : "text-zinc-600",
                  )}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold transition",
                    billing === "annual" ? "bg-violet-700 text-white shadow" : "text-zinc-600",
                  )}
                >
                  Anual
                  <span className="ml-1.5 rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-800">
                    −34%
                  </span>
                </button>
              </div>
            </div>

            {/* Móvil: Pro arriba. Desktop: Free | Pro */}
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4">
              <div
                className="order-1 flex flex-col rounded-2xl border-2 border-violet-600 p-4 sm:order-2 sm:p-5"
                style={{
                  background: "linear-gradient(165deg, #5b21b6 0%, #6d28d9 55%, #86198f 100%)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white">Pro</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-violet-800">
                    <Sparkles size={10} />
                    Recomendado
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {price.amount} €
                  <span className="text-base font-semibold text-white/85"> /{price.period}</span>
                </p>
                <p className="mt-1 text-sm font-medium text-fuchsia-100">{price.note}</p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {PRO_FEATURES.map((f) => (
                    <FeatureRow key={f.label} ok={f.ok} label={f.label} onDark />
                  ))}
                </ul>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={goPro}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-violet-900 shadow-md active:scale-[0.98]"
                  >
                    <Zap size={16} fill="currentColor" />
                    Activar Pro
                  </button>
                ) : (
                  <p className="mt-5 rounded-xl bg-black/20 px-3 py-2.5 text-center text-xs font-medium text-white">
                    Pide al dueño que active Pro.
                  </p>
                )}
              </div>

              <div className="order-2 flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:order-1 sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Free</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-900">
                  0 €
                  <span className="text-base font-semibold text-zinc-500"> /siempre</span>
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-600">Para probar</p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <FeatureRow key={f.label} ok={f.ok} label={f.label} />
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 w-full rounded-xl border-2 border-zinc-200 bg-zinc-50 py-3 text-sm font-semibold text-zinc-800"
                >
                  Seguir Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
