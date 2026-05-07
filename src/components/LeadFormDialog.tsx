import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/store";
import { toast } from "sonner";
import type { BabyStatus, LeadSource, Shift } from "@/lib/types";
import { Plus } from "lucide-react";

export function LeadFormDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    whatsapp: "",
    source: "Website" as LeadSource,
    serviceRequired: "Newborn Care",
    babyStatus: "Born" as BabyStatus,
    hospitalName: "",
    babyAgeOrMonth: "",
    area: "",
    city: "",
    preferredShift: "Day (12h)" as Shift,
    budget: "",
    notes: "",
    owner: "Aarav",
    babyBirthStageStatus: "",
    babyAge: "",
    currentWeight: "",
    address: "",
    shiftHoursCount: "",
    shiftTime: "",
    careStartDate: "",
    serviceDays: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Name and phone are required");
      return;
    }
    api.addLead({
      name: form.name,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      source: form.source,
      leadDate: new Date().toISOString(),
      serviceRequired: form.serviceRequired,
      babyStatus: form.babyStatus,
      hospitalName: form.hospitalName,
      babyAgeOrMonth: form.babyAgeOrMonth,
      area: form.area,
      city: form.city,
      preferredShift: form.preferredShift,
      budget: form.budget ? Number(form.budget) : undefined,
      notes: form.notes,
      owner: form.owner,
      closureProbability: 20,
      babyBirthStageStatus: form.babyBirthStageStatus || undefined,
      babyAge: form.babyAge || undefined,
      currentWeight: form.currentWeight || undefined,
      address: form.address || undefined,
      shiftHoursCount: form.shiftHoursCount ? Number(form.shiftHoursCount) : undefined,
      shiftTime: form.shiftTime || undefined,
      careStartDate: form.careStartDate || undefined,
      serviceDays: form.serviceDays ? Number(form.serviceDays) : undefined,
    });
    toast.success("Lead added");
    setOpen(false);
    setForm({
      ...form,
      name: "",
      phone: "",
      whatsapp: "",
      hospitalName: "",
      babyAgeOrMonth: "",
      area: "",
      city: "",
      budget: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-1 h-4 w-4" /> New Lead
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add new lead</DialogTitle>
        </DialogHeader>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="Name *">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Phone *">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
          <Field label="Lead source">
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Website","Instagram","Facebook","Google Ads","Referral","Walk-in","Hospital Partner","Other"].map(s=>(
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Service required">
            <Select value={form.serviceRequired} onValueChange={(v) => set("serviceRequired", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Newborn Care","Postnatal Care","Lactation Support","Night Nanny"].map(s=>(
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Baby status">
            <Select value={form.babyStatus} onValueChange={(v) => set("babyStatus", v as BabyStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Born">Born</SelectItem>
                <SelectItem value="Expecting">Expecting</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hospital">
            <Input value={form.hospitalName} onChange={(e) => set("hospitalName", e.target.value)} />
          </Field>
          <Field label="Baby age / Expecting month">
            <Input value={form.babyAgeOrMonth} onChange={(e) => set("babyAgeOrMonth", e.target.value)} />
          </Field>
          <Field label="Baby birth stage / status">
            <Input
              placeholder="Full term, Pre-term, NICU, C-section…"
              value={form.babyBirthStageStatus}
              onChange={(e) => set("babyBirthStageStatus", e.target.value)}
            />
          </Field>
          <Field label="Baby age">
            <Input
              placeholder="e.g. 12 days, 3 weeks"
              value={form.babyAge}
              onChange={(e) => set("babyAge", e.target.value)}
            />
          </Field>
          <Field label="Current weight">
            <Input
              placeholder="e.g. 2.8 kg"
              value={form.currentWeight}
              onChange={(e) => set("currentWeight", e.target.value)}
            />
          </Field>
          <Field label="Area">
            <Input value={form.area} onChange={(e) => set("area", e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Address</Label>
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <Field label="Preferred shift">
            <Select value={form.preferredShift} onValueChange={(v) => set("preferredShift", v as Shift)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Day (12h)","Night (12h)","Full Day (24h)","Custom"].map(s=>(
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Shift hours">
            <Input
              type="number"
              placeholder="e.g. 8, 12, 24"
              value={form.shiftHoursCount}
              onChange={(e) => set("shiftHoursCount", e.target.value)}
            />
          </Field>
          <Field label="Shift time">
            <Input
              placeholder="e.g. 9:00 AM - 9:00 PM"
              value={form.shiftTime}
              onChange={(e) => set("shiftTime", e.target.value)}
            />
          </Field>
          <Field label="Care start date">
            <Input
              type="date"
              value={form.careStartDate}
              onChange={(e) => set("careStartDate", e.target.value)}
            />
          </Field>
          <Field label="Service days">
            <Input
              type="number"
              placeholder="e.g. 30"
              value={form.serviceDays}
              onChange={(e) => set("serviceDays", e.target.value)}
            />
          </Field>
          <Field label="Budget (₹)">
            <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
          </Field>
          <Field label="Lead owner">
            <Select value={form.owner} onValueChange={(v) => set("owner", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Aarav","Priya","Neha"].map(s=>(<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Requirement notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}