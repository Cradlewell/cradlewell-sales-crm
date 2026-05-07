export type LeadStage =
  | "New Lead"
  | "Not Responding"
  | "Contacted"
  | "Nurse Required"
  | "Moba Required"
  | "Due date soon"
  | "Follow-up"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost"
  | "Invalid Lead";

export const LEAD_STAGES: LeadStage[] = [
  "New Lead",
  "Not Responding",
  "Contacted",
  "Nurse Required",
  "Moba Required",
  "Due date soon",
  "Follow-up",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
  "Invalid Lead",
];

export type LeadTemperature = "Cold" | "Warm" | "Hot";

export type LeadSource =
  | "Website"
  | "Instagram"
  | "Facebook"
  | "Google Ads"
  | "Referral"
  | "Walk-in"
  | "Hospital Partner"
  | "Other";

export type BabyStatus = "Born" | "Expecting";

export type Shift = "Day (12h)" | "Night (12h)" | "Full Day (24h)" | "Custom";

export type FollowupType =
  | "First call"
  | "Call back"
  | "Quotation reminder"
  | "Payment reminder"
  | "Trial decision"
  | "Closure follow-up";

export interface Followup {
  id: string;
  leadId: string;
  type: FollowupType;
  dueAt: string; // ISO
  note: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface Quotation {
  id: string;
  leadId: string;
  package: string;
  shiftHours: string;
  quotedPrice: number;
  discount: number;
  finalPrice: number;
  date: string;
  notes: string;
}

export type LostReason =
  | "Competitor selected"
  | "Budget issue"
  | "No response"
  | "Trust issue"
  | "Service not available"
  | "Other";

export interface Closure {
  id: string;
  leadId: string;
  type: "Won" | "Lost";
  finalPackage?: string;
  finalAmount?: number;
  advanceReceived?: number;
  paymentStatus?: "Pending" | "Partial" | "Paid";
  closureDate: string;
  salesOwner?: string;
  lostReason?: LostReason;
  competitorName?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  leadId: string;
  type: "stage" | "note" | "followup" | "quotation" | "closure" | "created";
  message: string;
  at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  source: LeadSource;
  leadDate: string; // ISO
  serviceRequired: string;
  babyStatus: BabyStatus;
  hospitalName?: string;
  babyAgeOrMonth?: string;
  area?: string;
  city?: string;
  preferredShift?: Shift;
  budget?: number;
  notes?: string;
  owner: string;
  stage: LeadStage;
  temperature: LeadTemperature;
  closureProbability?: number; // 0-100
  callNotes?: string;
  whatsappNotes?: string;
  lastActivityAt: string;
  createdAt: string;
}