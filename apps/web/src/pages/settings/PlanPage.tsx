import { useState } from "react";
import { SettingsBack } from "@/components/SettingsNavRow";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadPlan, savePlan, type Plan } from "@/lib/store";

export function PlanPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [plan, setPlan] = useState<Plan>(loadPlan());

  function togglePlan() {
    if (!isOwner) return;
    const next: Plan = plan === "free" ? "pro" : "free";
    savePlan(next);
    setPlan(next);
  }

  return (
    <div className="space-y-4">
      <SettingsBack />
      <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Plan actual</p>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            {plan === "pro" ? "Pro" : "Free"}
          </span>
        </div>
        {isOwner ? (
          <Button type="button" variant="ghost" className="w-full" onClick={togglePlan}>
            Cambiar a {plan === "free" ? "Pro" : "Free"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Solo el dueño puede cambiar el plan.</p>
        )}
      </Card>
    </div>
  );
}
