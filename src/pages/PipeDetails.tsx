import { useParams, useNavigate } from "react-router-dom";
import { useSimulation } from "@/hooks/useSimulation";
import { StatCard } from "@/components/StatCard";
import { UsageChart } from "@/components/UsageChart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Box, Calendar, Gauge, Droplets, ArrowRightLeft, Activity } from "lucide-react";
import { useMemo } from "react";

// Simple deterministic random based on id string
function hashStr(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function PipeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const snap = useSimulation();

  const edge = snap.edges.find((e) => e.id === id);

  const mockData = useMemo(() => {
    if (!edge) return null;
    const h = hashStr(edge.id);
    const materials = ["High-Density Polyethylene (HDPE)", "Polyvinyl Chloride (PVC)", "Ductile Iron", "Cast Iron"];
    const material = materials[h % materials.length];
    const diameter = 100 + (h % 300); // 100mm to 400mm
    const age = 2 + (h % 25); // 2 to 27 years
    const year = new Date().getFullYear() - (h % 3);
    const month = (h % 12) + 1;
    const lastInspected = `${year}-${month.toString().padStart(2, "0")}-15`;

    // Generate a mock history curve for this specific pipe
    const history = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const time = now - i * 3600_000;
      // create a wavy pattern
      const base = edge.flow > 0 ? edge.flow : edge.capacity * 0.4; // Fallback if 0
      const noise = ((hashStr(time.toString()) % 100) / 100 - 0.5) * 0.3;
      history.push({
        ts: time,
        total: Math.max(0, base * (1 + noise) * (1 + Math.sin(i / 4) * 0.3)),
      });
    }

    return {
      material,
      diameter,
      age,
      lastInspected,
      history,
    };
  }, [edge]);

  if (!edge || !mockData) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-2xl font-bold">Pipe Not Found</h2>
        <Button onClick={() => navigate("/network")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Network
        </Button>
      </div>
    );
  }

  const fromNode = snap.nodes.find((n) => n.id === edge.from);
  const toNode = snap.nodes.find((n) => n.id === edge.to);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/network")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pipe {edge.id}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>{fromNode?.label || edge.from}</span>
            <ArrowRightLeft className="h-3 w-3" />
            <span>{toNode?.label || edge.to}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Live Flow"
          value={`${edge.flow.toFixed(1)} L/h`}
          hint={`Max Capacity: ${edge.capacity} L/h`}
          icon={Droplets}
          tone={edge.status === "normal" ? "success" : edge.status === "high" ? "warning" : "destructive"}
        />
        <StatCard
          label="Status"
          value={edge.status.charAt(0).toUpperCase() + edge.status.slice(1)}
          icon={Activity}
          tone={edge.status === "normal" ? "success" : edge.status === "high" ? "warning" : "destructive"}
        />
        <StatCard
          label="Material"
          value={mockData.material}
          icon={Box}
          tone="default"
        />
        <StatCard
          label="Diameter"
          value={`${mockData.diameter} mm`}
          icon={Gauge}
          tone="default"
        />
        <StatCard
          label="Age"
          value={`${mockData.age} Years`}
          icon={Calendar}
          tone="default"
        />
        <StatCard
          label="Last Inspected"
          value={mockData.lastInspected}
          icon={Calendar}
          tone="default"
        />
      </div>

      <div className="grid grid-cols-1">
        <UsageChart data={mockData.history} title={`24h Flow History - Pipe ${edge.id}`} />
      </div>
    </div>
  );
}
