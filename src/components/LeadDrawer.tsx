import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { api, isOverdue, useDB } from "@/lib/store";
import {
  LEAD_STAGES,
  type FollowupType,
  type LeadTemperature,
  type LostReason,
} from "@/lib/types";
import { StageBadge, TempBadge } from "./StageBadge";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlarmClock,
  Trophy,
  User,
  Baby,
  Briefcase,
  MapPin,
  Clock,
  CalendarDays,
  Stethoscope,
  IndianRupee,
  Sparkles,
  Pencil,
  Check,
} from "lucide-react";
import { format } from "date-fns";

const FOLLOWUP_TYPES: FollowupType[] = [
  "First call",
  "Call back",
  "Quotation reminder",
  "Payment reminder",
  "Trial decision",
  "Closure follow-up",
];

const LOST_REASONS: LostReason[] = [
  "Competitor selected",
  "Budget issue",
  "No response",
  "Trust issue",
  "Service not available",
  "Other",
];

export function LeadDrawer({
  leadId,
  onClose,
}: {
  leadId: string | null;
  onClose: () => void;
}) {
  const db = useDB();
  const lead = db.leads.find((l) => l.id === leadId);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name ?? "",
        phone: lead.phone ?? "",
        whatsapp: lead.whatsapp ?? "",
        source: lead.source ?? "",
        hospitalName: lead.hospitalName ?? "",
        babyBirthStageStatus: lead.babyBirthStageStatus ?? "",
        babyAge: lead.babyAge ?? lead.babyAgeOrMonth ?? "",
        currentWeight: lead.currentWeight ?? "",
        serviceRequired: lead.serviceRequired ?? "",
        preferredShift: lead.preferredShift ?? "",
        shiftHoursCount: lead.shiftHoursCount ? String(lead.shiftHoursCount) : "",
        shiftTime: lead.shiftTime ?? "",
        careStartDate: lead.careStartDate ? String(lead.careStartDate).slice(0, 10) : "",
        serviceDays: lead.serviceDays ? String(lead.serviceDays) : "",
        budget: lead.budget ? String(lead.budget) : "",
        area: lead.area ?? "",
        city: lead.city ?? "",
        address: lead.address ?? "",
      });
      setEditing(false);
    }
  }, [lead?.id]);

  if (!lead) {
    return (
      <Sheet open={false} onOpenChange={() => onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const setF = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const saveEdits = () => {
    api.updateLead(lead.id, {
      name: form.name,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      hospitalName: form.hospitalName || undefined,
      babyBirthStageStatus: form.babyBirthStageStatus || undefined,
      babyAge: form.babyAge || undefined,
      currentWeight: form.currentWeight || undefined,
      serviceRequired: form.serviceRequired,
      preferredShift: (form.preferredShift || undefined) as never,
      shiftHoursCount: form.shiftHoursCount ? Number(form.shiftHoursCount) : undefined,
      shiftTime: form.shiftTime || undefined,
      careStartDate: form.careStartDate || undefined,
      serviceDays: form.serviceDays ? Number(form.serviceDays) : undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      area: form.area || undefined,
      city: form.city || undefined,
      address: form.address || undefined,
    } as never);
    setEditing(false);
    toast.success("Lead updated");
  };

  const followups = db.followups.filter((f) => f.leadId === lead.id);
  const quotations = db.quotations.filter((q) => q.leadId === lead.id);
  const closure = db.closures.find((c) => c.leadId === lead.id);
  const activity = db.activity.filter((a) => a.leadId === lead.id);

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b bg-[image:var(--gradient-brand)] p-5 text-primary-foreground">
          <SheetTitle className="text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-semibold uppercase ring-2 ring-white/30">
                  {lead.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[11px] opacity-80">
                    <span className="rounded bg-white/15 px-1.5 py-0.5 font-medium tracking-wide">{lead.id}</span>
                    <span>· {lead.source}</span>
                  </div>
                  <div className="mt-1 text-xl font-semibold leading-tight">{lead.name}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs opacity-95">
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25"
                    >
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </a>
                    <a
                      href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25"
                    >
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </SheetTitle>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium">
              <Sparkles className="h-3 w-3" /> {lead.stage}
            </span>
            {editing ? (
              <>
                <button
                  onClick={saveEdits}
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary hover:bg-white/90"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium hover:bg-white/25"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium hover:bg-white/30"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border bg-muted/40 p-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Stage</Label>
              <Select value={lead.stage} onValueChange={(v) => api.moveStage(lead.id, v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="profile">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups ({followups.length})</TabsTrigger>
              <TabsTrigger value="quotations">Quotations ({quotations.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-3">
              <Section icon={<User className="h-4 w-4" />} title="Lead info">
                <EditField label="Name" editing={editing} value={form.name} display={lead.name} onChange={(v)=>setF("name",v)} />
                <EditField label="Phone" editing={editing} value={form.phone} display={lead.phone} onChange={(v)=>setF("phone",v)} />
                <EditField label="WhatsApp" editing={editing} value={form.whatsapp} display={lead.whatsapp} onChange={(v)=>setF("whatsapp",v)} />
                <Info label="Source" value={lead.source} />
                <Info label="Lead date" value={format(new Date(lead.leadDate ?? lead.createdAt), "dd MMM yyyy")} />
                <Info label="Lead time" value={format(new Date(lead.leadDate ?? lead.createdAt), "p")} />
                <Info label="Lead day" value={format(new Date(lead.leadDate ?? lead.createdAt), "EEEE")} />
              </Section>

              <Section icon={<Baby className="h-4 w-4" />} title="Baby details">
                <Info label="Status" value={lead.babyStatus} />
                <EditField label="Hospital" editing={editing} value={form.hospitalName} display={lead.hospitalName ?? "-"} icon={<Stethoscope className="h-3 w-3" />} onChange={(v)=>setF("hospitalName",v)} />
                <EditField label="Birth stage / status" editing={editing} value={form.babyBirthStageStatus} display={lead.babyBirthStageStatus ?? "-"} onChange={(v)=>setF("babyBirthStageStatus",v)} />
                <EditField label="Baby age" editing={editing} value={form.babyAge} display={lead.babyAge ?? lead.babyAgeOrMonth ?? "-"} onChange={(v)=>setF("babyAge",v)} />
                <EditField label="Current weight" editing={editing} value={form.currentWeight} display={lead.currentWeight ?? "-"} onChange={(v)=>setF("currentWeight",v)} />
              </Section>

              <Section icon={<Briefcase className="h-4 w-4" />} title="Service & shift">
                <EditField label="Service" editing={editing} value={form.serviceRequired} display={lead.serviceRequired} onChange={(v)=>setF("serviceRequired",v)} />
                <EditField label="Shift type" editing={editing} value={form.preferredShift} display={lead.preferredShift ?? "-"} onChange={(v)=>setF("preferredShift",v)} />
                <EditField label="Shift hours" editing={editing} value={form.shiftHoursCount} display={lead.shiftHoursCount ? `${lead.shiftHoursCount}h` : "-"} icon={<Clock className="h-3 w-3" />} type="number" onChange={(v)=>setF("shiftHoursCount",v)} />
                <EditField label="Shift time" editing={editing} value={form.shiftTime} display={lead.shiftTime ?? "-"} onChange={(v)=>setF("shiftTime",v)} />
                <EditField label="Care start date" editing={editing} value={form.careStartDate} display={lead.careStartDate ? format(new Date(lead.careStartDate), "dd MMM yyyy") : "-"} icon={<CalendarDays className="h-3 w-3" />} type="date" onChange={(v)=>setF("careStartDate",v)} />
                <EditField label="Service days" editing={editing} value={form.serviceDays} display={lead.serviceDays ? `${lead.serviceDays} days` : "-"} type="number" onChange={(v)=>setF("serviceDays",v)} />
                <EditField label="Budget" editing={editing} value={form.budget} display={lead.budget ? `₹${lead.budget.toLocaleString()}` : "-"} icon={<IndianRupee className="h-3 w-3" />} type="number" onChange={(v)=>setF("budget",v)} />
              </Section>

              <Section icon={<MapPin className="h-4 w-4" />} title="Location">
                <EditField label="Area" editing={editing} value={form.area} display={lead.area ?? "-"} onChange={(v)=>setF("area",v)} />
                <EditField label="City" editing={editing} value={form.city} display={lead.city ?? "-"} onChange={(v)=>setF("city",v)} />
                <EditField label="Address" editing={editing} value={form.address} display={lead.address ?? "-"} full onChange={(v)=>setF("address",v)} />
              </Section>

              <div>
                <Label className="text-xs">Requirement notes</Label>
                <Textarea
                  defaultValue={lead.notes}
                  onBlur={(e) => api.updateLead(lead.id, { notes: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Call notes</Label>
                  <Textarea
                    defaultValue={lead.callNotes}
                    onBlur={(e) => api.updateLead(lead.id, { callNotes: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp notes</Label>
                  <Textarea
                    defaultValue={lead.whatsappNotes}
                    onBlur={(e) => api.updateLead(lead.id, { whatsappNotes: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="followups" className="space-y-3">
              <FollowupForm leadId={lead.id} />
              <div className="space-y-2">
                {followups
                  .sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt))
                  .map((f) => (
                    <div key={f.id} className="rounded-lg border bg-card p-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="h-3.5 w-3.5 text-primary" /> {f.type}
                        </div>
                        <div className="flex items-center gap-2">
                          {!f.completed && isOverdue(f.dueAt) && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                              Overdue
                            </span>
                          )}
                          {f.completed && (
                            <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                              Done
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(f.dueAt), "PPp")}
                      </div>
                      {f.note && <div className="mt-1 text-sm">{f.note}</div>}
                      {!f.completed && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => api.completeFollowup(f.id)}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark done
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              api.rescheduleFollowup(
                                f.id,
                                new Date(Date.now() + 86400000).toISOString(),
                              )
                            }
                          >
                            <AlarmClock className="mr-1 h-3.5 w-3.5" /> +1 day
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                {followups.length === 0 && (
                  <p className="text-sm text-muted-foreground">No follow-ups yet.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="quotations" className="space-y-3">
              <QuotationForm leadId={lead.id} />
              <div className="space-y-2">
                {quotations.map((q) => (
                  <div key={q.id} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{q.package}</div>
                      <div className="text-sm font-semibold text-primary">
                        ₹{q.finalPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {q.shiftHours} · Quoted ₹{q.quotedPrice.toLocaleString()} · Discount ₹
                      {q.discount.toLocaleString()} · {format(new Date(q.date), "PP")}
                    </div>
                    {q.notes && <div className="mt-1 text-sm">{q.notes}</div>}
                  </div>
                ))}
                {quotations.length === 0 && (
                  <p className="text-sm text-muted-foreground">No quotations yet.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="closure" className="space-y-3">
              {closure ? (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-success" />
                    <span className="font-semibold">Closed {closure.type}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    {closure.type === "Won" && (
                      <>
                        <Info label="Package" value={closure.finalPackage ?? "-"} />
                        <Info label="Final amount" value={`₹${(closure.finalAmount ?? 0).toLocaleString()}`} />
                        <Info label="Advance" value={`₹${(closure.advanceReceived ?? 0).toLocaleString()}`} />
                        <Info label="Payment" value={closure.paymentStatus ?? "-"} />
                      </>
                    )}
                    {closure.type === "Lost" && (
                      <>
                        <Info label="Reason" value={closure.lostReason ?? "-"} />
                        <Info label="Competitor" value={closure.competitorName ?? "-"} />
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <ClosureForm leadId={lead.id} />
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2">
              {activity.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-2 border-l-2 border-primary/30 pl-3 text-sm">
                  <div className="flex-1">
                    <div>{a.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.at), "PPp")}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({
  label,
  value,
  icon,
  full,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">{children}</div>
    </div>
  );
}

function FollowupForm({ leadId }: { leadId: string }) {
  const [type, setType] = React.useState<FollowupType>("Call back");
  const [date, setDate] = React.useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  );
  const [note, setNote] = React.useState("");
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto]">
      <Select value={type} onValueChange={(v) => setType(v as FollowupType)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {FOLLOWUP_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
        </SelectContent>
      </Select>
      <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      <Button
        onClick={() => {
          api.addFollowup({ leadId, type, dueAt: new Date(date).toISOString(), note });
          setNote("");
          toast.success("Follow-up added");
        }}
      >
        Add
      </Button>
      <Input
        className="sm:col-span-3"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  );
}

function QuotationForm({ leadId }: { leadId: string }) {
  const [pkg, setPkg] = React.useState("Standard 30 days");
  const [shift, setShift] = React.useState("12h");
  const [price, setPrice] = React.useState("45000");
  const [discount, setDiscount] = React.useState("0");
  const [notes, setNotes] = React.useState("");
  const final = Number(price || 0) - Number(discount || 0);
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
      <Input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="Package" />
      <Input value={shift} onChange={(e) => setShift(e.target.value)} placeholder="Shift hours" />
      <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Quoted price" />
      <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount" />
      <Input className="sm:col-span-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
      <div className="text-sm sm:col-span-2">
        Final: <span className="font-semibold text-primary">₹{final.toLocaleString()}</span>
      </div>
      <Button
        className="sm:col-span-2"
        onClick={() => {
          api.addQuotation({
            leadId,
            package: pkg,
            shiftHours: shift,
            quotedPrice: Number(price || 0),
            discount: Number(discount || 0),
            finalPrice: final,
            date: new Date().toISOString(),
            notes,
          });
          api.moveStage(leadId, "Negotiation");
          toast.success("Quotation saved");
        }}
      >
        Save quotation
      </Button>
    </div>
  );
}

function ClosureForm({ leadId }: { leadId: string }) {
  const [type, setType] = React.useState<"Won" | "Lost">("Won");
  const [pkg, setPkg] = React.useState("Premium 60 days");
  const [amount, setAmount] = React.useState("65000");
  const [advance, setAdvance] = React.useState("25000");
  const [status, setStatus] = React.useState<"Pending" | "Partial" | "Paid">("Partial");
  const [reason, setReason] = React.useState<LostReason>("Budget issue");
  const [comp, setComp] = React.useState("");
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
      <Select value={type} onValueChange={(v) => setType(v as "Won" | "Lost")}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Won">Closed Won</SelectItem>
          <SelectItem value="Lost">Closed Lost</SelectItem>
        </SelectContent>
      </Select>
      {type === "Won" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="Final package" />
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Final amount" />
          <Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="Advance received" />
          <Select value={status} onValueChange={(v) => setStatus(v as never)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["Pending","Partial","Paid"] as const).map((s)=>(<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={reason} onValueChange={(v) => setReason(v as LostReason)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOST_REASONS.map((r)=>(<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input value={comp} onChange={(e) => setComp(e.target.value)} placeholder="Competitor" />
        </div>
      )}
      <Button
        onClick={() => {
          api.closeLead({
            leadId,
            type,
            finalPackage: type === "Won" ? pkg : undefined,
            finalAmount: type === "Won" ? Number(amount) : undefined,
            advanceReceived: type === "Won" ? Number(advance) : undefined,
            paymentStatus: type === "Won" ? status : undefined,
            closureDate: new Date().toISOString(),
            lostReason: type === "Lost" ? reason : undefined,
            competitorName: type === "Lost" ? comp : undefined,
          });
          toast.success(`Lead marked as ${type}`);
        }}
      >
        Save closure
      </Button>
    </div>
  );
}