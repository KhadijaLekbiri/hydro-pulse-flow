// Smart Water Network — client-side simulation engine.
// Generates households (nodes), pipes (edges), live consumption,
// anomalies (leaks), alerts, and a simple linear-regression forecast.

export type NodeStatus = "normal" | "high" | "anomaly";

export interface WaterNode {
  id: string;
  label: string;
  x: number; // normalized 0..1 (derived from lat/lng), kept for compatibility
  y: number;
  lat: number;
  lng: number;
  consumption: number; // L/h
  baseline: number;
  status: NodeStatus;
}

export interface WaterEdge {
  id: string;
  from: string;
  to: string;
  flow: number; // L/h
  capacity: number;
  status: NodeStatus;
}

export interface Alert {
  id: string;
  ts: number;
  level: "warning" | "critical";
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface SimSnapshot {
  ts: number;
  nodes: WaterNode[];
  edges: WaterEdge[];
  totalConsumption: number;
  avgConsumption: number;
  alerts: Alert[];
  history: { ts: number; total: number }[];
  leakActive: boolean;
}

// Real Casablanca neighborhoods — sensor-equipped households scattered across districts.
// Coordinates are approximate addresses in each area.
const CASA_HOUSEHOLDS: { id: string; label: string; lat: number; lng: number }[] = [
  { id: "H01", label: "Anfa - Bd d'Anfa", lat: 33.5897, lng: -7.6444 },
  { id: "H02", label: "Anfa Supérieur", lat: 33.5842, lng: -7.6552 },
  { id: "H03", label: "Ain Diab - Corniche", lat: 33.6005, lng: -7.6755 },
  { id: "H04", label: "Ain Diab - Tahiti", lat: 33.5948, lng: -7.6840 },
  { id: "H05", label: "Bourgogne", lat: 33.5985, lng: -7.6360 },
  { id: "H06", label: "Gauthier - Massira", lat: 33.5879, lng: -7.6298 },
  { id: "H07", label: "Maârif - Bd Zerktouni", lat: 33.5805, lng: -7.6260 },
  { id: "H08", label: "Maârif Extension", lat: 33.5742, lng: -7.6315 },
  { id: "H09", label: "Racine", lat: 33.5921, lng: -7.6395 },
  { id: "H10", label: "Palmier", lat: 33.5731, lng: -7.6202 },
  { id: "H11", label: "CIL - Hay Hassani", lat: 33.5688, lng: -7.6585 },
  { id: "H12", label: "Oasis", lat: 33.5612, lng: -7.6388 },
  { id: "H13", label: "Sidi Maârouf", lat: 33.5395, lng: -7.6505 },
  { id: "H14", label: "Bourgogne Ouest", lat: 33.6042, lng: -7.6428 },
  { id: "H15", label: "Sidi Belyout - Centre", lat: 33.5945, lng: -7.6155 },
  { id: "H16", label: "Hay Mohammadi", lat: 33.5868, lng: -7.5818 },
  { id: "H17", label: "Roches Noires", lat: 33.6015, lng: -7.5755 },
  { id: "H18", label: "Belvédère", lat: 33.5778, lng: -7.5990 },
  { id: "H19", label: "2 Mars", lat: 33.5685, lng: -7.6080 },
  { id: "H20", label: "Polo - Californie", lat: 33.5468, lng: -7.6262 },
];

// Bounding box derived from the points (with a small margin) for x/y normalization.
const LAT_MIN = 33.535;
const LAT_MAX = 33.610;
const LNG_MIN = -7.690;
const LNG_MAX = -7.570;

function buildInitialNodes(): WaterNode[] {
  return CASA_HOUSEHOLDS.map((h) => {
    const baseline = 30 + Math.random() * 60;
    return {
      id: h.id,
      label: h.label,
      lat: h.lat,
      lng: h.lng,
      x: (h.lng - LNG_MIN) / (LNG_MAX - LNG_MIN),
      y: 1 - (h.lat - LAT_MIN) / (LAT_MAX - LAT_MIN), // y=0 at top (north)
      consumption: baseline,
      baseline,
      status: "normal",
    };
  });
}

// Hand-crafted pipe network connecting nearby districts (no grid).
const PIPE_LINKS: [string, string][] = [
  ["H03", "H04"], ["H04", "H02"], ["H02", "H01"], ["H01", "H14"],
  ["H14", "H05"], ["H05", "H09"], ["H09", "H06"], ["H06", "H07"],
  ["H07", "H08"], ["H08", "H10"], ["H10", "H12"], ["H12", "H11"],
  ["H11", "H04"], ["H05", "H15"], ["H15", "H17"], ["H17", "H16"],
  ["H16", "H18"], ["H18", "H07"], ["H18", "H19"], ["H19", "H20"],
  ["H20", "H13"], ["H13", "H12"], ["H15", "H06"], ["H01", "H09"],
];

function buildInitialEdges(nodes: WaterNode[]): WaterEdge[] {
  const ids = new Set(nodes.map((n) => n.id));
  return PIPE_LINKS.filter(([a, b]) => ids.has(a) && ids.has(b)).map(
    ([from, to], i) => ({
      id: `P${(i + 1).toString().padStart(2, "0")}`,
      from,
      to,
      flow: 0,
      capacity: 400,
      status: "normal" as NodeStatus,
    }),
  );
}

// Realistic daily pattern: peaks in morning + evening.
function dailyMultiplier(date = new Date()): number {
  const h = date.getHours() + date.getMinutes() / 60;
  const morning = Math.exp(-Math.pow((h - 7.5) / 1.6, 2));
  const evening = Math.exp(-Math.pow((h - 19) / 2.0, 2));
  return 0.45 + 1.4 * morning + 1.2 * evening;
}

function classifyNode(c: number, baseline: number): NodeStatus {
  const ratio = c / baseline;
  if (ratio > 3) return "anomaly";
  if (ratio > 1.6) return "high";
  return "normal";
}

function classifyEdge(flow: number, capacity: number): NodeStatus {
  const r = flow / capacity;
  if (r > 0.85) return "anomaly";
  if (r > 0.55) return "high";
  return "normal";
}

export class WaterSim {
  private nodes: WaterNode[];
  private edges: WaterEdge[];
  private history: { ts: number; total: number }[] = [];
  private alerts: Alert[] = [];
  private leakActive = false;
  private leakNodeId: string | null = null;
  private listeners = new Set<(s: SimSnapshot) => void>();
  private timer: number | null = null;

  constructor() {
    this.nodes = buildInitialNodes();
    this.edges = buildInitialEdges(this.nodes);
    this.tick(); // seed
  }

  subscribe(fn: (s: SimSnapshot) => void) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  start(intervalMs = 2500) {
    if (this.timer) return;
    this.timer = window.setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggleLeak() {
    this.leakActive = !this.leakActive;
    if (this.leakActive) {
      const n = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      this.leakNodeId = n.id;
      this.pushAlert({
        level: "critical",
        message: `Leak simulation started near ${n.label}`,
        nodeId: n.id,
      });
    } else {
      this.leakNodeId = null;
      this.pushAlert({ level: "warning", message: "Leak simulation stopped" });
    }
    this.emit();
  }

  reset() {
    this.stop();
    this.nodes = buildInitialNodes();
    this.edges = buildInitialEdges(this.nodes);
    this.history = [];
    this.alerts = [];
    this.leakActive = false;
    this.leakNodeId = null;
    this.tick();
    this.start();
  }

  isLeakActive() {
    return this.leakActive;
  }

  /** Linear regression forecast for next 24 hourly points. */
  forecast(hours = 24): { hour: number; value: number }[] {
    // Aggregate history into hourly buckets (approximate: use last N points).
    const pts = this.history.slice(-60);
    if (pts.length < 4) {
      return Array.from({ length: hours }, (_, i) => ({
        hour: i,
        value: this.totalConsumption(),
      }));
    }
    // Simple linear regression on index → total
    const n = pts.length;
    const xs = pts.map((_, i) => i);
    const ys = pts.map((p) => p.total);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0,
      den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = my - slope * mx;
    const base = intercept + slope * (n - 1);

    // Apply daily multiplier shape over next `hours` hours
    const now = new Date();
    return Array.from({ length: hours }, (_, i) => {
      const future = new Date(now.getTime() + i * 3600_000);
      const m = dailyMultiplier(future) / dailyMultiplier(now);
      return { hour: i, value: Math.max(0, base * m) };
    });
  }

  private totalConsumption() {
    return this.nodes.reduce((a, n) => a + n.consumption, 0);
  }

  private pushAlert(a: Omit<Alert, "id" | "ts">) {
    this.alerts.unshift({
      ...a,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
    });
    this.alerts = this.alerts.slice(0, 30);
  }

  private tick() {
    const mult = dailyMultiplier();

    // Update household consumption with noise.
    for (const n of this.nodes) {
      const noise = (Math.random() - 0.5) * 0.3;
      let c = n.baseline * mult * (1 + noise);

      // Random small spikes
      if (Math.random() < 0.01) c *= 2 + Math.random();

      // Active leak amplifies one node strongly
      if (this.leakActive && n.id === this.leakNodeId) {
        c *= 4 + Math.random() * 2;
      }

      n.consumption = Math.max(2, c);
      const prev = n.status;
      n.status = classifyNode(n.consumption, n.baseline);
      if (prev !== "anomaly" && n.status === "anomaly") {
        this.pushAlert({
          level: "critical",
          message: `Anomalous usage at ${n.label} (${n.consumption.toFixed(0)} L/h)`,
          nodeId: n.id,
        });
      } else if (prev === "normal" && n.status === "high") {
        this.pushAlert({
          level: "warning",
          message: `High usage at ${n.label}`,
          nodeId: n.id,
        });
      }
    }

    // Pipe flow ≈ sum of consumption of downstream/connected households + noise.
    const nodeMap = new Map(this.nodes.map((n) => [n.id, n]));
    for (const e of this.edges) {
      const a = nodeMap.get(e.from)!;
      const b = nodeMap.get(e.to)!;
      const base = (a.consumption + b.consumption) * 0.6 + Math.random() * 20;
      e.flow = base;
      const prev = e.status;
      e.status = classifyEdge(e.flow, e.capacity);
      if (prev !== "anomaly" && e.status === "anomaly") {
        this.pushAlert({
          level: "critical",
          message: `Pipe ${e.id} flow critical (${e.flow.toFixed(0)} L/h)`,
          edgeId: e.id,
        });
      }
    }

    // Push history
    this.history.push({ ts: Date.now(), total: this.totalConsumption() });
    if (this.history.length > 120) this.history.shift();

    this.emit();
  }

  private snapshot(): SimSnapshot {
    const total = this.totalConsumption();
    return {
      ts: Date.now(),
      nodes: this.nodes.map((n) => ({ ...n })),
      edges: this.edges.map((e) => ({ ...e })),
      totalConsumption: total,
      avgConsumption: total / this.nodes.length,
      alerts: [...this.alerts],
      history: [...this.history],
      leakActive: this.leakActive,
    };
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((fn) => fn(s));
  }
}

// Singleton across the app
export const sim = new WaterSim();
sim.start();
