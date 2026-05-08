import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { LeadDrawer } from "@/components/LeadDrawer";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import type { Lead } from "@/lib/types";
import templateUrl from "@/assets/quotation-template.jpg";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Cradlewell CRM" }] }),
  component: QuotationsPage,
});

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderInvoicePdf(opts: {
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date;
  lead?: Lead;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  fileName: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  try {
    const img = await loadImage(templateUrl);
    doc.addImage(img, "JPEG", 0, 0, 210, 297);
  } catch { /* no bg */ }

  const { lead, qty, unitPrice, discount, description } = opts;
  const subtotal = qty * unitPrice;
  const total = Math.max(0, subtotal - discount);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(opts.invoiceNo, 36, 86);
  doc.text(format(opts.invoiceDate, "dd MMM yyyy"), 96, 86);
  doc.text(format(opts.dueDate, "dd MMM yyyy"), 158, 86);

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

  const rowY = 132;
  const descLines = doc.splitTextToSize(description, 90);
  doc.setFontSize(10);
  doc.text(descLines, 36, rowY);
  doc.text(`INR ${unitPrice.toLocaleString("en-IN")}`, 130, rowY, { align: "right" });
  doc.text(String(qty), 158, rowY, { align: "right" });
  doc.text(`INR ${subtotal.toLocaleString("en-IN")}`, 192, rowY, { align: "right" });

  let ty = rowY + 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, ty);
  doc.text(`INR ${subtotal.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  ty += 6;
  doc.text("Discount:", 140, ty);
  doc.text(`- INR ${discount.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  ty += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 140, ty);
  doc.text(`INR ${total.toLocaleString("en-IN")}`, 192, ty, { align: "right" });

  doc.save(opts.fileName);
}

function QuotationsPage() {
  const db = useDB();
  const [openId, setOpenId] = React.useState<string | null>(null);

  // Invoice generator state
  const [invLeadId, setInvLeadId] = React.useState<string>("");
  const [invNo, setInvNo] = React.useState<string>("CW-INV-1001");
  const [invDate, setInvDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [invDueDate, setInvDueDate] = React.useState<string>(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [invDesc, setInvDesc] = React.useState<string>("");
  const [invQty, setInvQty] = React.useState<number>(1);
  const [invUnit, setInvUnit] = React.useState<number>(0);
  const [invDiscount, setInvDiscount] = React.useState<number>(0);
  const selectedLead = db.leads.find((l) => l.id === invLeadId);

  React.useEffect(() => {
    if (!selectedLead) return;
    setInvDesc(`${selectedLead.serviceRequired ?? "Care Service"}${selectedLead.preferredShift ? ` — ${selectedLead.preferredShift}` : ""}${selectedLead.serviceDays ? ` | ${selectedLead.serviceDays} days` : ""}`);
    if (selectedLead.serviceDays) setInvQty(selectedLead.serviceDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invLeadId]);

  const generateInvoice = () => {
    void renderInvoicePdf({
      invoiceNo: invNo,
      invoiceDate: new Date(invDate),
      dueDate: new Date(invDueDate),
      lead: selectedLead,
      description: invDesc || "Care Service",
      qty: invQty || 1,
      unitPrice: invUnit || 0,
      discount: invDiscount || 0,
      fileName: `Cradlewell-Invoice-${(selectedLead?.name ?? invNo).replace(/\s+/g, "_")}.pdf`,
    });
  };

  const total = Math.max(0, (invQty || 0) * (invUnit || 0) - (invDiscount || 0));

  return (
    <div className="space-y-6 p-4 md:p-8">
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

      <Card className="space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Invoice Generator</h2>
            <p className="text-xs text-muted-foreground">Create a personalized Proforma Invoice PDF for any lead.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Lead</Label>
            <Select value={invLeadId} onValueChange={setInvLeadId}>
              <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
              <SelectContent>
                {db.leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} — {l.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invoice #</Label>
            <Input value={invNo} onChange={(e) => setInvNo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Invoice Date</Label>
            <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={invDesc} onChange={(e) => setInvDesc(e.target.value)} placeholder="e.g. Newborn Care — Day Shift (12h) | 30 days" />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" min={1} value={invQty} onChange={(e) => setInvQty(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Unit Price (₹)</Label>
            <Input type="number" min={0} value={invUnit} onChange={(e) => setInvUnit(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Discount (₹)</Label>
            <Input type="number" min={0} value={invDiscount} onChange={(e) => setInvDiscount(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Total</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold text-primary">
              ₹{total.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={generateInvoice} disabled={!selectedLead}>
            <Download className="h-4 w-4" /> Generate Invoice PDF
          </Button>
        </div>
      </Card>

      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}