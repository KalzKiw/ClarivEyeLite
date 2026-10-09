import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { SettingsBack } from "@/components/SettingsNavRow";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadScanStats } from "@/lib/scan-stats";
import { savePlan, type Plan } from "@/lib/store";
import { usePlan } from "@/lib/use-app-store";

const PRO_BENEFITS = [
  "Pedidos abiertos ilimitados",
  "Hasta 3 usuarios",
  "ClarivScan sin freno",
  "Equipo / operarios",
];

export function PlanPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const plan = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const stats = loadScanStats();
  const resolved = stats.ok + stats.assisted;

  function togglePlan() {
    if (!isOwner) return;
    const next: Plan = plan === "free" ? "pro" : "free";
    savePlan(next);
  }

  return (
    <div className="space-y-4">
      <SettingsBack />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invierte en tu salida de almacén</p>
      </div>

      {resolved > 0 ? (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">ClarivPack te ha ayudado</p>
          <p className="mt-1 text-lg font-semibold">
            {resolved} lectura{resolved === 1 ? "" : "s"} ClarivScan resuelta
            {resolved === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.ok} OK · {stats.assisted} asistidas · {stats.fail} fallidas
          </p>
        </Card>
      ) : null}

      <Card
        className={
          plan === "pro"
            ? "space-y-3 border-violet-300 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white"
            : "space-y-3"
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-wider ${plan === "pro" ? "text-white/80" : "text-muted-foreground"}`}
            >
              Plan actual
            </p>
            <p className="mt-1 text-2xl font-semibold">{plan === "pro" ? "Pro" : "Free"}</p>
          </div>
          {plan === "pro" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase">
              <Sparkles size={12} />
              Activo
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground">
              Limitado
            </span>
          )}
        </div>
        {plan === "free" ? (
          <p className="text-sm text-muted-foreground">3 pedidos abiertos · 1 usuario</p>
        ) : (
          <p className="text-sm text-white/85">Sin tope · hasta 3 usuarios</p>
        )}
      </Card>

      {plan === "free" ? (
        <Card className="space-y-4 border-violet-200 bg-gradient-to-b from-violet-50 to-card">
          <div>
            <p className="text-lg font-semibold tracking-tight">Pasa a Pro</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Desde <span className="font-semibold text-violet-700">19 €/mes</span> (anual) · sin
              permanencia
            </p>
          </div>
          <ul className="space-y-2">
            {PRO_BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <span className="flex size-5 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Check size={12} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          {isOwner ? (
            <Button type="button" className="w-full" onClick={() => setUpgradeOpen(true)}>
              Ver planes y pagar
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Solo el dueño puede cambiar el plan.</p>
          )}
        </Card>
      ) : null}

      {isOwner ? (
        <button
          type="button"
          onClick={togglePlan}
          className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          Demo: cambiar a {plan === "free" ? "Pro" : "Free"} sin cobro
        </button>
      ) : null}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
