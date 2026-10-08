import { useState } from "react";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadPlan, savePlan, type Plan } from "@/lib/store";

export function TeamPage() {
  const { user, business, users, inviteOperario, kickOperario, logout } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [plan, setPlanState] = useState<Plan>(loadPlan());

  const operarios = users.filter((u) => u.role === "operario");
  const isOwner = user?.role === "owner";

  function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!isOwner) {
      setError("Solo el dueño puede invitar");
      return;
    }
    if (plan === "free") {
      setError("Pasa a Pro para añadir operarios (demo: cambia plan abajo)");
      return;
    }
    if (users.length >= 3) {
      setError("Máximo 3 usuarios en Pro");
      return;
    }
    const created = inviteOperario({ name, email, pin });
    if (!created) {
      setError("No se pudo crear (email duplicado o datos incompletos)");
      return;
    }
    setName("");
    setEmail("");
    setPin("");
  }

  function togglePlan() {
    const next: Plan = plan === "free" ? "pro" : "free";
    savePlan(next);
    setPlanState(next);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Negocio y equipo</h1>
        <p className="text-sm text-muted-foreground">
          {business?.name ?? "Sin negocio"} · {user?.name} ({user?.role})
        </p>
      </div>

      <Card className="space-y-2">
        <p className="text-sm font-medium">Plan: {plan}</p>
        <p className="text-xs text-muted-foreground">
          Free: solo owner · Pro: hasta 3 usuarios. Toggle demo local.
        </p>
        <Button type="button" variant="ghost" onClick={togglePlan}>
          Cambiar a {plan === "free" ? "Pro" : "Free"}
        </Button>
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-medium">Usuarios</p>
        <ul className="space-y-2 text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <span>
                {u.name} · {u.email}
                <span className="ml-1 text-xs text-muted-foreground">({u.role})</span>
              </span>
              {isOwner && u.role === "operario" ? (
                <button
                  type="button"
                  className="text-xs text-destructive"
                  onClick={() => kickOperario(u.id)}
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {isOwner ? (
        <form onSubmit={onInvite} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Añadir operario</p>
          <Field label="Nombre">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="PIN / contraseña">
            <TextInput value={pin} onChange={(e) => setPin(e.target.value)} required minLength={4} />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" className="w-full">
            Invitar
          </Button>
        </form>
      ) : null}

      <Button type="button" variant="danger" className="w-full" onClick={logout}>
        Cerrar sesión
      </Button>
    </div>
  );
}
