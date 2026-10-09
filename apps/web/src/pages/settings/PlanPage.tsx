import { Check } from "lucide-react";
import { useState } from "react";
import { SettingsBack } from "@/components/SettingsNavRow";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadScanStats } from "@/lib/scan-stats";
import { savePlan, type Plan } from "@/lib/store";
import { usePlan } from "@/lib/use-app-store";

const FREE_POINTS = ["3 pedidos abiertos", "1 usuario", "ClarivScan básico"];
const PRO_POINTS = [
  "Pedidos abiertos ilimitados",
  "Hasta 3 usuarios / operarios",
  "ClarivScan sin freno",
  "Equipo y roles",
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
    <div className="space-y-5">
      <SettingsBack />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu plan actual y lo que desbloquea Pro
        </p>
      </div>

      {resolved > 0 ? (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            ClarivScan este mes
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums">
            {resolved} lectura{resolved === 1 ? "" : "s"} resuelta{resolved === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {stats.ok} OK · {stats.assisted} asistidas · {stats.fail} fallidas
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          className={`space-y-3 p-4 ${
            plan === "free" ? "border-primary ring-1 ring-primary/30" : "opacity-90"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Free</p>
            {plan === "free" ? (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                Actual
              </span>
            ) : null}
          </div>
          <p className="text-2xl font-semibold tracking-tight">0 €</p>
          <ul className="space-y-1.5">
            {FREE_POINTS.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                <Check size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                {p}
              </li>
            ))}
          </ul>
        </Card>

        <Card
          className={`space-y-3 p-4 ${
            plan === "pro" ? "border-primary ring-1 ring-primary/30" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Pro</p>
            {plan === "pro" ? (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                Actual
              </span>
            ) : null}
          </div>
          <p className="text-2xl font-semibold tracking-tight">
            19 €<span className="text-sm font-normal text-muted-foreground">/mes</span>
          </p>
          <p className="text-xs text-muted-foreground">Facturación anual · sin permanencia</p>
          <ul className="space-y-1.5">
            {PRO_POINTS.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-foreground">
                <Check size={14} className="mt-0.5 shrink-0 text-primary" strokeWidth={2.5} />
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {plan === "free" && isOwner ? (
        <Button type="button" className="w-full" onClick={() => setUpgradeOpen(true)}>
          Pasar a Pro
        </Button>
      ) : null}
      {plan === "free" && !isOwner ? (
        <p className="text-center text-sm text-muted-foreground">
          Solo el dueño del negocio puede cambiar el plan.
        </p>
      ) : null}
      {plan === "pro" ? (
        <p className="text-center text-sm text-muted-foreground">
          Pro activo. Gracias por apoyar ClarivPack.
        </p>
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
