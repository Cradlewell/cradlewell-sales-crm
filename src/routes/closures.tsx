import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeadDrawer } from "@/components/LeadDrawer";
import { format } from "date-fns";

export const Route = createFileRoute("/closures")({
  head: () => ({ meta: [{ title: "Closures — Cradlewell CRM" }] }),
  component: ClosuresPage,
});

function ClosuresPage() {
  const db = useDB();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const won = db.closures.filter((c) => c.type === "Won");
  const lost = db.closures.filter((c) => c.type === "Lost");

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Closures</h1>
        <p className="text-sm text-muted-foreground">Track wins, losses, and payment status.</p>
      </div>
      <Tabs defaultValue="won">
        <TabsList>
          <TabsTrigger value="won">Won ({won.length})</TabsTrigger>
          <TabsTrigger value="lost">Lost ({lost.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="won">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {won.map((c) => {
              const lead = db.leads.find((l) => l.id === c.leadId);
              return (
                <Card key={c.id} onClick={() => setOpenId(c.leadId)} className="cursor-pointer p-4 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{lead?.name}</div>
                      <div className="text-xs text-muted-foreground">{c.finalPackage}</div>
                    </div>
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">{c.paymentStatus}</span>
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-primary">₹{(c.finalAmount ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Advance ₹{(c.advanceReceived ?? 0).toLocaleString()} · {format(new Date(c.closureDate), "PP")}</div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="lost">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {lost.map((c) => {
              const lead = db.leads.find((l) => l.id === c.leadId);
              return (
                <Card key={c.id} onClick={() => setOpenId(c.leadId)} className="cursor-pointer p-4 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{lead?.name}</div>
                      <div className="text-xs text-muted-foreground">{c.lostReason}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Competitor: {c.competitorName || "—"} · {format(new Date(c.closureDate), "PP")}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}