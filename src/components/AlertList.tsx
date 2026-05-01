import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Info } from "lucide-react";
import type { Alert } from "@/lib/simulation";
import { cn } from "@/lib/utils";

interface Props {
  alerts: Alert[];
  max?: number;
  className?: string;
}

export function AlertList({ alerts, max = 8, className }: Props) {
  const items = alerts.slice(0, max);
  return (
    <Card className={cn("p-5 shadow-card", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Active Alerts</h3>
        <Badge variant="secondary" className="tabular-nums">{alerts.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">All systems nominal · no alerts</p>
      ) : (
        <ScrollArea className="h-64 pr-2">
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-2.5 text-xs",
                  a.level === "critical"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-warning/30 bg-warning/5",
                )}
              >
                {a.level === "critical" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 text-warning" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(a.ts).toLocaleTimeString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  );
}
