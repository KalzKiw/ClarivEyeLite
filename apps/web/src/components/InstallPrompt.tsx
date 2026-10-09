import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

const DISMISS_KEY = "clariveye-lite.install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  // iOS Safari
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return mq.matches || Boolean(nav.standalone);
}

/** Banner para instalar la PWA (Chrome/Edge/Android). iOS muestra tip manual. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosTip, setIosTip] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (isIos) {
      setIosTip(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setDeferred(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-[4.25rem] z-30 mx-auto w-full max-w-lg px-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instalar ClarivPack</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {iosTip && !deferred
              ? "En Safari: Compartir → Añadir a pantalla de inicio"
              : "Acceso rápido a pedidos y picking sin abrir el navegador"}
          </p>
          {deferred ? (
            <Button type="button" className="mt-2 h-8 px-3 text-xs" onClick={() => void install()}>
              Instalar app
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
