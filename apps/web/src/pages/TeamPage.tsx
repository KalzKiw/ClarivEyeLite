import { useState } from "react";
import { Link } from "react-router-dom";
import { SettingsBack } from "@/components/SettingsNavRow";
import { StepProgress } from "@/components/StepProgress";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { loadPlan } from "@/lib/store";

const INVITE_STEPS = ["Nombre", "Email", "PIN"] as const;

export function TeamPage() {
  const { user, business, users, inviteOperario, kickOperario } = useAuth();
  const [inviting, setInviting] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const plan = loadPlan();

  const operarios = users.filter((u) => u.role === "operario");
  const isOwner = user?.role === "owner";

  function resetInvite() {
    setInviting(false);
    setStep(1);
    setName("");
    setEmail("");
    setPin("");
    setPin2("");
    setError("");
  }

  function nextStep() {
    setError("");
    if (step === 1) {
      if (name.trim().length < 2) {
        setError("Nombre del operario");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!email.includes("@")) {
        setError("Email no válido");
        return;
      }
      setStep(3);
    }
  }

  function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setOkMsg("");
    if (!isOwner) {
      setError("Solo el dueño puede invitar");
      return;
    }
    if (plan === "free") {
      setError("Pasa a Pro en Ajustes para añadir operarios");
      return;
    }
    if (users.length >= 3) {
      setError("Máximo 3 usuarios en Pro");
      return;
    }
    if (pin.length < 4) {
      setError("PIN mínimo 4 caracteres");
      return;
    }
    if (pin !== pin2) {
      setError("Los PIN no coinciden");
      return;
    }
    const created = inviteOperario({ name, email, pin });
    if (!created) {
      setError("No se pudo crear (email duplicado o datos incompletos)");
      return;
    }
    setOkMsg(`${created.name} ya puede entrar con ${created.email}`);
    resetInvite();
  }

  return (
    <div className="space-y-4">
      <SettingsBack />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quién puede hacer picking</p>
      </div>

      <Card className="space-y-2">
        <p className="text-sm font-semibold">Usuarios ({users.length})</p>
        <ul className="space-y-2 text-sm">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
            >
              <span>
                {u.name}
                <span className="ml-1 text-xs text-muted-foreground">
                  · {u.email} ({u.role === "owner" ? "dueño" : "operario"})
                </span>
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
        {operarios.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay operarios. En Pro puedes invitar hasta 2.
          </p>
        ) : null}
      </Card>

      {okMsg ? <p className="text-sm text-primary">{okMsg}</p> : null}

      {isOwner && !inviting ? (
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            setOkMsg("");
            setInviting(true);
          }}
        >
          Añadir operario
        </Button>
      ) : null}

      {isOwner && inviting ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <StepProgress step={step} total={3} labels={[...INVITE_STEPS]} />

          {step === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                nextStep();
              }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground">¿Cómo se llama el operario?</p>
              <Field label="Nombre">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </Field>
              <ErrorNote message={error} />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" onClick={resetInvite}>
                  Cancelar
                </Button>
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          ) : null}

          {step === 2 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                nextStep();
              }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground">
                Email con el que <strong>{name}</strong> entrará.
              </p>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </Field>
              <ErrorNote message={error} />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <form onSubmit={onInvite} className="space-y-3">
              <p className="text-sm text-muted-foreground">PIN de acceso (confírmalo).</p>
              <Field label="PIN">
                <TextInput
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                  required
                  minLength={4}
                />
              </Field>
              <Field label="Repetir PIN">
                <TextInput
                  type="password"
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value)}
                  required
                  minLength={4}
                />
              </Field>
              {pin2 && pin !== pin2 ? (
                <p className="text-xs text-destructive">No coinciden</p>
              ) : null}
              <ErrorNote message={error} />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button type="submit" disabled={!!pin2 && pin !== pin2}>
                  Invitar
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {!isOwner ? (
        <p className="text-xs text-muted-foreground">
          Solo el dueño invita o quita operarios. Tú entras y haces picking.
        </p>
      ) : null}

      <Link to="/ajustes" className="block text-center text-sm text-primary underline">
        Ir a Ajustes (plan, negocio, contraseña)
      </Link>
    </div>
  );
}
