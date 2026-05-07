import { createFileRoute } from "@tanstack/react-router";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Cradlewell CRM" }] }),
  component: ReportsPage,
});

const COLORS = ["#6388FF", "#5F47FF", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7"];

function ReportsPage() {
  const db = useDB();
  const leads = db.leads;

  const bySource = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.source] = (acc[l.source] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const won = leads.filter((l) => l.stage === "Closed Won").length;
  const conversion = leads.length ? Math.round((won / leads.length) * 100) : 0;

  const fuTotal = db.followups.length;
  const fuDone = db.followups.filter((f) => f.completed).length;
  const fuRate = fuTotal ? Math.round((fuDone / fuTotal) * 100) : 0;

  const perOwner = Object.entries(
    leads.reduce<Record<string, { total: number; won: number; revenue: number }>>((acc, l) => {
      acc[l.owner] = acc[l.owner] ?? { total: 0, won: 0, revenue: 0 };
      acc[l.owner].total++;
      if (l.stage === "Closed Won") acc[l.owner].won++;
      return acc;
    }, {}),
  ).map(([owner, v]) => {
    const revenue = db.closures
      .filter((c) => c.salesOwner === owner && c.type === "Won")
      .reduce((s, c) => s + (c.finalAmount ?? 0), 0);
    return { owner, ...v, revenue };
  });

  const lostBreakdown = Object.entries(
    db.closures
      .filter((c) => c.type === "Lost")
      .reduce<Record<string, number>>((acc, c) => {
        const key = c.lostReason ?? "Other";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
  ).map(([name, value]) => ({ name, value }));

  const revenue = db.closures
    .filter((c) => c.type === "Won")
    .reduce((s, c) => s + (c.finalAmount ?? 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Performance and pipeline insights.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Conversion rate" value={`${conversion}%`} />
        <Stat label="Follow-up completion" value={`${fuRate}%`} />
        <Stat label="Closed revenue" value={`₹${revenue.toLocaleString()}`} />
        <Stat label="Hot pipeline" value={leads.filter((l) => l.temperature === "Hot" && !["Closed Won","Closed Lost"].includes(l.stage)).length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Leads by source</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {bySource.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Salesperson performance</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={perOwner}>
                <XAxis dataKey="owner" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#6388FF" name="Leads" />
                <Bar dataKey="won" fill="#5F47FF" name="Won" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Lost reasons</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={lostBreakdown}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Follow-up</h3>
          <div className="space-y-2">
            {leads.filter((l) => l.stage === "Follow-up").map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.id} · {l.owner}</div>
                </div>
                <span className="text-xs font-semibold text-destructive">Reminder daily</span>
              </div>
            ))}
            {leads.filter((l) => l.stage === "Follow-up").length === 0 && (
              <p className="text-sm text-muted-foreground">No follow-ups.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Card>
  );
}