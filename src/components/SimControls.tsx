import { Button } from "@/components/ui/button";
import { Droplet, RotateCcw } from "lucide-react";
import { sim } from "@/lib/simulation";
import { useSimulation } from "@/hooks/useSimulation";
import { cn } from "@/lib/utils";

export function SimControls() {
  const { leakActive } = useSimulation();
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={leakActive ? "destructive" : "outline"}
        onClick={() => sim.toggleLeak()}
        className={cn("gap-2", leakActive && "shadow-glow")}
      >
        <Droplet className="h-4 w-4" />
        {leakActive ? "Stop Leak Sim" : "Simulate Leak"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => sim.reset()} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}
