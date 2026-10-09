import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, Lock, Mail, User } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthField } from "@/components/AuthField";
import { ClarivBox } from "@/components/ClarivBox";
import { StepProgress } from "@/components/StepProgress";
import { Button, ErrorNote } from "@/components/ui";
import { hasAnyAccount } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

/** Lazy: three.js no bloquea el primer paint del form */
const OutboundArt = lazy(() =>
  import("@/components/OutboundArt").then((m) => ({ default: m.OutboundArt })),
);

const REGISTER_STEPS = ["Tus datos", "Contraseña"] as const;

export function LoginPage() {
  const reduce = useReducedMotion();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(() =>
    hasAnyAccount() ? "login" : "register",
  );
  /** 1 = negocio+nombre+email · 2 = contraseñas */
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");

  if (user) return <Navigate to="/" replace />;

  const fade = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.2 },
      };

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
    if (businessName.trim().length < 2) {
      setError("Pon el nombre de tu negocio");
      return;
    }
    if (name.trim().length < 2) {
      setError("¿Cómo te llamas?");
      return;
    }
    if (!email.includes("@")) {
      setError("Email no válido");
      return;
    }
    setStep(2);
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

  const ctaClass =
    "h-[52px] w-full gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98] hover:shadow-[0_0_0_3px_hsl(28_90%_48%/0.25)]";

  const brandBar = (
    <div className="flex items-center gap-3">
      <ClarivBox size={34} className="brightness-125" />
      <span className="font-display text-xl font-semibold tracking-tight text-white">
        ClarivEye Lite
      </span>
    </div>
  );

  return (
    <div data-login className="min-h-dvh bg-[hsl(var(--login-surface))] text-[hsl(var(--login-ink))]">
      <div className="grid min-h-dvh lg:grid-cols-2">
        {/* Panel marca + 3D */}
        <aside className="relative hidden min-h-dvh flex-col lg:flex">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b1a2e]">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-[#1e3a5f] ring-1 ring-[#3b82f6]/40" />
                  <p className="text-sm font-medium text-white/70">Cargando escena…</p>
                </div>
              </div>
            }
          >
            <OutboundArt className="absolute inset-0 h-full w-full" />
          </Suspense>
          {/* Solo abajo (~30%): legibilidad del tagline; arriba transparente */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#0a1628]/95 via-[#0a1628]/40 to-transparent" />

          {/* Título SIEMPRE arriba */}
          <div className="relative z-10 p-8 xl:p-10">{brandBar}</div>

          <div className="relative z-10 mt-auto max-w-md space-y-2 p-8 xl:p-10">
            <p className="font-display text-2xl font-semibold leading-snug text-white/95">
              Del albarán al picking — un solo gesto.
            </p>
          </div>
        </aside>

        <main className="flex flex-col">
          {/* Móvil: título arriba + escena compacta */}
          <div className="lg:hidden">
            <div className="flex items-center gap-3 bg-[#10253f] px-5 py-4">
              <ClarivBox size={32} className="brightness-125" />
              <span className="font-display text-lg font-semibold text-white">ClarivEye Lite</span>
            </div>
            <div className="relative h-36">
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-[#0b1a2e]">
                    <p className="text-xs font-medium text-white/60">Cargando escena…</p>
                  </div>
                }
              >
                <OutboundArt compact className="h-full w-full" />
              </Suspense>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[hsl(var(--login-surface))] to-transparent" />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10">
            <div className="mx-auto w-full max-w-[400px] space-y-6">
              <header className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {mode === "login" ? "Acceso" : "Alta"}
                </p>
                <h1 className="font-display text-[1.75rem] font-semibold tracking-tight">
                  {mode === "login" ? "Entra a tu almacén" : "Crea tu negocio"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Email y contraseña del negocio."
                    : "Datos del negocio y una contraseña. Listo."}
                </p>
              </header>

              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[hsl(var(--login-ink)/0.05)] p-1">
                {(
                  [
                    ["login", "Entrar"],
                    ["register", "Crear cuenta"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchMode(id)}
                    className={cn(
                      "rounded-lg py-2.5 text-sm font-semibold transition",
                      mode === id
                        ? "bg-[hsl(var(--login-surface))] text-[hsl(var(--login-ink))] shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.form key="login" {...fade} onSubmit={onLogin} className="space-y-4">
                    <AuthField
                      label="Email"
                      icon={Mail}
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      required
                    />
                    <AuthField
                      label="Contraseña"
                      icon={Lock}
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={4}
                    />
                    <ErrorNote message={error} />
                    <Button type="submit" className={ctaClass}>
                      Entrar
                      <ArrowRight size={17} />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      ¿Primera vez?{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                        onClick={() => switchMode("register")}
                      >
                        Crear cuenta
                      </button>
                    </p>
                  </motion.form>
                ) : (
                  <motion.div key={`reg-${step}`} {...fade} className="space-y-4">
                    <StepProgress step={step} total={2} labels={[...REGISTER_STEPS]} />

                    {step === 1 ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          nextRegister();
                        }}
                        className="space-y-3.5"
                      >
                        <AuthField
                          label="Negocio"
                          icon={Building2}
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Mi almacén S.L."
                          autoFocus
                          required
                        />
                        <AuthField
                          label="Tu nombre"
                          icon={User}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ana"
                          required
                        />
                        <AuthField
                          label="Email"
                          icon={Mail}
                          type="email"
                          autoComplete="username"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@empresa.com"
                          required
                        />
                        <ErrorNote message={error} />
                        <Button type="submit" className={ctaClass}>
                          Continuar
                          <ArrowRight size={17} />
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={onRegister} className="space-y-3.5">
                        <p className="text-sm text-muted-foreground">
                          Contraseña para{" "}
                          <span className="font-semibold text-foreground">{businessName}</span>
                        </p>
                        <AuthField
                          label="Contraseña"
                          icon={Lock}
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 4 caracteres"
                          autoFocus
                          required
                          minLength={4}
                        />
                        <AuthField
                          label="Repetir contraseña"
                          icon={Lock}
                          type="password"
                          autoComplete="new-password"
                          value={password2}
                          onChange={(e) => setPassword2(e.target.value)}
                          placeholder="Misma contraseña"
                          required
                          minLength={4}
                          hint={
                            password2 && password !== password2 ? "Aún no coinciden" : undefined
                          }
                        />
                        <ErrorNote message={error} />
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-[52px] gap-1.5 rounded-xl"
                            onClick={() => setStep(1)}
                          >
                            <ArrowLeft size={16} />
                            Atrás
                          </Button>
                          <Button
                            type="submit"
                            className={cn(ctaClass, "w-auto")}
                            disabled={!!password2 && password !== password2}
                          >
                            Crear y entrar
                          </Button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
