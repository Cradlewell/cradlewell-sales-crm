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
import templateUrl from "@/assets/quotation-template.jpg";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Cradlewell CRM" }] }),
  component: QuotationsPage,
});

function QuotationsPage() {
  const db = useDB();
  const [openId, setOpenId] = React.useState<string | null>(null);

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const downloadPdf = async (q: Quotation, lead?: Lead) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const H = 297;
    try {
      const img = await loadImage(templateUrl);
      doc.addImage(img, "JPEG", 0, 0, W, H);
    } catch {
      // fallback: continue without background
    }

    const invoiceNo = `CW-INV-${q.id.slice(0, 6).toUpperCase()}`;
    const invoiceDate = format(new Date(q.date), "dd MMM yyyy");
    const dueDate = format(new Date(new Date(q.date).getTime() + 3 * 86400000), "dd MMM yyyy");

    // Invoice meta row (positions tuned to template)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(invoiceNo, 36, 86);
    doc.text(invoiceDate, 96, 86);
    doc.text(dueDate, 158, 86);

    // Bill-to block (above the description table)
    let y = 100;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BILL TO", 18, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += 6;
    doc.text(lead?.name ?? "—", 18, y); y += 5;
    doc.text(`Lead ID: ${lead?.id ?? "—"}`, 18, y); y += 5;
    doc.text(`Phone: ${lead?.phone ?? "—"}`, 18, y); y += 5;
    const addr = lead?.address ?? [lead?.area, lead?.city].filter(Boolean).join(", ");
    if (addr) {
      const lines = doc.splitTextToSize(`Address: ${addr}`, 110);
      doc.text(lines, 18, y);
      y += lines.length * 5;
    }
    if (lead?.hospitalName) { doc.text(`Hospital: ${lead.hospitalName}`, 18, y); y += 5; }
    if (lead?.babyStatus) {
      const bb = `Baby: ${lead.babyStatus}${lead.babyAge ? `, ${lead.babyAge}` : ""}${lead.currentWeight ? `, ${lead.currentWeight}` : ""}`;
      doc.text(bb, 18, y); y += 5;
    }

    // Line item row (template row "1")
    const rowY = 132;
    const descLines = doc.splitTextToSize(
      `${q.package} — ${lead?.serviceRequired ?? "Care Service"}\nShift: ${q.shiftHours}${lead?.shiftTime ? ` (${lead.shiftTime})` : ""}${lead?.careStartDate ? ` | Start: ${format(new Date(lead.careStartDate), "dd MMM yyyy")}` : ""}${lead?.serviceDays ? ` | ${lead.serviceDays} days` : ""}${q.notes ? `\n${q.notes}` : ""}`,
      90,
    );
    doc.setFontSize(10);
    doc.text(descLines, 36, rowY);
    const qty = lead?.serviceDays ?? 1;
    const unit = qty > 0 ? Math.round(q.quotedPrice / qty) : q.quotedPrice;
    doc.text(`INR ${unit.toLocaleString("en-IN")}`, 130, rowY, { align: "right" });
    doc.text(String(qty), 158, rowY, { align: "right" });
    doc.text(`INR ${q.quotedPrice.toLocaleString("en-IN")}`, 192, rowY, { align: "right" });

    // Totals block
    let ty = rowY + 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Subtotal:", 140, ty);
    doc.text(`INR ${q.quotedPrice.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
    ty += 6;
    doc.text("Discount:", 140, ty);
    doc.text(`- INR ${q.discount.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
    ty += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", 140, ty);
    doc.text(`INR ${q.finalPrice.toLocaleString("en-IN")}`, 192, ty, { align: "right" });

    doc.save(`Cradlewell-Quotation-${(lead?.name ?? q.id).replace(/\s+/g, "_")}.pdf`);
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