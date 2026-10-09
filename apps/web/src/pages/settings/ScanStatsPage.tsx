import { SettingsBack } from "@/components/SettingsNavRow";
import { Card } from "@/components/ui";
import { loadScanStats } from "@/lib/scan-stats";

export function ScanStatsPage() {
  const scanStats = loadScanStats();

  return (
    <div className="space-y-4">
      <SettingsBack />
      <h1 className="text-2xl font-semibold tracking-tight">Lecturas</h1>

      <div className="grid grid-cols-3 gap-2">
        <Card className="space-y-1 p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{scanStats.ok}</p>
          <p className="text-xs text-muted-foreground">Ok</p>
        </Card>
        <Card className="space-y-1 p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{scanStats.assisted}</p>
          <p className="text-xs text-muted-foreground">Asistidas</p>
        </Card>
        <Card className="space-y-1 p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{scanStats.fail}</p>
          <p className="text-xs text-muted-foreground">Fallos</p>
        </Card>
      </div>
    </div>
  );
}
