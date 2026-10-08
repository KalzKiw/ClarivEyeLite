import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ClarivBox } from "@/components/ClarivBox";
import { StepProgress } from "@/components/StepProgress";
import { Button, ErrorNote, Field, TextInput } from "@/components/ui";
import { hasAnyAccount } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

const REGISTER_STEPS = ["Negocio", "Tú", "Contraseña"] as const;

export function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(() =>
    hasAnyAccount() ? "login" : "register",
  );
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");

  if (user) return <Navigate to="/" replace />;

  function switchMode(next: "login" | "register") {
    setMode(next);
    setStep(1);
    setError("");
    setPassword("");
    setPassword2("");
  }

  function onLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const u = login(email, password);
    if (!u) setError("Email o contraseña incorrectos");
  }

  function nextRegister() {
    setError("");
    if (step === 1) {
      if (businessName.trim().length < 2) {
        setError("Pon el nombre de tu negocio");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (name.trim().length < 2) {
        setError("¿Cómo te llamas?");
        return;
      }
      if (!email.includes("@")) {
        setError("Email no válido");
        return;
      }
      setStep(3);
      return;
    }
  }

  function onRegister(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      register({ businessName, ownerName: name, email, password });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la cuenta");
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_55%)]" />
      <div className="relative mx-auto w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <ClarivBox size={64} />
          <h1 className="text-2xl font-semibold tracking-tight">ClarivEye Lite</h1>
          <p className="text-sm text-muted-foreground">
            Escanea el albarán · prepara el pedido · entrega. Un negocio, sus datos.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
            <button
              type="button"
              className={`rounded-md py-2 ${mode === "login" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              onClick={() => switchMode("login")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`rounded-md py-2 ${mode === "register" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              onClick={() => switchMode("register")}
            >
              Crear cuenta
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={onLogin} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Email y contraseña del negocio. ¿Primera vez?{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => switchMode("register")}
                >
                  Crear cuenta
                </button>
              </p>
              <Field label="Email">
                <TextInput
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  required
                />
              </Field>
              <Field label="Contraseña">
                <TextInput
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                />
              </Field>
              <ErrorNote message={error} />
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <StepProgress step={step} total={3} labels={[...REGISTER_STEPS]} />

              {step === 1 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    nextRegister();
                  }}
                  className="space-y-3"
                >
                  <p className="text-sm text-muted-foreground">
                    Primero el nombre de tu empresa o almacén.
                  </p>
                  <Field label="Nombre del negocio">
                    <TextInput
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Mi almacén S.L."
                      autoFocus
                      required
                    />
                  </Field>
                  <ErrorNote message={error} />
                  <Button type="submit" className="w-full">
                    Continuar
                  </Button>
                </form>
              ) : null}

              {step === 2 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    nextRegister();
                  }}
                  className="space-y-3"
                >
                  <p className="text-sm text-muted-foreground">
                    Tú serás el dueño de <strong>{businessName}</strong>.
                  </p>
                  <Field label="Tu nombre">
                    <TextInput
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ana"
                      autoFocus
                      required
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
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
                <form onSubmit={onRegister} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Elige una contraseña y confírmala.
                  </p>
                  <Field label="Contraseña">
                    <TextInput
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      autoFocus
                      required
                      minLength={4}
                    />
                  </Field>
                  <Field label="Repetir contraseña">
                    <TextInput
                      type="password"
                      autoComplete="new-password"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      placeholder="Misma contraseña"
                      required
                      minLength={4}
                    />
                  </Field>
                  {password2 && password !== password2 ? (
                    <p className="text-xs text-destructive">Aún no coinciden</p>
                  ) : null}
                  <ErrorNote message={error} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                      Atrás
                    </Button>
                    <Button type="submit" disabled={!!password2 && password !== password2}>
                      Crear y entrar
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
