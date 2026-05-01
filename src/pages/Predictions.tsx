import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useSimulation } from "@/hooks/useSimulation";
import { sim } from "@/lib/simulation";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

export default function Predictions() {
  const snap = useSimulation();
  const forecast = useMemo(() => sim.forecast(24), [snap.ts]);

  const data = forecast.map((f) => {
    const t = new Date(Date.now() + f.hour * 3600_000);
    return {
      label: `${t.getHours().toString().padStart(2, "0")}:00`,
      predicted: Math.round(f.value),
    };
  });

  const peak = data.reduce((a, b) => (b.predicted > a.predicted ? b : a), data[0]);
  const total24h = data.reduce((s, d) => s + d.predicted, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Predictions</h2>
        <p className="text-sm text-muted-foreground">
          Linear regression on recent telemetry, modulated by daily demand pattern.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Forecast Horizon" value="Next 24h" />
        <Stat label="Predicted Total" value={`${total24h.toLocaleString()} L`} />
        <Stat label="Peak Hour" value={`${peak.label} · ${peak.predicted} L/h`} />
      </div>

      <Card className="p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold">24-Hour Consumption Forecast</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted L/h"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 shadow-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
