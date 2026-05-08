import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useDB, api } from "@/lib/store";
import { LEAD_STAGES, type LeadStage } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { LeadDrawer } from "@/components/LeadDrawer";
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StickyNote } from "lucide-react";

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Cradlewell CRM" }] }),
  component: PipelinePage,
});

function PipelinePage() {
  const db = useDB();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">Drag leads between stages to update.</p>
        </div>
        <LeadFormDialog />
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-3">
          {LEAD_STAGES.map((stage) => {
            const items = db.leads.filter((l) => l.stage === stage);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) api.moveStage(dragId, stage as LeadStage);
                  setDragId(null);
                }}
                className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-muted/40 p-2"
              >
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage}</span>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((l) => (
                    <Card
                      key={l.id}
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onClick={() => setOpenId(l.id)}
                      className="cursor-pointer p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium leading-tight">{l.name}</div>
                        {l.notes && l.notes.trim() && (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary"
                                >
                                  <StickyNote className="h-3 w-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs whitespace-pre-wrap text-xs">
                                {l.notes}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {l.serviceRequired} · {l.city ?? "-"}
                      </div>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                      Drop leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}