import {
  CreditCard,
  GraduationCap,
  LogOut,
  ScrollText,
  Store,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SettingsNavRow, SettingsSection } from "@/components/SettingsNavRow";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/use-app-store";
import { loadScanStats } from "@/lib/scan-stats";

function initials(name?: string) {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function SettingsPage() {
  const { logout, business, user } = useAuth();
  const plan = usePlan();
  const stats = loadScanStats();
  const resolved = stats.ok + stats.assisted;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
      </div>

      <Link
        to="/ajustes/perfil"
        className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-4 shadow-sm transition hover:border-primary/40 active:scale-[0.99]"
      >
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
          {initials(user?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <p className="mt-1 truncate text-xs font-medium text-primary">
            {business?.name ?? "Negocio"} · {plan === "pro" ? "Pro" : "Free"}
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Editar</span>
      </Link>

      <SettingsSection title="Plan y valor">
        <SettingsNavRow
          to="/ajustes/plan"
          icon={<CreditCard size={18} />}
          title="Plan"
          meta={
            plan === "pro"
              ? "Pro activo"
              : resolved > 0
                ? `${resolved} lecturas ClarivScan · Ver Pro`
                : "Free · Desbloquea Pro"
          }
          badge={plan === "free" ? "Upgrade" : undefined}
          tone="violet"
        />
      </SettingsSection>

      <SettingsSection title="Negocio">
        <SettingsNavRow
          to="/ajustes/negocio"
          icon={<Store size={18} />}
          title="Negocio"
          meta={business?.name ?? "Nombre y datos"}
          tone="emerald"
        />
        <SettingsNavRow
          to="/ajustes/equipo"
          icon={<Users size={18} />}
          title="Equipo"
          meta={plan === "free" ? "Pro · operarios" : "Operarios y accesos"}
          tone="amber"
        />
      </SettingsSection>

      <SettingsSection title="Herramientas">
        <SettingsNavRow
          to="/entrenar"
          icon={<GraduationCap size={18} />}
          title="Entrenar lector"
          meta="Perfiles de albarán"
          tone="sky"
        />
        <SettingsNavRow
          to="/log"
          icon={<ScrollText size={18} />}
          title="Historial"
          meta="Pedidos y entregas"
          tone="rose"
        />
      </SettingsSection>

      <Button
        type="button"
        variant="danger"
        className="w-full gap-2"
        onClick={() => void logout()}
      >
        <LogOut size={16} />
        Cerrar sesión
      </Button>
    </div>
  );
}
