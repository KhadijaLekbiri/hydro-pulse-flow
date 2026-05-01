import { useParams, useNavigate } from "react-router-dom";
import { useSimulation } from "@/hooks/useSimulation";
import { StatCard } from "@/components/StatCard";
import { UsageChart } from "@/components/UsageChart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, Droplets, Home, Ruler, Activity } from "lucide-react";
import { useMemo } from "react";

// Simple deterministic random based on id string
function hashStr(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function HouseholdDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const snap = useSimulation();

  const node = snap.nodes.find((n) => n.id === id);

  const mockData = useMemo(() => {
    if (!node) return null;
    const h = hashStr(node.id);
    const surface = 60 + (h % 140); // 60 to 200 m2
    const classes = ["Premium (Villa)", "Standard (Apartment)", "Economy", "Commercial"];
    const socialClass = classes[h % classes.length];
    const avgBill = 120 + (node.baseline * 2.5) + (h % 50); // MAD
    const year = 2010 + (h % 14);
    const month = (h % 12) + 1;
    const subDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    const maxConsumption = node.baseline * 3.5;

    // Generate a mock history curve for this specific household
    const history = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const time = now - i * 3600_000;
      // create a wavy pattern
      const base = node.baseline;
      const noise = ((hashStr(time.toString()) % 100) / 100 - 0.5) * 0.4;
      history.push({
        ts: time,
        total: Math.max(0, base * (1 + noise) * (1 + Math.sin(i / 3) * 0.5)),
      });
    }

    return {
      surface,
      socialClass,
      avgBill,
      subDate,
      maxConsumption,
      history,
    };
  }, [node]);

  if (!node || !mockData) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-2xl font-bold">Household Not Found</h2>
        <Button onClick={() => navigate("/network")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Network
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/network")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{node.label}</h2>
          <p className="text-sm text-muted-foreground">Household ID: {node.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Live Consumption"
          value={`${node.consumption.toFixed(1)} L/h`}
          hint={`Baseline: ${node.baseline.toFixed(1)} L/h`}
          icon={Droplets}
          tone={node.status === "normal" ? "success" : node.status === "high" ? "warning" : "destructive"}
        />
        <StatCard
          label="Max Record Consumption"
          value={`${mockData.maxConsumption.toFixed(1)} L/h`}
          icon={Activity}
          tone="default"
        />
        <StatCard
          label="Average Monthly Bill"
          value={`${mockData.avgBill.toFixed(0)} MAD`}
          icon={DollarSign}
          tone="default"
        />
        <StatCard
          label="Surface Area"
          value={`${mockData.surface} m²`}
          icon={Ruler}
          tone="default"
        />
        <StatCard
          label="Property Type"
          value={mockData.socialClass}
          icon={Home}
          tone="default"
        />
        <StatCard
          label="Subscription Date"
          value={mockData.subDate}
          icon={Calendar}
          tone="default"
        />
      </div>

      <div className="grid grid-cols-1">
        <UsageChart data={mockData.history} title={`24h Consumption History - ${node.label}`} />
      </div>
    </div>
  );
}
