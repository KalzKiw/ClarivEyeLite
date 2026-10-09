import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthField } from "@/components/AuthField";
import { ClarivBox } from "@/components/ClarivBox";
import { OutboundArt } from "@/components/OutboundArt";
import { StepProgress } from "@/components/StepProgress";
import { Button, ErrorNote } from "@/components/ui";
import { hasAnyAccount } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

const REGISTER_STEPS = ["Negocio", "Tú", "Contraseña"] as const;

export function LoginPage() {
  const reduce = useReducedMotion();
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

  const ctaClass =
    "h-[52px] w-full gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98] hover:shadow-[0_0_0_3px_hsl(28_90%_48%/0.25)]";

  return (
    <div data-login className="min-h-dvh bg-[hsl(var(--login-surface))] text-[hsl(var(--login-ink))]">
      <div className="grid min-h-dvh lg:grid-cols-2">
        {/* —— Marca full-bleed —— */}
        <aside className="relative hidden min-h-dvh flex-col text-white lg:flex">
          <OutboundArt className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(221_55%_12%/0.85)] via-[hsl(221_55%_18%/0.35)] to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
            <div className="flex items-center gap-3">
              <ClarivBox size={36} className="brightness-125" />
              <span className="font-display text-xl font-semibold tracking-tight">ClarivEye Lite</span>
            </div>

            <div className="max-w-md space-y-3 pb-4">
              <motion.h2
                className="font-display text-[2.65rem] font-semibold leading-[1.12] tracking-tight"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                ClarivEye Lite
              </motion.h2>
              <motion.p
                className="text-base leading-relaxed text-white/80"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 }}
              >
                Del albarán al picking — un solo gesto.
              </motion.p>
            </div>
          </div>
        </aside>

        {/* —— Formulario (mostrador) —— */}
        <main className="flex flex-col">
          {/* Hero móvil */}
          <div className="relative lg:hidden">
            <OutboundArt compact className="h-44 w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--login-surface))] via-[hsl(var(--login-surface)/0.35)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-5 pb-4">
              <ClarivBox size={40} />
              <div>
                <p className="font-display text-xl font-semibold leading-none text-[hsl(var(--login-ink))]">
                  ClarivEye Lite
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Del albarán al picking</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10">
            <div className="mx-auto w-full max-w-[400px] space-y-7">
              <header className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {mode === "login" ? "Acceso" : "Alta"}
                </p>
                <h1 className="font-display text-[1.85rem] font-semibold tracking-tight">
                  {mode === "login" ? "Entra a tu almacén" : "Crea tu negocio"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Email y contraseña del negocio."
                    : "Tres pasos. Un negocio, sus pedidos."}
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
                    <StepProgress step={step} total={3} labels={[...REGISTER_STEPS]} />

                    {step === 1 ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          nextRegister();
                        }}
                        className="space-y-4"
                      >
                        <p className="text-sm text-muted-foreground">
                          ¿Cómo se llama tu empresa o almacén?
                        </p>
                        <AuthField
                          label="Nombre del negocio"
                          icon={Building2}
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Mi almacén S.L."
                          autoFocus
                          required
                        />
                        <ErrorNote message={error} />
                        <Button type="submit" className={ctaClass}>
                          Continuar
                          <ArrowRight size={17} />
                        </Button>
                      </form>
                    ) : null}

                    {step === 2 ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          nextRegister();
                        }}
                        className="space-y-4"
                      >
                        <p className="text-sm text-muted-foreground">
                          Tú serás el dueño de{" "}
                          <span className="font-semibold text-foreground">{businessName}</span>.
                        </p>
                        <AuthField
                          label="Tu nombre"
                          icon={User}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ana"
                          autoFocus
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
                          <Button type="submit" className={cn(ctaClass, "w-auto")}>
                            Continuar
                            <ArrowRight size={16} />
                          </Button>
                        </div>
                      </form>
                    ) : null}

                    {step === 3 ? (
                      <form onSubmit={onRegister} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Elige una contraseña y confírmala.
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
                            onClick={() => setStep(2)}
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
                    ) : null}
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
