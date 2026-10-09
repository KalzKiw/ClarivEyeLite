import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoadingMark } from "@/components/LoadingMark";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { LogPage } from "@/pages/LogPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { PickingOrderPage } from "@/pages/PickingOrderPage";
import { PickingPage } from "@/pages/PickingPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { BusinessPage } from "@/pages/settings/BusinessPage";
import { PlanPage } from "@/pages/settings/PlanPage";
import { ProfilePage } from "@/pages/settings/ProfilePage";
import { ScanStatsPage } from "@/pages/settings/ScanStatsPage";
import { TeamPage } from "@/pages/TeamPage";
import { TrainParserPage } from "@/pages/TrainParserPage";

const ClarivScanPage = lazy(() =>
  import("@/modules/clarivscan/ClarivScanPage").then((m) => ({ default: m.ClarivScanPage })),
);

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingMark label="Cargando…" size="lg" fill />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Shell />}>
        <Route index element={<OrdersPage />} />
        <Route
          path="clarivscan"
          element={
            <LazyPage>
              <ClarivScanPage />
            </LazyPage>
          }
        />
        <Route path="picking" element={<PickingPage />} />
        <Route path="picking/:id" element={<PickingOrderPage />} />
        <Route path="log" element={<LogPage />} />
        <Route path="equipo" element={<Navigate to="/ajustes/equipo" replace />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="ajustes/perfil" element={<ProfilePage />} />
        <Route path="ajustes/negocio" element={<BusinessPage />} />
        <Route path="ajustes/plan" element={<PlanPage />} />
        <Route path="ajustes/lecturas" element={<ScanStatsPage />} />
        <Route path="ajustes/equipo" element={<TeamPage />} />
        <Route path="entrenar" element={<TrainParserPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
