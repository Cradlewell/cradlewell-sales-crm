import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, Upload, UserPlus } from "lucide-react";
import { renderInvoicePdf, type InvoiceItem, type Address } from "@/lib/invoicePdf";

export const Route = createFileRoute("/invoice-generator")({
  head: () => ({ meta: [{ title: "Invoice Generator — Cradlewell CRM" }] }),
  component: InvoiceGeneratorPage,
});

const DEFAULT_NOTES =
  "Thank you for choosing Cradlewell for your newborn care support.\nWe are committed to providing safe, reliable, and compassionate care for both mother and baby.\nIf you need any assistance, our team is always here to help.\n\nWarm regards,\nTeam Cradlewell";

const DEFAULT_TERMS = `• Service Scope: Care service is applicable for one newborn baby under the selected package.
• Care Timings: Services will be provided strictly as per the hours mentioned in the invoice/package.
• Overtime: Any service beyond the agreed hours will be charged additionally.
• Break: Caregivers are entitled to mandatory rest breaks during their shift.
• Replacement: Cradlewell may arrange a one-time replacement of the assigned caregiver, if required, to ensure continuity of care.
• Meal Provision: For Day Care – breakfast and lunch must be provided by the client. For Night Care – dinner must be provided by the client.`;

const emptyAddr: Address = { line1: "", line2: "", city: "", state: "Karnataka", pincode: "", country: "India", phone: "" };

function InvoiceGeneratorPage() {
  const db = useDB();

  const [customerId, setCustomerId] = React.useState<string>("");
  const [isNewCustomer, setIsNewCustomer] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [billing, setBilling] = React.useState<Address>(emptyAddr);
  const [shipping, setShipping] = React.useState<Address>(emptyAddr);
  const [shipSame, setShipSame] = React.useState(true);

  const [invoiceNo, setInvoiceNo] = React.useState<string>("INV-000041");
  const [invoiceDate, setInvoiceDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [terms, setTerms] = React.useState<string>("Due on Receipt");
  const [dueDate, setDueDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [placeOfSupply, setPlaceOfSupply] = React.useState("Karnataka (29)");

  const [items, setItems] = React.useState<InvoiceItem[]>([
    { description: "30 days Nurse care", qty: 1, rate: 4000, taxPct: 9 },
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
    setNewName(customer.name);
    const addr: Address = {
      line1: customer.address ?? [customer.area].filter(Boolean).join(", "),
      line2: "",
      city: customer.city ?? "Bengaluru",
      state: "Karnataka",
      pincode: "",
      country: "India",
      phone: customer.phone,
    };
    setBilling(addr);
    setShipping(addr);
    setItems((prev) => {
      if (prev.length === 1 && (!prev[0].description || prev[0].description === "30 days Nurse care")) {
        return [{
          description: `${customer.serviceRequired ?? "Care Service"}${customer.preferredShift ? ` — ${customer.preferredShift}` : ""}${customer.serviceDays ? ` | ${customer.serviceDays} days` : ""}`,
          qty: customer.serviceDays ?? 1,
          rate: customer.budget ?? 0,
          taxPct: 9,
        }];
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const subTotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const cgstTotal = items.reduce((s, i) => s + (i.qty * i.rate * i.taxPct) / 100, 0);
  const sgstTotal = cgstTotal;
  const discountAmt = discountIsPct ? (subTotal * discount) / 100 : discount;
  const total = Math.max(0, subTotal + cgstTotal + sgstTotal - discountAmt - tdsAmount + adjustmentAmount);

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addRow = () => setItems((p) => [...p, { description: "", qty: 1, rate: 0, taxPct: 0 }]);
  const removeRow = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const customerName = isNewCustomer ? newName : (customer?.name ?? "");
  const canGenerate = !!customerName.trim();

  const generate = () => {
    void renderInvoicePdf({
      invoiceNo,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      terms,
      placeOfSupply,
      customerName,
      billingAddress: billing,
      shippingAddress: shipSame ? billing : shipping,
      items,
      discountValue: discount,
      discountIsPct,
      tdsTcsLabel: taxMode,
      tdsTcsAmount: tdsAmount,
      adjustmentLabel,
      adjustmentAmount,
      customerNotes,
      termsAndConditions: tnc,
      fileName: `Cradlewell-Invoice-${customerName.replace(/\s+/g, "_") || invoiceNo}.pdf`,
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

  const AddressFields = ({ value, onChange }: { value: Address; onChange: (a: Address) => void }) => (
    <div className="grid gap-2">
      <Input placeholder="Address Line 1" value={value.line1 ?? ""} onChange={(e) => onChange({ ...value, line1: e.target.value })} />
      <Input placeholder="Address Line 2" value={value.line2 ?? ""} onChange={(e) => onChange({ ...value, line2: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="City" value={value.city ?? ""} onChange={(e) => onChange({ ...value, city: e.target.value })} />
        <Input placeholder="State" value={value.state ?? ""} onChange={(e) => onChange({ ...value, state: e.target.value })} />
        <Input placeholder="Pincode" value={value.pincode ?? ""} onChange={(e) => onChange({ ...value, pincode: e.target.value })} />
        <Input placeholder="Country" value={value.country ?? ""} onChange={(e) => onChange({ ...value, country: e.target.value })} />
      </div>
      <Input placeholder="Phone" value={value.phone ?? ""} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a personalized tax invoice for your customer.</p>
        </div>
        <Button onClick={generate} disabled={!canGenerate}>
          <Download className="h-4 w-4" /> Save & Download PDF
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <Row label="Customer Name" required>
          {!isNewCustomer ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setIsNewCustomer(false); }}>
                <SelectTrigger className="max-w-md"><SelectValue placeholder="Select an existing customer" /></SelectTrigger>
                <SelectContent>
                  {db.leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} — {l.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsNewCustomer(true); setCustomerId(""); setNewName(""); setBilling(emptyAddr); setShipping(emptyAddr); }}>
                <UserPlus className="h-4 w-4" /> Add New Customer
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input className="max-w-md" placeholder="New customer name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsNewCustomer(false)}>Use existing instead</Button>
            </div>
          )}
        </Row>
        <Row label="Billing Address" required>
          <AddressFields value={billing} onChange={setBilling} />
        </Row>
        <Row label="Shipping Address">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={shipSame} onChange={(e) => setShipSame(e.target.checked)} />
              Same as billing address
            </label>
            {!shipSame && <AddressFields value={shipping} onChange={setShipping} />}
          </div>
        </Row>
        <Row label="Invoice#" required>
          <Input className="max-w-md" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </Row>
        <Row label="Invoice Date" required>
          <div className="grid gap-3 md:grid-cols-3">
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            <Select value={terms} onValueChange={setTerms}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "Custom"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </Row>
        <Row label="Place of Supply">
          <Input className="max-w-md" value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
        </Row>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold">Item Table</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Item Details</th>
                <th className="px-3 py-2 text-right w-24">Qty</th>
                <th className="px-3 py-2 text-right w-28">Rate</th>
                <th className="px-3 py-2 text-right w-24">CGST/SGST %</th>
                <th className="px-3 py-2 text-right w-32">Amount</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t align-top">
                  <td className="px-2 py-2">
                    <Textarea rows={2} value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Item description" />
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
        <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> Add New Row</Button>

        <div className="grid gap-6 pt-4 md:grid-cols-2">
          <div />
          <div className="space-y-2 rounded-md bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between"><span>Sub Total</span><span className="font-medium">₹{subTotal.toLocaleString("en-IN")}</span></div>
            {cgstTotal > 0 && <div className="flex items-center justify-between"><span>CGST</span><span className="font-medium">₹{cgstTotal.toLocaleString("en-IN")}</span></div>}
            {sgstTotal > 0 && <div className="flex items-center justify-between"><span>SGST</span><span className="font-medium">₹{sgstTotal.toLocaleString("en-IN")}</span></div>}
            <div className="flex items-center justify-between gap-2">
              <span>Discount</span>
              <div className="flex items-center gap-2">
                <Input type="number" className="h-8 w-20 text-right" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                <Select value={discountIsPct ? "%" : "₹"} onValueChange={(v) => setDiscountIsPct(v === "%")}>
                  <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="%">%</SelectItem><SelectItem value="₹">₹</SelectItem></SelectContent>
                </Select>
                <span className="w-24 text-right font-medium text-destructive">- ₹{discountAmt.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1"><input type="radio" checked={taxMode === "TDS"} onChange={() => setTaxMode("TDS")} /> TDS</label>
                <label className="flex items-center gap-1"><input type="radio" checked={taxMode === "TCS"} onChange={() => setTaxMode("TCS")} /> TCS</label>
              </div>
              <Input type="number" className="h-8 w-24 text-right" value={tdsAmount} onChange={(e) => setTdsAmount(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Input className="h-8 max-w-[140px]" placeholder="Adjustment" value={adjustmentLabel} onChange={(e) => setAdjustmentLabel(e.target.value)} />
              <Input type="number" className="h-8 w-24 text-right" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(Number(e.target.value))} />
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total ( ₹ )</span><span className="text-primary">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-4">
          <Label className="text-xs font-medium">Customer Notes</Label>
          <Textarea rows={6} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
        </Card>
        <Card className="space-y-2 p-4">
          <Label className="text-xs font-medium">Terms &amp; Conditions</Label>
          <Textarea rows={6} value={tnc} onChange={(e) => setTnc(e.target.value)} />
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
        <Button size="lg" onClick={generate} disabled={!canGenerate}>
          <Download className="h-4 w-4" /> Save &amp; Download PDF
        </Button>
      </div>
    </div>
  );
}
