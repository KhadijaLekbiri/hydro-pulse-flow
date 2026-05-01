import { useSimulation } from "@/hooks/useSimulation";
import { AlertList } from "@/components/AlertList";

export default function Alerts() {
  const snap = useSimulation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Alerts</h2>
        <p className="text-sm text-muted-foreground">
          Triggered when household usage exceeds baseline thresholds or pipe flow nears capacity.
        </p>
      </div>
      <AlertList alerts={snap.alerts} max={30} />
    </div>
  );
}
