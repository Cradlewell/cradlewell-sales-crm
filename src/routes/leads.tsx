import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB, api, isUrgentNew, isStale } from "@/lib/store";
import { LEAD_STAGES, type Lead, type LeadStage, type LeadSource, type BabyStatus, type LeadTemperature } from "@/lib/types";
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
import { StageBadge } from "@/components/StageBadge";
import { LeadDrawer } from "@/components/LeadDrawer";
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { Download, Search, Upload, AlertTriangle, Clock, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Cradlewell CRM" }] }),
  component: LeadsPage,
});

type ColKey =
  | "name" | "phone" | "leadDate" | "leadTime" | "leadDay" | "service"
  | "bornExpecting" | "hospital" | "birthStage" | "babyAge" | "currentWeight"
  | "address" | "shiftType" | "shiftHours" | "shiftTime" | "careStart" | "serviceDays";

type ColDef = {
  key: ColKey;
  label: string;
  width: number;
  render: (l: Lead) => React.ReactNode;
};

const DEFAULT_COLS: ColDef[] = [
  { key: "name", label: "Name", width: 240, render: (l) => (
    <>
      <div className="font-medium">{l.name}</div>
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <StageBadge stage={l.stage as LeadStage} />
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
    </>
  )},
  { key: "phone", label: "Phone number", width: 160, render: (l) => l.phone },
  { key: "leadDate", label: "Lead date", width: 130, render: (l) => format(new Date(l.leadDate ?? l.createdAt), "dd MMM yyyy") },
  { key: "leadTime", label: "Lead time", width: 110, render: (l) => format(new Date(l.leadDate ?? l.createdAt), "p") },
  { key: "leadDay", label: "Lead day", width: 110, render: (l) => format(new Date(l.leadDate ?? l.createdAt), "EEEE") },
  { key: "service", label: "Service", width: 140, render: (l) => l.serviceRequired },
  { key: "bornExpecting", label: "Born / Expecting", width: 140, render: (l) => l.babyStatus },
  { key: "hospital", label: "Hospital", width: 160, render: (l) => l.hospitalName ?? "-" },
  { key: "birthStage", label: "Birth stage / status", width: 170, render: (l) => l.babyBirthStageStatus ?? "-" },
  { key: "babyAge", label: "Baby age", width: 110, render: (l) => l.babyAge ?? l.babyAgeOrMonth ?? "-" },
  { key: "currentWeight", label: "Current weight", width: 130, render: (l) => l.currentWeight ?? "-" },
  { key: "address", label: "Address", width: 220, render: (l) => l.address || [l.area, l.city].filter(Boolean).join(", ") || "-" },
  { key: "shiftType", label: "Shift type", width: 130, render: (l) => l.preferredShift ?? "-" },
  { key: "shiftHours", label: "Shift hours", width: 110, render: (l) => l.shiftHoursCount ? `${l.shiftHoursCount}h` : "-" },
  { key: "shiftTime", label: "Shift time", width: 130, render: (l) => l.shiftTime ?? "-" },
  { key: "careStart", label: "Care start date", width: 140, render: (l) => l.careStartDate ? format(new Date(l.careStartDate), "dd MMM yyyy") : "-" },
  { key: "serviceDays", label: "Service days", width: 120, render: (l) => l.serviceDays ?? "-" },
];

const COL_PREFS_KEY = "cradlewell-leads-cols-v1";

function loadColPrefs(): { order: ColKey[]; widths: Partial<Record<ColKey, number>> } {
  if (typeof window === "undefined") return { order: DEFAULT_COLS.map((c) => c.key), widths: {} };
  try {
    const raw = localStorage.getItem(COL_PREFS_KEY);
    if (!raw) return { order: DEFAULT_COLS.map((c) => c.key), widths: {} };
    const p = JSON.parse(raw);
    const valid = new Set(DEFAULT_COLS.map((c) => c.key));
    const order = (p.order as ColKey[]).filter((k) => valid.has(k));
    DEFAULT_COLS.forEach((c) => { if (!order.includes(c.key)) order.push(c.key); });
    // Always keep "name" first (frozen)
    const filtered = order.filter((k) => k !== "name");
    return { order: ["name", ...filtered], widths: p.widths ?? {} };
  } catch {
    return { order: DEFAULT_COLS.map((c) => c.key), widths: {} };
  }
}

function LeadsPage() {
  const db = useDB();
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState<string>("all");
  const [source, setSource] = React.useState<string>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const [{ order, widths }, setPrefs] = React.useState(() => loadColPrefs());
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COL_PREFS_KEY, JSON.stringify({ order, widths }));
    }
  }, [order, widths]);

  const colMap = React.useMemo(() => {
    const m = new Map<ColKey, ColDef>();
    DEFAULT_COLS.forEach((c) => m.set(c.key, c));
    return m;
  }, []);
  const cols = order.map((k) => {
    const c = colMap.get(k)!;
    return { ...c, width: widths[k] ?? c.width };
  });

  const dragKey = React.useRef<ColKey | null>(null);
  const onDragStart = (k: ColKey) => { dragKey.current = k; };
  const onDrop = (target: ColKey) => {
    const src = dragKey.current;
    dragKey.current = null;
    if (!src || src === target || src === "name" || target === "name") return;
    setPrefs((p) => {
      const next = p.order.filter((k) => k !== src);
      const idx = next.indexOf(target);
      next.splice(idx, 0, src);
      return { ...p, order: next };
    });
  };

  const startResize = (k: ColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widths[k] ?? colMap.get(k)!.width;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(70, startW + (ev.clientX - startX));
      setPrefs((p) => ({ ...p, widths: { ...p.widths, [k]: w } }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const resetCols = () => setPrefs({ order: DEFAULT_COLS.map((c) => c.key), widths: {} });

  const sources = Array.from(new Set(db.leads.map((l) => l.source)));

  const rows = db.leads.filter((l) => {
    if (q && !`${l.name} ${l.phone} ${l.id}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (stage !== "all" && l.stage !== stage) return false;
    if (source !== "all" && l.source !== source) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = [
      "id","name","phone","whatsapp","source","stage",
      "serviceRequired","babyStatus","hospitalName","babyBirthStageStatus",
      "babyAge","babyAgeOrMonth","currentWeight","area","city","address",
      "preferredShift","shiftHoursCount","shiftTime","careStartDate","serviceDays",
      "budget","leadDate","createdAt",
    ];
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...rows.map((l) => headers.map((h) => escape((l as Record<string, unknown>)[h])).join(",")),
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
          source: (r.source as LeadSource) || "Other",
          leadDate: r.createdAt || now,
          serviceRequired: r.serviceRequired || "Newborn Care",
          babyStatus: (r.babyStatus as BabyStatus) || "Born",
          owner: r.owner || "Aarav",
          stage: (r.stage as LeadStage) || "New Lead",
          temperature: (r.temperature as LeadTemperature) || "Warm",
          createdAt: r.createdAt || now,
          lastActivityAt: now,
          closureProbability: 20,
        }));
        api.importLeads(leads);
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
          <Button variant="ghost" onClick={resetCols}>Reset columns</Button>
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
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[68vh] overflow-auto">
          <table className="text-sm border-separate border-spacing-0" style={{ width: cols.reduce((a, c) => a + c.width, 0) }}>
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {cols.map((c) => {
                  const isName = c.key === "name";
                  return (
                    <th
                      key={c.key}
                      style={{ width: c.width, minWidth: c.width, ...(isName ? { left: 0, position: "sticky", zIndex: 30 } : {}) }}
                      className={`group relative px-3 py-2 bg-muted/60 border-b ${isName ? "border-r" : ""} sticky top-0`}
                      draggable={!isName}
                      onDragStart={() => onDragStart(c.key)}
                      onDragOver={(e) => { if (!isName) e.preventDefault(); }}
                      onDrop={() => onDrop(c.key)}
                    >
                      <div className="flex items-center gap-1">
                        {!isName && <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground/60" />}
                        <span className="truncate">{c.label}</span>
                      </div>
                      <span
                        onMouseDown={(e) => startResize(c.key, e)}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-primary/40"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setOpenId(l.id)}
                  className="group cursor-pointer hover:bg-muted/30"
                >
                  {cols.map((c) => {
                    const isName = c.key === "name";
                    return (
                      <td
                        key={c.key}
                        style={{ width: c.width, minWidth: c.width, ...(isName ? { left: 0, position: "sticky", zIndex: 10 } : {}) }}
                        className={`px-3 py-2 align-top border-b bg-background group-hover:bg-muted/30 ${isName ? "border-r" : "whitespace-nowrap"}`}
                      >
                        <div className={isName ? "" : "truncate"}>{c.render(l)}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-sm text-muted-foreground">No leads match the filters.</td></tr>
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