import {
  CreditCard,
  GraduationCap,
  LogOut,
  ScanLine,
  ScrollText,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import { SettingsNavRow, SettingsSection } from "@/components/SettingsNavRow";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadPlan } from "@/lib/store";

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
  const plan = loadPlan();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-4 shadow-sm">
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
      </div>

      <SettingsSection title="Cuenta">
        <SettingsNavRow to="/ajustes/perfil" icon={<UserRound size={18} />} title="Perfil" meta="Datos y contraseña" tone="sky" />
        <SettingsNavRow
          to="/ajustes/plan"
          icon={<CreditCard size={18} />}
          title="Plan"
          meta={plan === "pro" ? "Pro activo" : "Free"}
          badge={plan === "free" ? "−34%" : undefined}
          tone="violet"
        />
      </SettingsSection>

      <SettingsSection title="Negocio">
        <SettingsNavRow
          to="/ajustes/negocio"
          icon={<Store size={18} />}
          title="Negocio"
          meta={business?.name}
          tone="emerald"
        />
        <SettingsNavRow to="/ajustes/equipo" icon={<Users size={18} />} title="Equipo" meta="Operarios y accesos" tone="amber" />
      </SettingsSection>

      <SettingsSection title="Herramientas">
        <SettingsNavRow
          to="/ajustes/lecturas"
          icon={<ScanLine size={18} />}
          title="Lecturas ClarivScan"
          tone="primary"
        />
        <SettingsNavRow to="/entrenar" icon={<GraduationCap size={18} />} title="Entrenar lector" tone="sky" />
        <SettingsNavRow to="/log" icon={<ScrollText size={18} />} title="Historial" tone="rose" />
      </SettingsSection>

      <Button type="button" variant="danger" className="w-full gap-2" onClick={logout}>
        <LogOut size={16} />
        Cerrar sesión
      </Button>
    </div>
  );
}
