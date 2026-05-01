import { useEffect, useState } from "react";
import { sim, type SimSnapshot } from "@/lib/simulation";

export function useSimulation(): SimSnapshot {
  const [snap, setSnap] = useState<SimSnapshot>(() => ({
    ts: Date.now(),
    nodes: [],
    edges: [],
    totalConsumption: 0,
    avgConsumption: 0,
    alerts: [],
    history: [],
    leakActive: false,
  }));
  useEffect(() => {
    const unsub = sim.subscribe(setSnap);
    return () => { unsub; };
  }, []);
  return snap;
}
