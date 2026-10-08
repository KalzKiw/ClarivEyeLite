import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { ClarivScanPage } from "@/modules/clarivscan/ClarivScanPage";
import { LoginPage } from "@/pages/LoginPage";
import { LogPage } from "@/pages/LogPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { PickingPage } from "@/pages/PickingPage";
import { TeamPage } from "@/pages/TeamPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Shell />}>
        <Route index element={<OrdersPage />} />
        <Route path="clarivscan" element={<ClarivScanPage />} />
        <Route path="picking" element={<PickingPage />} />
        <Route path="log" element={<LogPage />} />
        <Route path="equipo" element={<TeamPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
