import { FREE_OPEN_LIMIT } from "@clariveye-lite/domain";
import { Check, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { savePlan } from "@/lib/store";

const PRO_PERKS = [
  "Pedidos abiertos ilimitados",
  "Hasta 3 usuarios en el equipo",
  "ClarivScan sin freno por cupo",
];

export function UpgradeModal({
  open,
  onClose,
  onUpgraded,
  openCount,
}: {
  open: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
  openCount?: number;
}) {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function goPro() {
    if (!isOwner) return;
    savePlan("pro");
    onUpgraded?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 mx-3 mb-3 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-border bg-card p-5 shadow-xl sm:mb-0">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Plan Free</p>
            <h2 id="upgrade-title" className="text-xl font-semibold tracking-tight">
              Has llegado al límite
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Free permite {FREE_OPEN_LIMIT} pedidos abiertos
              {typeof openCount === "number" ? ` (llevas ${openCount})` : ""}. Entrega uno o pasa a
              Pro para seguir escaneando sin parar.
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-2.5 rounded-xl bg-muted/60 p-3.5">
          {PRO_PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm">
              <Check size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid gap-2">
          {isOwner ? (
            <Button type="button" className="w-full gap-2" onClick={goPro}>
              <Sparkles size={16} />
              Pasar a Pro
            </Button>
          ) : (
            <p className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
              Pide al dueño del negocio que active Pro en Ajustes.
            </p>
          )}
          <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
            Seguir en Free · entregar un pedido
          </Button>
          <Link
            to="/ajustes"
            onClick={onClose}
            className="text-center text-xs text-primary underline-offset-2 hover:underline"
          >
            Ver plan en Ajustes
          </Link>
        </div>
      </div>
    </div>
  );
}
