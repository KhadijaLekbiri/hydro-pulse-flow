import { Card } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: { ts: number; total: number }[];
  title?: string;
}

export function UsageChart({ data, title = "Live Neighborhood Consumption" }: Props) {
  const formatted = data.map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    total: Math.round(d.total),
  }));
  return (
    <Card className="p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="usage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} minTickGap={32} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#usage)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
