import { cn } from "@/lib/utils";
import type { LeadStage, LeadTemperature } from "@/lib/types";

const stageStyles: Record<LeadStage, string> = {
  "New Lead": "bg-primary/10 text-primary",
  Contacted: "bg-accent text-accent-foreground",
  "Requirement Understood": "bg-accent text-accent-foreground",
  "Quotation Shared": "bg-secondary/15 text-secondary",
  "Follow-up Scheduled": "bg-warning/15 text-warning-foreground",
  Negotiation: "bg-warning/20 text-warning-foreground",
  "Payment Pending": "bg-destructive/10 text-destructive",
  "Closed Won": "bg-success/15 text-success",
  "Closed Lost": "bg-muted text-muted-foreground",
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        stageStyles[stage],
      )}
    >
      {stage}
    </span>
  );
}

export function TempBadge({ temp }: { temp: LeadTemperature }) {
  const map: Record<LeadTemperature, string> = {
    Hot: "bg-hot/15 text-hot",
    Warm: "bg-warm/20 text-foreground",
    Cold: "bg-cold/20 text-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        map[temp],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {temp}
    </span>
  );
}