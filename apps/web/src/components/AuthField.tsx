import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
};

export function AuthField({ label, icon: Icon, hint, className, type, ...props }: AuthFieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;
  const hintError = hint?.toLowerCase().includes("coinciden");

  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-[hsl(var(--login-ink)/0.75)]">{label}</span>
      <div className="relative">
        {Icon ? (
          <Icon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        ) : null}
        <input
          {...props}
          type={inputType}
          className={cn(
            "h-[52px] w-full rounded-xl border-2 border-[hsl(var(--login-ink)/0.1)] bg-[hsl(var(--login-surface))] px-3.5 text-[16px] outline-none transition",
            "placeholder:text-muted-foreground/55",
            "focus:border-primary focus:ring-[3px] focus:ring-primary/20",
            Icon && "pl-11",
            isPassword && "pr-12",
            className,
          )}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <span className={cn("text-[11px]", hintError ? "text-destructive" : "text-muted-foreground")}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
