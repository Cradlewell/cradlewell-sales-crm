import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";
import { renderInvoicePdf } from "@/lib/invoicePdf";

export const Route = createFileRoute("/invoice-generator")({
  head: () => ({ meta: [{ title: "Invoice Generator — Cradlewell CRM" }] }),
  component: InvoiceGeneratorPage,
});

function InvoiceGeneratorPage() {
  const db = useDB();
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

  const total = Math.max(0, (invQty || 0) * (invUnit || 0) - (invDiscount || 0));

  const generate = () => {
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

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice Generator</h1>
        <p className="text-sm text-muted-foreground">Create a personalized Proforma Invoice PDF for any lead.</p>
      </div>
      <Card className="space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Invoice Details</h2>
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
          <Button onClick={generate} disabled={!selectedLead}>
            <Download className="h-4 w-4" /> Generate Invoice PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}