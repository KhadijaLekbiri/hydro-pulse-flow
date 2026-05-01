// Smart Water Network — client-side simulation engine.
// Generates households (nodes), pipes (edges), live consumption,
// anomalies (leaks), alerts, and a simple linear-regression forecast.

export type NodeStatus = "normal" | "high" | "anomaly";

export interface WaterNode {
  id: string;
  label: string;
  x: number; // grid coords (0..1)
  y: number;
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

// 5x4 neighborhood grid → 20 households
const COLS = 5;
const ROWS = 4;

function buildInitialNodes(): WaterNode[] {
  const nodes: WaterNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = `H${r}-${c}`;
      const baseline = 30 + Math.random() * 60; // 30–90 L/h baseline
      nodes.push({
        id,
        label: `House ${r * COLS + c + 1}`,
        x: (c + 0.5) / COLS,
        y: (r + 0.5) / ROWS,
        consumption: baseline,
        baseline,
        status: "normal",
      });
    }
  }
  return nodes;
}

function buildInitialEdges(nodes: WaterNode[]): WaterEdge[] {
  const edges: WaterEdge[] = [];
  const idx = (r: number, c: number) => r * COLS + c;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1) {
        edges.push({
          id: `E-${r}${c}-h`,
          from: nodes[idx(r, c)].id,
          to: nodes[idx(r, c + 1)].id,
          flow: 0,
          capacity: 400,
          status: "normal",
        });
      }
      if (r < ROWS - 1) {
        edges.push({
          id: `E-${r}${c}-v`,
          from: nodes[idx(r, c)].id,
          to: nodes[idx(r + 1, c)].id,
          flow: 0,
          capacity: 400,
          status: "normal",
        });
      }
    }
  }
  return edges;
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
