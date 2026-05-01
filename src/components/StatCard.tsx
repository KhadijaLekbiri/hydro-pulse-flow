import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
}

const toneMap = {
  default: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: Props) {
  return (
    <Card className="p-5 shadow-card transition-smooth hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("rounded-lg p-2.5", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
