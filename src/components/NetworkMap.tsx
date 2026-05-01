import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SimSnapshot, WaterNode, WaterEdge } from "@/lib/simulation";

interface Props {
  snapshot: SimSnapshot;
  height?: number;
}

// Casablanca bounding box (roughly central districts)
// SW (lat, lng) → NE (lat, lng)
const CASA_BOUNDS: [[number, number], [number, number]] = [
  [33.555, -7.665], // SW
  [33.605, -7.585], // NE
];
const CASA_CENTER: [number, number] = [33.58, -7.62];

const statusColor = {
  normal: "hsl(var(--success))",
  high: "hsl(var(--warning))",
  anomaly: "hsl(var(--destructive))",
} as const;

// Map node grid coords (0..1) to real lat/lng inside the Casablanca box.
function toLatLng(n: { x: number; y: number }): [number, number] {
  const [[swLat, swLng], [neLat, neLng]] = CASA_BOUNDS;
  const lat = swLat + (1 - n.y) * (neLat - swLat); // invert y so row 0 is north
  const lng = swLng + n.x * (neLng - swLng);
  return [lat, lng];
}

export function NetworkMap({ snapshot, height = 520 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [hover, setHover] = useState<
    | { kind: "node"; node: WaterNode; x: number; y: number }
    | { kind: "edge"; edge: WaterEdge; x: number; y: number }
    | null
  >(null);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: CASA_CENTER,
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    map.fitBounds(CASA_BOUNDS, { padding: [20, 20] });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // ensure proper sizing
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // re-render overlays on snapshot change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const nodeMap = new Map(snapshot.nodes.map((n) => [n.id, n]));

    // edges
    for (const e of snapshot.edges) {
      const a = nodeMap.get(e.from);
      const b = nodeMap.get(e.to);
      if (!a || !b) continue;
      const color = statusColor[e.status];
      const dash =
        e.status === "anomaly" ? "6 6" : e.status === "high" ? "10 6" : "2 8";
      const line = L.polyline([toLatLng(a), toLatLng(b)], {
        color,
        weight: 4,
        opacity: 0.9,
        dashArray: dash,
        lineCap: "round",
      });
      line.on("mouseover", (ev) => {
        const oe = ev.originalEvent as MouseEvent;
        setHover({ kind: "edge", edge: e, x: oe.clientX, y: oe.clientY });
      });
      line.on("mousemove", (ev) => {
        const oe = ev.originalEvent as MouseEvent;
        setHover({ kind: "edge", edge: e, x: oe.clientX, y: oe.clientY });
      });
      line.on("mouseout", () => setHover(null));
      line.addTo(layer);
    }

    // nodes
    for (const n of snapshot.nodes) {
      const color = statusColor[n.status];
      const marker = L.circleMarker(toLatLng(n), {
        radius: n.status === "anomaly" ? 11 : 9,
        color,
        weight: 2.5,
        fillColor: color,
        fillOpacity: 0.35,
      });
      marker.on("mouseover", (ev) => {
        const oe = ev.originalEvent as MouseEvent;
        setHover({ kind: "node", node: n, x: oe.clientX, y: oe.clientY });
      });
      marker.on("mousemove", (ev) => {
        const oe = ev.originalEvent as MouseEvent;
        setHover({ kind: "node", node: n, x: oe.clientX, y: oe.clientY });
      });
      marker.on("mouseout", () => setHover(null));
      marker.addTo(layer);

      if (n.status === "anomaly") {
        L.circleMarker(toLatLng(n), {
          radius: 18,
          color,
          weight: 1.5,
          opacity: 0.7,
          fillOpacity: 0,
          className: "pulse-alert",
        }).addTo(layer);
      }
    }
  }, [snapshot]);

  const headerInfo = useMemo(
    () => `${snapshot.nodes.length} households · ${snapshot.edges.length} pipes`,
    [snapshot.nodes.length, snapshot.edges.length],
  );

  return (
    <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-card">
      <div ref={containerRef} style={{ height, width: "100%" }} />

      {/* Top-left badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-lg border bg-card/90 px-3 py-1.5 text-xs shadow-card backdrop-blur">
        <span className="font-semibold">Casablanca</span>
        <span className="ml-2 text-muted-foreground">{headerInfo}</span>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute right-3 top-3 z-[400] flex gap-3 rounded-lg border bg-card/90 px-3 py-2 text-xs shadow-card backdrop-blur">
        <LegendDot color="hsl(var(--success))" label="Normal" />
        <LegendDot color="hsl(var(--warning))" label="High" />
        <LegendDot color="hsl(var(--destructive))" label="Anomaly" />
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          className="pointer-events-none fixed z-[1000] rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-card"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hover.kind === "node" && (
            <div className="space-y-0.5">
              <div className="font-semibold">{hover.node.label}</div>
              <div>
                Consumption:{" "}
                <span className="tabular-nums">{hover.node.consumption.toFixed(1)} L/h</span>
              </div>
              <div>
                Baseline:{" "}
                <span className="tabular-nums">{hover.node.baseline.toFixed(1)} L/h</span>
              </div>
              <div className="capitalize">Status: {hover.node.status}</div>
            </div>
          )}
          {hover.kind === "edge" && (
            <div className="space-y-0.5">
              <div className="font-semibold">Pipe {hover.edge.id}</div>
              <div>
                Flow: <span className="tabular-nums">{hover.edge.flow.toFixed(1)} L/h</span>
              </div>
              <div>
                Capacity:{" "}
                <span className="tabular-nums">{hover.edge.capacity} L/h</span>
              </div>
              <div className="capitalize">Status: {hover.edge.status}</div>
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
