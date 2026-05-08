import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import { renderInvoicePdf, type InvoiceItem } from "@/lib/invoicePdf";

export const Route = createFileRoute("/invoice-generator")({
  head: () => ({ meta: [{ title: "Invoice Generator — Cradlewell CRM" }] }),
  component: InvoiceGeneratorPage,
});

const DEFAULT_NOTES =
  "Thank you for choosing Cradlewell for your newborn care support.\nWe are committed to providing safe, reliable, and compassionate care for your baby.";

const DEFAULT_TERMS = `• Service Scope: Care service is applicable for one newborn baby under the selected package.
• Care Timings: Services will be provided strictly as per the hours mentioned in the invoice/package.
• Sundays are off unless specifically included.
• Meals to be provided by the client (Day: Breakfast & Lunch | Night: Dinner).
• Caregiver will be blocked only after payment confirmation.
• Final Tax Invoice will be issued after payment is received.`;

function InvoiceGeneratorPage() {
  const db = useDB();

  const [customerId, setCustomerId] = React.useState<string>("");
  const [invoiceNo, setInvoiceNo] = React.useState<string>("INV-000041");
  const [orderNumber, setOrderNumber] = React.useState<string>("");
  const [invoiceDate, setInvoiceDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [terms, setTerms] = React.useState<string>("Due on Receipt");
  const [dueDate, setDueDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [salesperson, setSalesperson] = React.useState<string>("");
  const [subject, setSubject] = React.useState<string>("");

  const [items, setItems] = React.useState<InvoiceItem[]>([
    { description: "", qty: 1, rate: 0, taxPct: 0 },
  ]);

  const [discount, setDiscount] = React.useState<number>(0);
  const [discountIsPct, setDiscountIsPct] = React.useState<boolean>(true);
  const [taxMode, setTaxMode] = React.useState<"TDS" | "TCS">("TDS");
  const [tdsAmount, setTdsAmount] = React.useState<number>(0);
  const [adjustmentLabel, setAdjustmentLabel] = React.useState<string>("");
  const [adjustmentAmount, setAdjustmentAmount] = React.useState<number>(0);

  const [customerNotes, setCustomerNotes] = React.useState<string>(DEFAULT_NOTES);
  const [tnc, setTnc] = React.useState<string>(DEFAULT_TERMS);

  const customer = db.leads.find((l) => l.id === customerId);

  React.useEffect(() => {
    if (!customer) return;
    if (!subject) setSubject(`${customer.serviceRequired ?? "Newborn Care"} — ${customer.preferredShift ?? ""}`.trim());
    setItems((prev) => {
      if (prev.length === 1 && !prev[0].description && prev[0].rate === 0) {
        return [{
          description: `${customer.serviceRequired ?? "Care Service"}${customer.preferredShift ? ` — ${customer.preferredShift}` : ""}${customer.serviceDays ? ` | ${customer.serviceDays} days` : ""}`,
          qty: customer.serviceDays ?? 1,
          rate: customer.budget ?? 0,
          taxPct: 0,
        }];
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const subTotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const taxTotal = items.reduce((s, i) => s + (i.qty * i.rate * i.taxPct) / 100, 0);
  const discountAmt = discountIsPct ? (subTotal * discount) / 100 : discount;
  const total = Math.max(0, subTotal + taxTotal - discountAmt - tdsAmount + adjustmentAmount);

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addRow = () => setItems((p) => [...p, { description: "", qty: 1, rate: 0, taxPct: 0 }]);
  const removeRow = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const generate = () => {
    void renderInvoicePdf({
      invoiceNo,
      orderNumber,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      terms,
      salesperson,
      subject,
      lead: customer,
      customerName: customer?.name,
      items,
      discountValue: discount,
      discountIsPct,
      tdsTcsLabel: taxMode,
      tdsTcsAmount: tdsAmount,
      adjustmentLabel,
      adjustmentAmount,
      customerNotes,
      termsAndConditions: tnc,
      fileName: `Cradlewell-Invoice-${(customer?.name ?? invoiceNo).replace(/\s+/g, "_")}.pdf`,
    });
  };

  const Row = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="grid grid-cols-12 items-start gap-3 border-b border-border/50 px-4 py-3 last:border-b-0">
      <Label className="col-span-12 pt-2 text-xs font-medium text-muted-foreground md:col-span-3">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a personalized invoice for your customer.</p>
        </div>
        <Button onClick={generate} disabled={!customer}>
          <Download className="h-4 w-4" /> Save & Download PDF
        </Button>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden p-0">
        <Row label="Customer Name" required>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Select or add a customer" /></SelectTrigger>
            <SelectContent>
              {db.leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name} — {l.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Invoice#" required>
          <Input className="max-w-md" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </Row>
        <Row label="Order Number">
          <Input className="max-w-md" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        </Row>
        <Row label="Invoice Date" required>
          <div className="grid gap-3 md:grid-cols-3">
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Terms</span>
              <Select value={terms} onValueChange={setTerms}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "Custom"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Due Date</span>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </Row>
        <Row label="Salesperson">
          <Input className="max-w-md" value={salesperson} onChange={(e) => setSalesperson(e.target.value)} placeholder="Select or Add Salesperson" />
        </Row>
        <Row label="Subject">
          <Textarea rows={2} className="max-w-md" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Let your customer know what this Invoice is for" />
        </Row>
      </Card>

      {/* Item table */}
      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold">Item Table</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Item Details</th>
                <th className="px-3 py-2 text-right w-24">Quantity</th>
                <th className="px-3 py-2 text-right w-28">Rate</th>
                <th className="px-3 py-2 text-right w-24">Tax %</th>
                <th className="px-3 py-2 text-right w-32">Amount</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t align-top">
                  <td className="px-2 py-2">
                    <Textarea rows={2} value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Type or click to select an item." />
                  </td>
                  <td className="px-2 py-2"><Input type="number" min={0} className="text-right" value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} /></td>
                  <td className="px-2 py-2"><Input type="number" min={0} className="text-right" value={it.rate} onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })} /></td>
                  <td className="px-2 py-2"><Input type="number" min={0} className="text-right" value={it.taxPct} onChange={(e) => updateItem(idx, { taxPct: Number(e.target.value) })} /></td>
                  <td className="px-3 py-2 text-right font-medium">₹{(it.qty * it.rate).toLocaleString("en-IN")}</td>
                  <td className="px-2 py-2">
                    {items.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> Add New Row</Button>
          <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, { description: "", qty: 1, rate: 0, taxPct: 0 }, { description: "", qty: 1, rate: 0, taxPct: 0 }])}>
            <Plus className="h-4 w-4" /> Add Items in Bulk
          </Button>
        </div>

        {/* Totals */}
        <div className="grid gap-6 pt-4 md:grid-cols-2">
          <div /> {/* spacer */}
          <div className="space-y-2 rounded-md bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Sub Total</span>
              <span className="font-medium">₹{subTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Discount</span>
              <div className="flex items-center gap-2">
                <Input type="number" className="h-8 w-20 text-right" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                <Select value={discountIsPct ? "%" : "₹"} onValueChange={(v) => setDiscountIsPct(v === "%")}>
                  <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="%">%</SelectItem>
                    <SelectItem value="₹">₹</SelectItem>
                  </SelectContent>
                </Select>
                <span className="w-24 text-right font-medium text-destructive">- ₹{discountAmt.toLocaleString("en-IN")}</span>
              </div>
            </div>
            {taxTotal > 0 && (
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <span className="font-medium">₹{taxTotal.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1"><input type="radio" checked={taxMode === "TDS"} onChange={() => setTaxMode("TDS")} /> TDS</label>
                <label className="flex items-center gap-1"><input type="radio" checked={taxMode === "TCS"} onChange={() => setTaxMode("TCS")} /> TCS</label>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" className="h-8 w-24 text-right" value={tdsAmount} onChange={(e) => setTdsAmount(Number(e.target.value))} />
                <span className="w-24 text-right font-medium">- ₹{tdsAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Input className="h-8 max-w-[140px]" placeholder="Adjustment" value={adjustmentLabel} onChange={(e) => setAdjustmentLabel(e.target.value)} />
              <div className="flex items-center gap-2">
                <Input type="number" className="h-8 w-24 text-right" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(Number(e.target.value))} />
                <span className="w-24 text-right font-medium">₹{adjustmentAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total ( ₹ )</span>
              <span className="text-primary">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes / Terms / Attach */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-4">
          <Label className="text-xs font-medium">Customer Notes</Label>
          <Textarea rows={4} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">Will be displayed on the invoice</p>
        </Card>
        <Card className="space-y-2 p-4">
          <Label className="text-xs font-medium">Terms &amp; Conditions</Label>
          <Textarea rows={4} value={tnc} onChange={(e) => setTnc(e.target.value)} />
        </Card>
        <Card className="space-y-2 p-4 md:col-span-2">
          <Label className="text-xs font-medium">Attach File(s) to Invoice</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled><Upload className="h-4 w-4" /> Upload File</Button>
            <span className="text-[11px] text-muted-foreground">You can upload a maximum of 10 files, 10MB each</span>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={generate} disabled={!customer}>
          <Download className="h-4 w-4" /> Save &amp; Download PDF
        </Button>
      </div>
    </div>
  );
}