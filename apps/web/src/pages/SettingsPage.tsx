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
import { SettingsNavRow } from "@/components/SettingsNavRow";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadPlan } from "@/lib/store";

export function SettingsPage() {
  const { logout, business } = useAuth();
  const plan = loadPlan();

  return (
    <div className="space-y-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Ajustes</h1>

      <SettingsNavRow
        to="/ajustes/perfil"
        icon={<UserRound size={18} />}
        title="Perfil"
      />
      <SettingsNavRow
        to="/ajustes/negocio"
        icon={<Store size={18} />}
        title="Negocio"
        meta={business?.name}
      />
      <SettingsNavRow
        to="/ajustes/plan"
        icon={<CreditCard size={18} />}
        title="Plan"
        meta={plan === "pro" ? "Pro" : "Free"}
      />
      <SettingsNavRow
        to="/ajustes/lecturas"
        icon={<ScanLine size={18} />}
        title="Lecturas ClarivScan"
      />
      <SettingsNavRow to="/entrenar" icon={<GraduationCap size={18} />} title="Entrenar lector" />
      <SettingsNavRow to="/equipo" icon={<Users size={18} />} title="Equipo" />
      <SettingsNavRow to="/log" icon={<ScrollText size={18} />} title="Historial" />

      <Button type="button" variant="danger" className="mt-2 w-full gap-2" onClick={logout}>
        <LogOut size={16} />
        Cerrar sesión
      </Button>
    </div>
  );
}
