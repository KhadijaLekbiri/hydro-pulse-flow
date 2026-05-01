import { useMemo, useState } from "react";
import type { SimSnapshot, WaterNode, WaterEdge } from "@/lib/simulation";
import { cn } from "@/lib/utils";

interface Props {
  snapshot: SimSnapshot;
  height?: number;
}

const statusStroke = {
  normal: "hsl(var(--success))",
  high: "hsl(var(--warning))",
  anomaly: "hsl(var(--destructive))",
} as const;

const statusFill = {
  normal: "hsl(var(--success) / 0.15)",
  high: "hsl(var(--warning) / 0.18)",
  anomaly: "hsl(var(--destructive) / 0.2)",
} as const;

export function NetworkGraph({ snapshot, height = 520 }: Props) {
  const [hover, setHover] = useState<{ kind: "node" | "edge"; id: string; x: number; y: number } | null>(null);

  const W = 900;
  const H = height;
  const padding = 40;

  const nodeMap = useMemo(
    () => new Map(snapshot.nodes.map((n) => [n.id, n])),
    [snapshot.nodes],
  );

  const px = (x: number) => padding + x * (W - padding * 2);
  const py = (y: number) => padding + y * (H - padding * 2);

  const hoveredNode: WaterNode | null =
    hover?.kind === "node" ? snapshot.nodes.find((n) => n.id === hover.id) ?? null : null;
  const hoveredEdge: WaterEdge | null =
    hover?.kind === "edge" ? snapshot.edges.find((e) => e.id === hover.id) ?? null : null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-card">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {/* grid backdrop */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" opacity="0.5" />

        {/* edges */}
        {snapshot.edges.map((e) => {
          const a = nodeMap.get(e.from)!;
          const b = nodeMap.get(e.to)!;
          const stroke = statusStroke[e.status];
          const speed =
            e.status === "anomaly" ? "pipe-flow-fast" : e.status === "high" ? "" : "pipe-flow-slow";
          return (
            <g key={e.id}>
              {/* base pipe */}
              <line
                x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)}
                stroke="hsl(var(--border))" strokeWidth={10} strokeLinecap="round"
              />
              {/* flow */}
              <line
                x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)}
                stroke={stroke} strokeWidth={4} strokeLinecap="round"
                className={cn("pipe-flow", speed)}
                style={{ cursor: "pointer" }}
                onMouseEnter={(ev) => setHover({ kind: "edge", id: e.id, x: ev.clientX, y: ev.clientY })}
                onMouseMove={(ev) => setHover({ kind: "edge", id: e.id, x: ev.clientX, y: ev.clientY })}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}

        {/* nodes */}
        {snapshot.nodes.map((n) => {
          const cx = px(n.x);
          const cy = py(n.y);
          const stroke = statusStroke[n.status];
          const fill = statusFill[n.status];
          return (
            <g
              key={n.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={(ev) => setHover({ kind: "node", id: n.id, x: ev.clientX, y: ev.clientY })}
              onMouseMove={(ev) => setHover({ kind: "node", id: n.id, x: ev.clientX, y: ev.clientY })}
              onMouseLeave={() => setHover(null)}
            >
              {n.status === "anomaly" && (
                <circle cx={cx} cy={cy} r={18} fill="none" stroke={stroke} strokeWidth={2} className="pulse-alert" />
              )}
              <circle cx={cx} cy={cy} r={18} fill={fill} stroke={stroke} strokeWidth={2.5} />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">
                {Math.round(n.consumption)}
              </text>
              <text x={cx} y={cy + 34} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute top-3 right-3 flex gap-3 rounded-lg border bg-card/90 px-3 py-2 text-xs shadow-card backdrop-blur">
        <LegendDot color="hsl(var(--success))" label="Normal" />
        <LegendDot color="hsl(var(--warning))" label="High" />
        <LegendDot color="hsl(var(--destructive))" label="Anomaly" />
      </div>

      {/* Tooltip */}
      {hover && (hoveredNode || hoveredEdge) && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-card"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hoveredNode && (
            <div className="space-y-0.5">
              <div className="font-semibold">{hoveredNode.label}</div>
              <div>Consumption: <span className="tabular-nums">{hoveredNode.consumption.toFixed(1)} L/h</span></div>
              <div>Baseline: <span className="tabular-nums">{hoveredNode.baseline.toFixed(1)} L/h</span></div>
              <div className="capitalize">Status: {hoveredNode.status}</div>
            </div>
          )}
          {hoveredEdge && (
            <div className="space-y-0.5">
              <div className="font-semibold">Pipe {hoveredEdge.id}</div>
              <div>Flow: <span className="tabular-nums">{hoveredEdge.flow.toFixed(1)} L/h</span></div>
              <div>Capacity: <span className="tabular-nums">{hoveredEdge.capacity} L/h</span></div>
              <div className="capitalize">Status: {hoveredEdge.status}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
