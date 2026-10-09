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

  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-foreground/80">{label}</span>
      <div className="relative">
        {Icon ? (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        ) : null}
        <input
          {...props}
          type={inputType}
          className={cn(
            "w-full rounded-xl border border-border/80 bg-white/80 px-3 py-3 text-[15px] outline-none backdrop-blur transition",
            "placeholder:text-muted-foreground/60",
            "focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15",
            Icon && "pl-10",
            isPassword && "pr-11",
            className,
          )}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : null}
      </div>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
