import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Check, Minus, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClarivBox } from "@/components/ClarivBox";
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
  { ok: true, label: "Soporte prioritario (demo)" },
];

const PRICE = {
  monthly: { amount: 29, suffix: "/mes", note: "Cancela cuando quieras" },
  annual: { amount: 19, suffix: "/mes", note: "Facturado 228 €/año · ahorras 34%" },
};

function FeatureRow({ ok, label, tone }: { ok: boolean; label: string; tone: "free" | "pro" }) {
  return (
    <li className="flex items-start gap-2 text-[13px] leading-snug">
      {ok ? (
        <Check
          size={15}
          strokeWidth={2.5}
          className={cn("mt-0.5 shrink-0", tone === "pro" ? "text-[#f5d0fe]" : "text-[#6ee7b7]")}
        />
      ) : (
        <Minus size={15} className="mt-0.5 shrink-0 text-white/35" />
      )}
      <span className={ok ? "font-medium text-white" : "text-white/45 line-through decoration-white/30"}>
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
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function goPro() {
    if (!isOwner) return;
    savePlan("pro");
    onUpgraded?.();
    onClose();
  }

  const price = PRICE[billing];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div
        className="relative z-10 mx-2 mb-2 max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#a78bfa]/40 bg-[#1a1028] p-4 text-white shadow-[0_25px_80px_-12px_rgba(88,28,135,0.65)] sm:mb-0 sm:p-6"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 100% 0%, rgba(167,139,250,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(192,132,252,0.12), transparent 50%)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="mb-5 flex items-center gap-3 pr-8">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c4b5fd] to-[#7c3aed] shadow-lg shadow-violet-900/40 ring-2 ring-white/25">
            <ClarivBox size={34} className="brightness-125" />
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-[#fce7f3] text-[#86198f] shadow">
              <Zap size={12} fill="currentColor" />
            </span>
          </div>
          <div>
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#e9d5ff]">
              ClarivEye Lite
            </p>
            <h2 id="upgrade-title" className="font-display text-2xl font-semibold tracking-tight text-white">
              Desbloquea la salida
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/85">
              Cupo Free agotado
              {typeof openCount === "number" ? ` · ${openCount}/${FREE_OPEN_LIMIT} abiertos` : ""}.
              Elige cómo quieres seguir.
            </p>
          </div>
        </div>

        <div className="mb-5 flex justify-center">
          <div
            className="inline-flex rounded-full border border-white/25 bg-black/40 p-1"
            role="group"
            aria-label="Periodo de facturación"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold transition",
                billing === "monthly"
                  ? "bg-white text-[#3b0764] shadow"
                  : "text-white/75 hover:text-white",
              )}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold transition",
                billing === "annual"
                  ? "bg-[#f5d0fe] text-[#701a75] shadow"
                  : "text-white/75 hover:text-white",
              )}
            >
              Anual
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  billing === "annual" ? "bg-[#86198f] text-white" : "bg-white/15 text-[#fce7f3]",
                )}
              >
                −34%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Free — superficie más clara para leer */}
          <div className="flex flex-col rounded-2xl border border-white/20 bg-[#2a1f3d] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Gratis</p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-white">0 €</p>
            <p className="text-xs font-medium text-white/70">Para probar el flujo</p>
            <ul className="mt-4 flex-1 space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <FeatureRow key={f.label} ok={f.ok} label={f.label} tone="free" />
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-white/35 bg-white/10 py-2.5 text-sm font-bold text-white transition hover:bg-white/18"
            >
              Seguir en Free
            </button>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-[#e9d5ff] bg-[#4c1d95] p-4 shadow-lg shadow-violet-950/50">
            <div
              className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-[#f0abfc]/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white">Pro</p>
              <span className="rounded-full bg-[#fce7f3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#86198f]">
                Recomendado
              </span>
            </div>
            <p className="relative mt-1 font-display text-3xl font-semibold tracking-tight text-white">
              {price.amount} €
              <span className="text-base font-semibold text-white/80">{price.suffix}</span>
            </p>
            <p className="relative text-xs font-medium text-[#f3e8ff]">{price.note}</p>
            <ul className="relative mt-4 flex-1 space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <FeatureRow key={f.label} ok={f.ok} label={f.label} tone="pro" />
              ))}
            </ul>
            {isOwner ? (
              <button
                type="button"
                onClick={goPro}
                className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#fce7f3] py-2.5 text-sm font-bold text-[#701a75] shadow-md transition active:scale-[0.98] hover:bg-white"
              >
                <Sparkles size={16} />
                Activar Pro {billing === "annual" ? "anual" : "mensual"}
              </button>
            ) : (
              <p className="relative mt-5 rounded-xl bg-black/25 px-3 py-2 text-center text-xs font-medium text-white/90">
                Pide al dueño que active Pro en Ajustes.
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] font-medium text-white/65">
          Demo local · el cobro real llegará más adelante ·{" "}
          <Link
            to="/ajustes"
            onClick={onClose}
            className="font-semibold text-[#f5d0fe] underline underline-offset-2 hover:text-white"
          >
            Ajustes
          </Link>
        </p>
      </div>
    </div>
  );
}
