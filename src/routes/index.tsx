import { createFileRoute } from "@tanstack/react-router";
import { useDB, isOverdue, isToday } from "@/lib/store";
import { Card } from "@/components/ui/card";
import {
  Users,
  Sparkles,
  CalendarClock,
  AlertTriangle,
  Flame,
  FileText,
  CreditCard,
  Trophy,
  XCircle,
  IndianRupee,
} from "lucide-react";
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const db = useDB();
  const leads = db.leads;
  const followups = db.followups;

  const newToday = leads.filter((l) => isToday(l.createdAt)).length;
  const dueToday = followups.filter((f) => !f.completed && isToday(f.dueAt)).length;
  const overdue = followups.filter((f) => !f.completed && isOverdue(f.dueAt) && !isToday(f.dueAt)).length;
  const hot = leads.filter((l) => l.temperature === "Hot" && !["Closed Won","Closed Lost"].includes(l.stage)).length;
  const quoted = leads.filter((l) => ["Quotation Shared","Negotiation","Payment Pending"].includes(l.stage)).length;
  const paymentPending = leads.filter((l) => l.stage === "Payment Pending").length;
  const won = leads.filter((l) => l.stage === "Closed Won").length;
  const lost = leads.filter((l) => l.stage === "Closed Lost").length;
  const monthRevenue = db.closures
    .filter((c) => c.type === "Won" && new Date(c.closureDate).getMonth() === new Date().getMonth())
    .reduce((s, c) => s + (c.finalAmount ?? 0), 0);

  const cards = [
    { label: "Total leads", value: leads.length, icon: Users, color: "text-primary" },
    { label: "New today", value: newToday, icon: Sparkles, color: "text-secondary" },
    { label: "Follow-ups today", value: dueToday, icon: CalendarClock, color: "text-warning-foreground" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, color: "text-destructive" },
    { label: "Hot leads", value: hot, icon: Flame, color: "text-hot" },
    { label: "Quotations shared", value: quoted, icon: FileText, color: "text-primary" },
    { label: "Payment pending", value: paymentPending, icon: CreditCard, color: "text-destructive" },
    { label: "Closed won", value: won, icon: Trophy, color: "text-success" },
    { label: "Closed lost", value: lost, icon: XCircle, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Today's pulse for the Cradlewell sales team.</p>
        </div>
        <LeadFormDialog />
      </div>

      <Card className="overflow-hidden border-0 bg-[image:var(--gradient-brand)] p-6 text-primary-foreground shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs opacity-80">Revenue closed this month</div>
            <div className="mt-1 flex items-center gap-1 text-3xl font-semibold">
              <IndianRupee className="h-6 w-6" />
              {monthRevenue.toLocaleString()}
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="opacity-80 text-xs">Won</div>
              <div className="text-xl font-semibold">{won}</div>
            </div>
            <div>
              <div className="opacity-80 text-xs">In pipeline</div>
              <div className="text-xl font-semibold">{leads.length - won - lost}</div>
            </div>
            <div>
              <div className="opacity-80 text-xs">Conversion</div>
              <div className="text-xl font-semibold">
                {leads.length ? Math.round((won / leads.length) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4 transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold">{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Today's follow-ups</h3>
            <Link to="/followups" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {followups
              .filter((f) => !f.completed && isToday(f.dueAt))
              .slice(0, 5)
              .map((f) => {
                const lead = leads.find((l) => l.id === f.leadId);
                return (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                    <div>
                      <div className="font-medium">{lead?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{f.type}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(f.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                );
              })}
            {followups.filter((f) => !f.completed && isToday(f.dueAt)).length === 0 && (
              <p className="text-sm text-muted-foreground">All clear for today 🎉</p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Hot leads</h3>
            <Link to="/leads" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {leads
              .filter((l) => l.temperature === "Hot" && !["Closed Won","Closed Lost"].includes(l.stage))
              .slice(0, 5)
              .map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                  <div>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.stage} · {l.owner}</div>
                  </div>
                  <span className="text-xs font-semibold text-primary">{l.closureProbability ?? 0}%</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
