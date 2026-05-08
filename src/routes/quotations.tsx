import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { LeadDrawer } from "@/components/LeadDrawer";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import type { Quotation, Lead } from "@/lib/types";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Cradlewell CRM" }] }),
  component: QuotationsPage,
});

function QuotationsPage() {
  const db = useDB();
  const [openId, setOpenId] = React.useState<string | null>(null);

  const downloadPdf = (q: Quotation, lead?: Lead) => {
    const doc = new jsPDF();
    const left = 14;
    let y = 20;
    doc.setFontSize(18);
    doc.text("Cradlewell — Quotation", left, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Quotation ID: ${q.id}`, left, y);
    y += 5;
    doc.text(`Date: ${format(new Date(q.date), "PPP")}`, left, y);
    y += 10;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Lead Details", left, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Name: ${lead?.name ?? "—"}`, left, y); y += 5;
    doc.text(`Lead ID: ${lead?.id ?? "—"}`, left, y); y += 5;
    doc.text(`Phone: ${lead?.phone ?? "—"}`, left, y); y += 5;
    if (lead?.address || lead?.area || lead?.city) {
      doc.text(`Address: ${lead?.address ?? [lead?.area, lead?.city].filter(Boolean).join(", ")}`, left, y);
      y += 5;
    }
    y += 5;
    doc.setFontSize(12);
    doc.text("Package Details", left, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Package: ${q.package}`, left, y); y += 5;
    doc.text(`Shift Hours: ${q.shiftHours}`, left, y); y += 5;
    if (q.notes) { doc.text(`Notes: ${q.notes}`, left, y); y += 5; }
    y += 5;
    doc.setFontSize(12);
    doc.text("Pricing", left, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Quoted Price: INR ${q.quotedPrice.toLocaleString()}`, left, y); y += 5;
    doc.text(`Discount: INR ${q.discount.toLocaleString()}`, left, y); y += 5;
    doc.setFontSize(13);
    doc.text(`Final Price: INR ${q.finalPrice.toLocaleString()}`, left, y); y += 10;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Thank you for choosing Cradlewell.", left, 285);
    doc.save(`Quotation-${lead?.name?.replace(/\s+/g, "_") ?? q.id}.pdf`);
  };

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
              <th className="px-3 py-2 text-right">Action</th>
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
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(q, lead)}>
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                  </td>
                </tr>
              );
            })}
            {db.quotations.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">No quotations yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}