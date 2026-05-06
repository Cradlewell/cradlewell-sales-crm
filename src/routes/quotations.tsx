import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { LeadDrawer } from "@/components/LeadDrawer";
import { format } from "date-fns";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Cradlewell CRM" }] }),
  component: QuotationsPage,
});

function QuotationsPage() {
  const db = useDB();
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
        <p className="text-sm text-muted-foreground">All quotations shared with leads.</p>
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Lead</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2 hidden md:table-cell">Shift</th>
              <th className="px-3 py-2 text-right">Quoted</th>
              <th className="px-3 py-2 text-right hidden md:table-cell">Discount</th>
              <th className="px-3 py-2 text-right">Final</th>
              <th className="px-3 py-2 hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {db.quotations.map((q) => {
              const lead = db.leads.find((l) => l.id === q.leadId);
              return (
                <tr key={q.id} onClick={() => setOpenId(q.leadId)} className="cursor-pointer border-t hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium">{lead?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{lead?.id}</div>
                  </td>
                  <td className="px-3 py-2">{q.package}</td>
                  <td className="px-3 py-2 hidden md:table-cell">{q.shiftHours}</td>
                  <td className="px-3 py-2 text-right">₹{q.quotedPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right hidden md:table-cell">₹{q.discount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">₹{q.finalPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 hidden md:table-cell">{format(new Date(q.date), "PP")}</td>
                </tr>
              );
            })}
            {db.quotations.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No quotations yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}