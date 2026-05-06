import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB, api, isOverdue, isToday } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, AlarmClock } from "lucide-react";
import { LeadDrawer } from "@/components/LeadDrawer";
import { format } from "date-fns";

export const Route = createFileRoute("/followups")({
  head: () => ({ meta: [{ title: "Follow-ups — Cradlewell CRM" }] }),
  component: FollowupsPage,
});

function FollowupsPage() {
  const db = useDB();
  const [openId, setOpenId] = React.useState<string | null>(null);

  const open = db.followups.filter((f) => !f.completed);
  const today = open.filter((f) => isToday(f.dueAt));
  const overdue = open.filter((f) => isOverdue(f.dueAt) && !isToday(f.dueAt));
  const upcoming = open.filter((f) => !isOverdue(f.dueAt) && !isToday(f.dueAt));
  const done = db.followups.filter((f) => f.completed);

  const renderList = (list: typeof open) => (
    <div className="space-y-2">
      {list
        .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
        .map((f) => {
          const lead = db.leads.find((l) => l.id === f.leadId);
          return (
            <Card key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setOpenId(f.leadId)}>
                <div className="font-medium">{lead?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {f.type} · {format(new Date(f.dueAt), "PPp")} · {lead?.owner}
                </div>
                {f.note && <div className="mt-1 text-sm">{f.note}</div>}
              </div>
              {!f.completed && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => api.completeFollowup(f.id)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => api.rescheduleFollowup(f.id, new Date(Date.now() + 86400000).toISOString())}
                  >
                    <AlarmClock className="mr-1 h-3.5 w-3.5" /> +1d
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">Stay on top of every conversation.</p>
      </div>
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({today.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="done">Completed ({done.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="today">{renderList(today)}</TabsContent>
        <TabsContent value="overdue">{renderList(overdue)}</TabsContent>
        <TabsContent value="upcoming">{renderList(upcoming)}</TabsContent>
        <TabsContent value="done">{renderList(done)}</TabsContent>
      </Tabs>
      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}