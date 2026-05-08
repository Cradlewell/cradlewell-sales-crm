import * as React from "react";
import {
  LEAD_STAGES,
} from "./types";
import type {
  ActivityLog,
  Closure,
  Followup,
  Lead,
  Quotation,
} from "./types";

const KEY = "cradlewell-crm-v2";

interface DB {
  leads: Lead[];
  followups: Followup[];
  quotations: Quotation[];
  closures: Closure[];
  activity: ActivityLog[];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function leadCode(i: number) {
  return `CW-${String(1000 + i)}`;
}

function seed(): DB {
  const owners = ["Aarav", "Priya", "Neha"];
  const sources = ["Website", "Instagram", "Referral", "Google Ads", "Hospital Partner"] as const;
  const services = ["Newborn Care", "Postnatal Care", "Lactation Support", "Night Nanny"];
  const cities = ["Bangalore", "Hyderabad", "Mumbai", "Pune", "Chennai"];
  const stages = LEAD_STAGES;

  const now = Date.now();
  const leads: Lead[] = Array.from({ length: 14 }).map((_, i) => {
    const stage = stages[i % stages.length];
    const created = new Date(now - i * 86400000 * 0.7).toISOString();
    return {
      id: leadCode(i),
      name: [
        "Anita Sharma",
        "Rohit Verma",
        "Sneha Iyer",
        "Kavya Reddy",
        "Pooja Gupta",
        "Megha Nair",
        "Divya Singh",
        "Riya Mehta",
        "Sanya Kapoor",
        "Tara Joshi",
        "Isha Pillai",
        "Nidhi Rao",
        "Aditi Shah",
        "Maya Pandey",
      ][i],
      phone: `+91 9${(800000000 + i * 12345).toString().slice(0, 9)}`,
      whatsapp: `+91 9${(800000000 + i * 12345).toString().slice(0, 9)}`,
      source: sources[i % sources.length],
      leadDate: created,
      serviceRequired: services[i % services.length],
      babyStatus: i % 3 === 0 ? "Expecting" : "Born",
      hospitalName: ["Cloudnine", "Apollo Cradle", "Fortis La Femme", "Manipal"][i % 4],
      babyAgeOrMonth: i % 3 === 0 ? `Month ${(i % 9) + 1}` : `${(i % 10) + 1} weeks`,
      area: ["HSR Layout", "Whitefield", "Indiranagar", "Koramangala", "Banjara Hills"][i % 5],
      city: cities[i % cities.length],
      preferredShift: (["Day (12h)", "Night (12h)", "Full Day (24h)"] as const)[i % 3],
      budget: 25000 + (i % 5) * 5000,
      notes: "Prefers experienced caregiver, soft-spoken.",
      owner: owners[i % owners.length],
      stage,
      temperature: (["Cold", "Warm", "Hot"] as const)[i % 3],
      closureProbability: [10, 30, 50, 60, 70, 80, 90, 100, 0][i % 9],
      callNotes: "Initial call done. Customer interested.",
      whatsappNotes: "Sent intro brochure on WhatsApp.",
      lastActivityAt: created,
      createdAt: created,
    };
  });

  const followups: Followup[] = leads.slice(0, 8).map((l, i) => ({
    id: uid(),
    leadId: l.id,
    type: (["First call", "Call back", "Quotation reminder", "Payment reminder"] as const)[i % 4],
    dueAt: new Date(now + (i - 3) * 86400000 * 0.5).toISOString(),
    note: "Confirm package interest and shift requirement.",
    completed: false,
    createdAt: l.createdAt,
  }));

  const quotations: Quotation[] = leads
    .filter((l) =>
      ["Negotiation", "Closed Won"].includes(l.stage),
    )
    .map((l, i) => ({
      id: uid(),
      leadId: l.id,
      package: ["Standard 30 days", "Premium 60 days", "Trial 7 days"][i % 3],
      shiftHours: ["12h", "24h", "12h"][i % 3],
      quotedPrice: 45000 + i * 2000,
      discount: 2000 + i * 500,
      finalPrice: 43000 + i * 1500,
      date: l.createdAt,
      notes: "Includes hospital visits and night feeds.",
    }));

  const closures: Closure[] = leads
    .filter((l) => l.stage === "Closed Won" || l.stage === "Closed Lost")
    .map((l) => ({
      id: uid(),
      leadId: l.id,
      type: l.stage === "Closed Won" ? "Won" : "Lost",
      finalPackage: l.stage === "Closed Won" ? "Premium 60 days" : undefined,
      finalAmount: l.stage === "Closed Won" ? 65000 : undefined,
      advanceReceived: l.stage === "Closed Won" ? 25000 : undefined,
      paymentStatus: l.stage === "Closed Won" ? "Partial" : undefined,
      closureDate: new Date().toISOString(),
      salesOwner: l.owner,
      lostReason: l.stage === "Closed Lost" ? "Budget issue" : undefined,
    }));

  return { leads, followups, quotations, closures, activity: [] };
}

function load(): DB {
  if (typeof window === "undefined") {
    return { leads: [], followups: [], quotations: [], closures: [], activity: [] };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as DB;
  } catch {
    return seed();
  }
}

function save(db: DB) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(db));
}

type Listener = () => void;
const listeners = new Set<Listener>();
let _db: DB | null = null;

function getDB(): DB {
  if (!_db) _db = load();
  return _db;
}

function setDB(updater: (db: DB) => DB) {
  _db = updater(getDB());
  save(_db);
  listeners.forEach((l) => l());
}

export function useDB() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const fn = () => force();
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return getDB();
}

function logActivity(leadId: string, type: ActivityLog["type"], message: string) {
  setDB((db) => ({
    ...db,
    activity: [
      { id: uid(), leadId, type, message, at: new Date().toISOString() },
      ...db.activity,
    ],
    leads: db.leads.map((l) =>
      l.id === leadId ? { ...l, lastActivityAt: new Date().toISOString() } : l,
    ),
  }));
}

export const api = {
  resetSeed() {
    const s = seed();
    _db = s;
    save(s);
    listeners.forEach((l) => l());
  },
  addLead(lead: Omit<Lead, "id" | "createdAt" | "lastActivityAt" | "stage" | "temperature">) {
    const db = getDB();
    const idx = db.leads.length;
    const newLead: Lead = {
      ...lead,
      id: leadCode(idx),
      stage: "New Lead",
      temperature: "Warm",
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };
    setDB((db) => ({ ...db, leads: [newLead, ...db.leads] }));
    logActivity(newLead.id, "created", "Lead created");
    return newLead;
  },
  updateLead(id: string, patch: Partial<Lead>) {
    setDB((db) => ({
      ...db,
      leads: db.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  },
  deleteLead(id: string) {
    setDB((db) => ({
      ...db,
      leads: db.leads.filter((l) => l.id !== id),
      followups: db.followups.filter((f) => f.leadId !== id),
      quotations: db.quotations.filter((q) => q.leadId !== id),
      closures: db.closures.filter((c) => c.leadId !== id),
      activity: db.activity.filter((a) => a.leadId !== id),
    }));
  },
  moveStage(id: string, stage: Lead["stage"]) {
    const before = getDB().leads.find((l) => l.id === id);
    setDB((db) => ({
      ...db,
      leads: db.leads.map((l) =>
        l.id === id ? { ...l, stage, lastActivityAt: new Date().toISOString() } : l,
      ),
    }));
    if (before) logActivity(id, "stage", `Stage: ${before.stage} → ${stage}`);
    if (stage === "Negotiation") {
      api.addFollowup({
        leadId: id,
        type: "Quotation reminder",
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        note: "Auto: follow up on quotation shared yesterday.",
      });
    }
  },
  addFollowup(input: Omit<Followup, "id" | "completed" | "createdAt">) {
    const f: Followup = {
      ...input,
      id: uid(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setDB((db) => ({ ...db, followups: [f, ...db.followups] }));
    logActivity(input.leadId, "followup", `Follow-up scheduled (${input.type})`);
    return f;
  },
  completeFollowup(id: string) {
    const f = getDB().followups.find((x) => x.id === id);
    setDB((db) => ({
      ...db,
      followups: db.followups.map((x) =>
        x.id === id ? { ...x, completed: true, completedAt: new Date().toISOString() } : x,
      ),
    }));
    if (f) logActivity(f.leadId, "followup", `Follow-up completed (${f.type})`);
  },
  rescheduleFollowup(id: string, dueAt: string) {
    setDB((db) => ({
      ...db,
      followups: db.followups.map((x) => (x.id === id ? { ...x, dueAt } : x)),
    }));
  },
  addQuotation(q: Omit<Quotation, "id">) {
    const newQ: Quotation = { ...q, id: uid() };
    setDB((db) => ({ ...db, quotations: [newQ, ...db.quotations] }));
    logActivity(q.leadId, "quotation", `Quotation: ${q.package} @ ₹${q.finalPrice}`);
    return newQ;
  },
  closeLead(c: Omit<Closure, "id">) {
    const newC: Closure = { ...c, id: uid() };
    setDB((db) => ({ ...db, closures: [newC, ...db.closures] }));
    api.moveStage(c.leadId, c.type === "Won" ? "Closed Won" : "Closed Lost");
    logActivity(
      c.leadId,
      "closure",
      c.type === "Won" ? `Won — ₹${c.finalAmount ?? 0}` : `Lost — ${c.lostReason ?? ""}`,
    );
  },
  importLeads(rows: Lead[]) {
    setDB((db) => ({ ...db, leads: [...rows, ...db.leads] }));
  },
};

export function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

export function isToday(dt: string) {
  const d = new Date(dt);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function isStale(lead: Lead) {
  if (lead.stage === "Closed Won" || lead.stage === "Closed Lost") return false;
  return daysSince(lead.lastActivityAt) >= 3;
}

export function isUrgentNew(lead: Lead) {
  if (lead.stage !== "New Lead") return false;
  return Date.now() - new Date(lead.createdAt).getTime() > 15 * 60 * 1000;
}