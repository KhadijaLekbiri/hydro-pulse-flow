import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Info, X, PhoneCall, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sim, type Alert } from "@/lib/simulation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  alerts: Alert[];
  max?: number;
  className?: string;
}

export function AlertList({ alerts, max = 8, className }: Props) {
  const navigate = useNavigate();
  const items = alerts.slice(0, max);
  return (
    <Card className={cn("p-5 shadow-card", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{items[0]?.status || "Active"} Alerts</h3>
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
                <div className="flex items-center gap-1">
                  {(a.nodeId || a.edgeId) && (
                    <button
                      onClick={() => {
                        if (a.nodeId) navigate(`/household/${a.nodeId}`);
                        if (a.edgeId) navigate(`/pipe/${a.edgeId}`);
                      }}
                      className="rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:bg-primary/10 hover:text-primary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      title="View Details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="sr-only">View Details</span>
                    </button>
                  )}
                  {a.status === "waiting" && (
                    <>
                      <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:bg-primary/10 hover:text-primary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          title="Forward to Maintenance Team"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          <span className="sr-only">Forward to Maintenance</span>
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Dispatch Maintenance Team?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to forward this alert to the regional intervention team? They will be dispatched to the location immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              toast.success("Team Dispatched", {
                                description: "Regional Maintenance Team notified (0522-45-67-89).",
                              });
                              sim.updateAlertStatus(a.id, "sent");
                            }}
                          >
                            Dispatch Team
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <button
                      onClick={() => sim.updateAlertStatus(a.id, "handled")}
                      className="rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      title="Dismiss alert"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Dismiss</span>
                    </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  );
}
