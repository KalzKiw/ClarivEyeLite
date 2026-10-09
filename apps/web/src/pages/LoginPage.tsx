import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, Lock, Mail, Package, ScanLine, User } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthField } from "@/components/AuthField";
import { ClarivBox } from "@/components/ClarivBox";
import { StepProgress } from "@/components/StepProgress";
import { Button, ErrorNote } from "@/components/ui";
import { hasAnyAccount } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

const REGISTER_STEPS = ["Negocio", "Tú", "Contraseña"] as const;

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

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
    <div className="relative min-h-dvh overflow-hidden bg-[#f4f7fb]">
      {/* atmósfera */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(221 40% 70% / 0.35) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="relative mx-auto grid min-h-dvh max-w-5xl lg:grid-cols-[1.05fr_0.95fr]">
        {/* marca / hero */}
        <aside className="hidden flex-col justify-between p-10 text-primary-foreground lg:flex lg:bg-primary lg:shadow-2xl">
          <div className="flex items-center gap-3">
            <ClarivBox size={40} className="brightness-125" />
            <span className="font-display text-xl font-semibold tracking-tight">ClarivEye Lite</span>
          </div>

          <div className="space-y-6">
            <motion.h2
              className="font-display text-4xl font-semibold leading-[1.15] tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              Del albarán al picking
              <br />
              en un solo gesto.
            </motion.h2>
            <motion.p
              className="max-w-sm text-sm leading-relaxed text-primary-foreground/85"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              Sube el PDF, confirma productos y entrega con barcode. ClarivScan va dentro — sin
              cambiar de app.
            </motion.p>
            <ul className="space-y-3 text-sm text-primary-foreground/90">
              <li className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <ScanLine size={16} />
                </span>
                Lee PDF o foto del documento
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Package size={16} />
                </span>
                Pedido listo para el almacén
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-primary-foreground/65">Freemium · datos por negocio</p>
        </aside>

        {/* formulario */}
        <main className="flex flex-col justify-center px-4 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-[400px] space-y-6">
            <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
              <div className="lg:hidden">
                <ClarivBox size={56} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {mode === "login" ? "Bienvenido" : "Alta de negocio"}
                </p>
                <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {mode === "login" ? "Entra a tu almacén" : "Crea tu cuenta"}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Email y contraseña del negocio."
                    : "Tres pasos cortos. Un negocio, sus pedidos."}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/75 p-5 shadow-[0_20px_50px_-28px_rgba(37,99,235,0.45)] backdrop-blur-md sm:p-6">
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100/90 p-1">
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
                      "rounded-lg py-2.5 text-sm font-medium transition",
                      mode === id
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.form
                    key="login"
                    {...fade}
                    onSubmit={onLogin}
                    className="space-y-4"
                  >
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
                    <Button type="submit" className="h-12 w-full gap-2 rounded-xl text-[15px]">
                      Entrar
                      <ArrowRight size={16} />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      ¿Primera vez?{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline"
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
                        <Button type="submit" className="h-12 w-full gap-2 rounded-xl">
                          Continuar
                          <ArrowRight size={16} />
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
                          <span className="font-medium text-foreground">{businessName}</span>.
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
                            className="h-12 gap-1.5 rounded-xl"
                            onClick={() => setStep(1)}
                          >
                            <ArrowLeft size={16} />
                            Atrás
                          </Button>
                          <Button type="submit" className="h-12 gap-1.5 rounded-xl">
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
                            className="h-12 gap-1.5 rounded-xl"
                            onClick={() => setStep(2)}
                          >
                            <ArrowLeft size={16} />
                            Atrás
                          </Button>
                          <Button
                            type="submit"
                            className="h-12 rounded-xl"
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
