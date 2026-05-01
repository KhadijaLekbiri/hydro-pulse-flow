import { useSimulation } from "@/hooks/useSimulation";
import { NetworkMap } from "@/components/NetworkMap";
import { Card } from "@/components/ui/card";

export default function Network() {
  const snap = useSimulation();
  const anomalies = snap.nodes.filter((n) => n.status === "anomaly").length;
  const high = snap.nodes.filter((n) => n.status === "high").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Network View</h2>
        <p className="text-sm text-muted-foreground">
          Households as nodes, pipes as edges. Hover for live readings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="Households" value={snap.nodes.length} />
        <MiniStat label="Pipes" value={snap.edges.length} />
        <MiniStat label="High Usage" value={high} tone="warning" />
        <MiniStat label="Anomalies" value={anomalies} tone="destructive" />
      </div>

      <NetworkMap snapshot={snap} height={560} />
    </div>
  );
}

function MiniStat({
  label, value, tone = "default",
}: { label: string; value: number; tone?: "default" | "warning" | "destructive" }) {
  const color =
    tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <Card className="p-4 shadow-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </Card>
  );
}
