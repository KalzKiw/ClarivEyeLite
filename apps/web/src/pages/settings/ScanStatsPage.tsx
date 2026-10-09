import { SettingsBack } from "@/components/SettingsNavRow";
import { Card } from "@/components/ui";
import { loadScanStats } from "@/lib/scan-stats";

export function ScanStatsPage() {
  const scanStats = loadScanStats();

  return (
    <div className="space-y-4">
      <SettingsBack />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lecturas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historial local de ClarivScan</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="space-y-1 p-3 text-center">
          <p className="text-2xl font-semibold text-emerald-600">{scanStats.ok}</p>
          <p className="text-xs text-muted-foreground">Ok</p>
        </Card>
        <Card className="space-y-1 p-3 text-center">
          <p className="text-2xl font-semibold text-amber-600">{scanStats.assisted}</p>
          <p className="text-xs text-muted-foreground">Asistidas</p>
        </Card>
        <Card className="space-y-1 p-3 text-center">
          <p className="text-2xl font-semibold text-rose-600">{scanStats.fail}</p>
          <p className="text-xs text-muted-foreground">Fallos</p>
        </Card>
      </div>
    </div>
  );
}
