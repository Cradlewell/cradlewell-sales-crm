import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB, api, isUrgentNew, isStale } from "@/lib/store";
import { LEAD_STAGES, type LeadStage, type LeadTemperature } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageBadge, TempBadge } from "@/components/StageBadge";
import { LeadDrawer } from "@/components/LeadDrawer";
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { Download, Search, Upload, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Cradlewell CRM" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const db = useDB();
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState<string>("all");
  const [source, setSource] = React.useState<string>("all");
  const [owner, setOwner] = React.useState<string>("all");
  const [temp, setTemp] = React.useState<string>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const owners = Array.from(new Set(db.leads.map((l) => l.owner)));
  const sources = Array.from(new Set(db.leads.map((l) => l.source)));

  const rows = db.leads.filter((l) => {
    if (q && !`${l.name} ${l.phone} ${l.id}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (stage !== "all" && l.stage !== stage) return false;
    if (source !== "all" && l.source !== source) return false;
    if (owner !== "all" && l.owner !== owner) return false;
    if (temp !== "all" && l.temperature !== temp) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = [
      "id","name","phone","whatsapp","source","stage","temperature","owner",
      "serviceRequired","babyStatus","hospitalName","babyBirthStageStatus",
      "babyAge","babyAgeOrMonth","currentWeight","area","city","address",
      "preferredShift","shiftHoursCount","shiftTime","careStartDate","serviceDays",
      "budget","leadDate","createdAt",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((l) => headers.map((h) => JSON.stringify((l as never as Record<string, unknown>)[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cradlewell-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
        const rows = lines.slice(1).map((line) => {
          const cells = line.match(/("([^"]|"")*"|[^,]+)/g) ?? [];
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").replace(/(^"|"$)/g, "")));
          return obj;
        });
        const now = new Date().toISOString();
        const leads = rows.map((r, i) => ({
          id: r.id || `IMP-${Date.now()}-${i}`,
          name: r.name || "Unknown",
          phone: r.phone || "",
          whatsapp: r.whatsapp || r.phone || "",
          source: (r.source as never) || "Other",
          leadDate: r.createdAt || now,
          serviceRequired: r.serviceRequired || "Newborn Care",
          babyStatus: (r.babyStatus as never) || "Born",
          owner: r.owner || "Aarav",
          stage: (r.stage as never) || "New Lead",
          temperature: (r.temperature as never) || "Warm",
          createdAt: r.createdAt || now,
          lastActivityAt: now,
          closureProbability: 20,
        }));
        api.importLeads(leads as never);
        toast.success(`Imported ${leads.length} leads`);
      } catch {
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Search, filter, and manage all leads.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <label className="inline-flex">
            <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
            <Button variant="outline" asChild>
              <span><Upload className="mr-1 h-4 w-4" /> Import CSV</span>
            </Button>
          </label>
          <LeadFormDialog />
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search by name, phone, ID…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Filter value={stage} setValue={setStage} placeholder="Stage" options={["all", ...LEAD_STAGES]} />
          <Filter value={source} setValue={setSource} placeholder="Source" options={["all", ...sources]} />
          <Filter value={owner} setValue={setOwner} placeholder="Owner" options={["all", ...owners]} />
          <Filter value={temp} setValue={setTemp} placeholder="Temp" options={["all", "Hot", "Warm", "Cold"]} />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone number</th>
                <th className="px-3 py-2 hidden md:table-cell">Lead date</th>
                <th className="px-3 py-2 hidden md:table-cell">Lead time</th>
                <th className="px-3 py-2 hidden lg:table-cell">Lead day</th>
                <th className="px-3 py-2 hidden lg:table-cell">Service</th>
                <th className="px-3 py-2 hidden lg:table-cell">Born / Expecting</th>
                <th className="px-3 py-2 hidden lg:table-cell">Hospital</th>
                <th className="px-3 py-2 hidden xl:table-cell">Birth stage / status</th>
                <th className="px-3 py-2 hidden xl:table-cell">Baby age</th>
                <th className="px-3 py-2 hidden xl:table-cell">Current weight</th>
                <th className="px-3 py-2 hidden xl:table-cell">Address</th>
                <th className="px-3 py-2 hidden xl:table-cell">Shift type</th>
                <th className="px-3 py-2 hidden xl:table-cell">Shift hours</th>
                <th className="px-3 py-2 hidden xl:table-cell">Shift time</th>
                <th className="px-3 py-2 hidden xl:table-cell">Care start date</th>
                <th className="px-3 py-2 hidden xl:table-cell">Service days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const ld = new Date(l.leadDate ?? l.createdAt);
                return (
                  <tr
                    key={l.id}
                    onClick={() => setOpenId(l.id)}
                    className="cursor-pointer border-t hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.name}</div>
                      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span>{l.id}</span>
                        <StageBadge stage={l.stage as LeadStage} />
                        <TempBadge temp={l.temperature as LeadTemperature} />
                        {isUrgentNew(l) && (
                          <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" /> Urgent
                          </span>
                        )}
                        {isStale(l) && (
                          <span className="inline-flex items-center gap-1 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium">
                            <Clock className="h-3 w-3" /> Stale
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{l.phone}</td>
                    <td className="px-3 py-2 hidden md:table-cell whitespace-nowrap">{format(ld, "dd MMM yyyy")}</td>
                    <td className="px-3 py-2 hidden md:table-cell whitespace-nowrap">{format(ld, "p")}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{format(ld, "EEEE")}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{l.serviceRequired}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{l.babyStatus}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{l.hospitalName ?? "-"}</td>
                    <td className="px-3 py-2 hidden xl:table-cell">{l.babyBirthStageStatus ?? "-"}</td>
                    <td className="px-3 py-2 hidden xl:table-cell">{l.babyAge ?? l.babyAgeOrMonth ?? "-"}</td>
                    <td className="px-3 py-2 hidden xl:table-cell">{l.currentWeight ?? "-"}</td>
                    <td className="px-3 py-2 hidden xl:table-cell max-w-[220px] truncate">
                      {l.address ?? [l.area, l.city].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-3 py-2 hidden xl:table-cell">{l.preferredShift ?? "-"}</td>
                    <td className="px-3 py-2 hidden xl:table-cell">{l.shiftHoursCount ? `${l.shiftHoursCount}h` : "-"}</td>
                    <td className="px-3 py-2 hidden xl:table-cell whitespace-nowrap">{l.shiftTime ?? "-"}</td>
                    <td className="px-3 py-2 hidden xl:table-cell whitespace-nowrap">
                      {l.careStartDate ? format(new Date(l.careStartDate), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="px-3 py-2 hidden xl:table-cell">{l.serviceDays ?? "-"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={17} className="px-3 py-8 text-center text-sm text-muted-foreground">No leads match the filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Filter({
  value,
  setValue,
  placeholder,
  options,
}: {
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-[150px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o === "all" ? `All ${placeholder.toLowerCase()}` : o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}