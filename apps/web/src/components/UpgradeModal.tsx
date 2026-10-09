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

function FeatureRow({ ok, label, accent }: { ok: boolean; label: string; accent?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-[13px] leading-snug">
      {ok ? (
        <Check
          size={15}
          className={cn("mt-0.5 shrink-0", accent ? "text-[#c4b5fd]" : "text-emerald-600")}
        />
      ) : (
        <Minus size={15} className="mt-0.5 shrink-0 text-muted-foreground/50" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40"}>
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
        className="absolute inset-0 bg-[#1e1033]/55 backdrop-blur-[3px]"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div
        className="relative z-10 mx-2 mb-2 max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#7c3aed]/35 bg-[#0f0a1a] p-4 text-white shadow-[0_25px_80px_-20px_rgba(124,58,237,0.55)] sm:mb-0 sm:p-6"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(139,92,246,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(91,33,182,0.25), transparent 50%)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Personalidad */}
        <div className="mb-5 flex items-center gap-3 pr-8">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] shadow-lg shadow-violet-900/50 ring-2 ring-white/20">
            <ClarivBox size={34} className="brightness-125" />
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-[#f0abfc] text-[#4c1d95] shadow">
              <Zap size={12} fill="currentColor" />
            </span>
          </div>
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d8b4fe]">
              ClarivEye Lite
            </p>
            <h2 id="upgrade-title" className="font-display text-2xl font-semibold tracking-tight text-white">
              Desbloquea la salida
            </h2>
            <p className="mt-1 text-sm text-white/65">
              Cupo Free agotado
              {typeof openCount === "number" ? ` · ${openCount}/${FREE_OPEN_LIMIT} abiertos` : ""}.
              Elige cómo quieres seguir.
            </p>
          </div>
        </div>

        {/* Toggle mensual / anual */}
        <div className="mb-5 flex justify-center">
          <div
            className="inline-flex rounded-full border border-white/15 bg-black/30 p-1"
            role="group"
            aria-label="Periodo de facturación"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                billing === "monthly"
                  ? "bg-white text-[#3b0764] shadow"
                  : "text-white/60 hover:text-white",
              )}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                billing === "annual"
                  ? "bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow"
                  : "text-white/60 hover:text-white",
              )}
            >
              Anual
              <span className="ml-1.5 rounded-full bg-[#f0abfc]/25 px-1.5 py-0.5 text-[10px] text-[#f5d0fe]">
                −34%
              </span>
            </button>
          </div>
        </div>

        {/* Cards Free | Pro */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Gratis</p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-tight">0 €</p>
            <p className="text-xs text-white/45">Para probar el flujo</p>
            <ul className="mt-4 flex-1 space-y-2.5 text-white/90">
              {FREE_FEATURES.map((f) => (
                <FeatureRow key={f.label} ok={f.ok} label={f.label} />
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-white/20 bg-transparent py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Seguir en Free
            </button>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#c084fc]/50 bg-gradient-to-b from-[#5b21b6]/80 to-[#2e1065]/90 p-4 shadow-lg shadow-violet-950/40">
            <div
              className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-[#e879f9]/25 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#e9d5ff]">Pro</p>
              <span className="rounded-full bg-[#f0abfc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#4c1d95]">
                Recomendado
              </span>
            </div>
            <p className="relative mt-1 font-display text-3xl font-semibold tracking-tight">
              {price.amount} €
              <span className="text-base font-medium text-white/60">{price.suffix}</span>
            </p>
            <p className="relative text-xs text-[#ddd6fe]">{price.note}</p>
            <ul className="relative mt-4 flex-1 space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <FeatureRow key={f.label} ok={f.ok} label={f.label} accent />
              ))}
            </ul>
            {isOwner ? (
              <button
                type="button"
                onClick={goPro}
                className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e879f9] via-[#c084fc] to-[#8b5cf6] py-2.5 text-sm font-bold text-[#2e1065] shadow-md shadow-fuchsia-900/30 transition active:scale-[0.98] hover:brightness-110"
              >
                <Sparkles size={16} />
                Activar Pro {billing === "annual" ? "anual" : "mensual"}
              </button>
            ) : (
              <p className="relative mt-5 rounded-xl bg-black/30 px-3 py-2 text-center text-xs text-white/70">
                Pide al dueño que active Pro en Ajustes.
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/40">
          Demo local · el cobro real llegará más adelante ·{" "}
          <Link to="/ajustes" onClick={onClose} className="text-[#d8b4fe] underline-offset-2 hover:underline">
            Ajustes
          </Link>
        </p>
      </div>
    </div>
  );
}
