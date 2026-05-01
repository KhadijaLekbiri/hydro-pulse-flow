import { useSimulation } from "@/hooks/useSimulation";
import { StatCard } from "@/components/StatCard";
import { UsageChart } from "@/components/UsageChart";
import { AlertList } from "@/components/AlertList";
import { NetworkMap } from "@/components/NetworkMap";
import { Activity, Droplets, Gauge, Home } from "lucide-react";

export default function Overview() {
  const snap = useSimulation();
  const criticalCount = snap.alerts.filter((a) => a.level === "critical").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">Real-time digital twin of the neighborhood water network.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Consumption"
          value={`${snap.totalConsumption.toFixed(0)} L/h`}
          hint={`${snap.nodes.length} households`}
          icon={Droplets}
          tone="default"
        />
        <StatCard
          label="Avg / Household"
          value={`${snap.avgConsumption.toFixed(1)} L/h`}
          icon={Home}
          tone="success"
        />
        <StatCard
          label="Active Alerts"
          value={`${snap.alerts.length}`}
          hint={`${criticalCount} critical`}
          icon={Activity}
          tone={criticalCount > 0 ? "destructive" : "success"}
        />
        <StatCard
          label="Network Status"
          value={criticalCount > 0 ? "Anomaly" : "Healthy"}
          icon={Gauge}
          tone={criticalCount > 0 ? "destructive" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UsageChart data={snap.history} />
        </div>
        <AlertList alerts={snap.alerts.filter(a => a.status === "waiting")} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Network Snapshot — Casablanca</h3>
        <NetworkMap snapshot={snap} height={420} />
      </div>
    </div>
  );
}
