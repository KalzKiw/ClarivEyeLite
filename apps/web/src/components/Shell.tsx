import { ClipboardList, PackageCheck, ScanLine, Settings } from "lucide-react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { ClarivBox } from "@/components/ClarivBox";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LoadingMark } from "@/components/LoadingMark";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import { usePlan } from "@/lib/use-app-store";

const HEADER_H = "h-14";

const tabs = [
  { to: "/", label: "Pedidos", icon: ClipboardList, end: true },
  { to: "/clarivscan", label: "ClarivScan", icon: ScanLine },
  { to: "/picking", label: "Picking", icon: PackageCheck },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export function Shell() {
  const { user, business, ready } = useAuth();
  const plan = usePlan();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <LoadingMark label="Cargando…" size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-dvh bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-primary-foreground/20 bg-primary text-primary-foreground shadow-md">
        <div className={`mx-auto flex max-w-lg ${HEADER_H} items-center justify-between gap-3 px-4`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <ClarivBox size={28} className="shrink-0 brightness-125" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground/75">
                ClarivPack
              </p>
              <p className="truncate text-base font-semibold leading-tight">
                {business?.name ?? "Negocio"}
              </p>
            </div>
          </div>
          <NavLink
            to="/ajustes/plan"
            className="shrink-0 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground transition hover:bg-primary-foreground/25"
          >
            {plan === "pro" ? "Pro" : "Free"}
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-4">
        <Outlet />
      </main>

      <InstallPrompt />

      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur transition duration-300">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition active:scale-[0.94]",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )
                  }
                >
                  <Icon size={20} />
                  {tab.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
