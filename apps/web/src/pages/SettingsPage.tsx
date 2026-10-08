import { ChevronRight, LogOut, ScanLine, ScrollText, Shield, Store, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadPlan, savePlan, type Plan } from "@/lib/store";

export function SettingsPage() {
  const { user, business, users, renameBusiness, changePassword, logout } = useAuth();
  const [plan, setPlan] = useState<Plan>(loadPlan());
  const [bizName, setBizName] = useState(business?.name ?? "");
  const [bizMsg, setBizMsg] = useState("");
  const [bizErr, setBizErr] = useState("");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");

  const isOwner = user?.role === "owner";
  const operarios = users.filter((u) => u.role === "operario").length;

  function onRename(event: React.FormEvent) {
    event.preventDefault();
    setBizErr("");
    setBizMsg("");
    if (!isOwner) {
      setBizErr("Solo el dueño puede renombrar el negocio");
      return;
    }
    const b = renameBusiness(bizName);
    if (!b) {
      setBizErr("Nombre demasiado corto");
      return;
    }
    setBizMsg("Nombre actualizado");
  }

  function onPassword(event: React.FormEvent) {
    event.preventDefault();
    setPassErr("");
    setPassMsg("");
    if (newPass !== newPass2) {
      setPassErr("Las contraseñas nuevas no coinciden");
      return;
    }
    const r = changePassword(curPass, newPass);
    if (!r.ok) {
      setPassErr(r.error);
      return;
    }
    setPassMsg("Contraseña cambiada");
    setCurPass("");
    setNewPass("");
    setNewPass2("");
  }

  function togglePlan() {
    if (!isOwner) return;
    const next: Plan = plan === "free" ? "pro" : "free";
    savePlan(next);
    setPlan(next);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Negocio, plan, seguridad y equipo — sin saturar el picking.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-primary" />
          <p className="text-sm font-medium">Negocio</p>
        </div>
        {isOwner ? (
          <form onSubmit={onRename} className="space-y-3">
            <Field label="Nombre">
              <TextInput value={bizName} onChange={(e) => setBizName(e.target.value)} required />
            </Field>
            <ErrorNote message={bizErr} />
            {bizMsg ? <p className="text-xs text-primary">{bizMsg}</p> : null}
            <Button type="submit" variant="ghost" className="w-full">
              Guardar nombre
            </Button>
          </form>
        ) : (
          <p className="text-sm">{business?.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Sesión: {user?.name} · {user?.email} ({user?.role})
        </p>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium">Plan: {plan === "pro" ? "Pro" : "Free"}</p>
        <p className="text-xs text-muted-foreground">
          Free: 1 usuario, 3 pedidos abiertos. Pro: hasta 3 usuarios (demo local).
        </p>
        {isOwner ? (
          <Button type="button" variant="ghost" className="w-full" onClick={togglePlan}>
            Cambiar a {plan === "free" ? "Pro" : "Free"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Solo el dueño cambia el plan.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <p className="text-sm font-medium">Contraseña</p>
        </div>
        <form onSubmit={onPassword} className="space-y-3">
          <Field label="Contraseña actual">
            <TextInput
              type="password"
              autoComplete="current-password"
              value={curPass}
              onChange={(e) => setCurPass(e.target.value)}
              required
            />
          </Field>
          <Field label="Nueva contraseña">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              minLength={4}
            />
          </Field>
          <Field label="Repetir nueva">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={newPass2}
              onChange={(e) => setNewPass2(e.target.value)}
              required
              minLength={4}
            />
          </Field>
          {newPass2 && newPass !== newPass2 ? (
            <p className="text-xs text-destructive">No coinciden</p>
          ) : null}
          <ErrorNote message={passErr} />
          {passMsg ? <p className="text-xs text-primary">{passMsg}</p> : null}
          <Button type="submit" variant="ghost" className="w-full">
            Cambiar contraseña
          </Button>
        </form>
      </Card>

      <Link
        to="/entrenar"
        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <ScanLine size={18} className="text-primary" />
          <div>
            <p className="text-sm font-medium">Entrenar lector</p>
            <p className="text-xs text-muted-foreground">
              ¿Mismo albarán? Señala dónde está SKU, nombre y cantidad
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>

      <Link
        to="/equipo"
        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <div>
            <p className="text-sm font-medium">Equipo / operarios</p>
            <p className="text-xs text-muted-foreground">
              {operarios} operario{operarios === 1 ? "" : "s"} · gestionar accesos
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>

      <Link
        to="/log"
        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-primary" />
          <div>
            <p className="text-sm font-medium">Historial / log</p>
            <p className="text-xs text-muted-foreground">Entregas y notas recientes</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>

      <Button type="button" variant="danger" className="w-full gap-2" onClick={logout}>
        <LogOut size={16} />
        Cerrar sesión
      </Button>
    </div>
  );
}
