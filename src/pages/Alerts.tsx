import { useSimulation } from "@/hooks/useSimulation";
import { AlertList } from "@/components/AlertList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Alerts() {
  const snap = useSimulation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Alerts</h2>
        <p className="text-sm text-muted-foreground">
          Triggered when household usage exceeds baseline thresholds or pipe flow nears capacity.
        </p>
      </div>
      <Tabs defaultValue="waiting" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="waiting">Waiting</TabsTrigger>
          <TabsTrigger value="sent">Sent to Maintenance</TabsTrigger>
          <TabsTrigger value="handled">Handled</TabsTrigger>
        </TabsList>
        <TabsContent value="waiting">
          <AlertList alerts={snap.alerts.filter(a => a.status === "waiting")} max={30} />
        </TabsContent>
        <TabsContent value="sent">
          <AlertList alerts={snap.alerts.filter(a => a.status === "sent")} max={30} />
        </TabsContent>
        <TabsContent value="handled">
          <AlertList alerts={snap.alerts.filter(a => a.status === "handled")} max={30} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
