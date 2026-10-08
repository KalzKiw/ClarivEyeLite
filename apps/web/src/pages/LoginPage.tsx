import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ClarivBox } from "@/components/ClarivBox";
import { Button, ErrorNote, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");

  if (user) return <Navigate to="/" replace />;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "login") {
      const u = login(email, password);
      if (!u) setError("Email o contraseña incorrectos");
      return;
    }
    if (!businessName.trim() || !name.trim() || !email.trim() || password.length < 4) {
      setError("Rellena negocio, nombre, email y contraseña (mín. 4)");
      return;
    }
    register({ businessName, ownerName: name, email, password });
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_55%)]" />
      <div className="relative mx-auto w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <ClarivBox size={64} />
          <h1 className="text-2xl font-semibold tracking-tight">ClarivEye Lite</h1>
          <p className="text-sm text-muted-foreground">Salida de pedidos · ClarivScan dentro</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
            <button
              type="button"
              className={`rounded-md py-2 ${mode === "login" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setMode("login")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`rounded-md py-2 ${mode === "register" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setMode("register")}
            >
              Crear negocio
            </button>
          </div>

          {mode === "register" ? (
            <>
              <Field label="Nombre del negocio">
                <TextInput value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </Field>
              <Field label="Tu nombre">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </>
          ) : null}

          <Field label="Email">
            <TextInput type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={mode === "register" ? "Contraseña" : "Contraseña / PIN"}>
            <TextInput
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <ErrorNote message={error} />
          <Button type="submit" className="w-full">
            {mode === "login" ? "Entrar" : "Crear y entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
