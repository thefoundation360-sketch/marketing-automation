"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Lead, PipelineStage } from "@/lib/types/database";
import { PIPELINE_STAGES, INTEREST_TAGS } from "@/lib/constants";
import { daysSince, formatDate } from "@/lib/format";
import { updateLeadStage } from "@/app/actions";

export default function PipelineBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);
  const [, startTransition] = useTransition();

  function moveLead(leadId: string, stage: PipelineStage) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId && l.pipeline_stage !== stage
          ? { ...l, pipeline_stage: stage, stage_changed_at: new Date().toISOString() }
          : l
      )
    );
    startTransition(() => {
      updateLeadStage(leadId, stage);
    });
  }

  function onDrop(stage: PipelineStage) {
    if (draggingId) moveLead(draggingId, stage);
    setDraggingId(null);
    setOverStage(null);
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3" style={{ minWidth: "min-content" }}>
        {PIPELINE_STAGES.map((stage) => {
          const columnLeads = leads.filter(
            (l) => l.pipeline_stage === stage.key
          );
          const isOver = overStage === stage.key;
          return (
            <div
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.key);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
              onDrop={() => onDrop(stage.key)}
              className={`flex w-64 shrink-0 flex-col rounded-xl border bg-mecca-panel/60 transition ${
                isOver
                  ? "border-mecca-gold/60 bg-mecca-gold/5"
                  : "border-mecca-border"
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-mecca-mist">
                  {stage.label}
                </span>
                <span className="rounded-full bg-mecca-card px-2 py-0.5 text-[11px] text-mecca-muted">
                  {columnLeads.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-3">
                {columnLeads.map((lead) => {
                  const tag = lead.interest_tag
                    ? INTEREST_TAGS[lead.interest_tag]
                    : null;
                  return (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      draggable
                      onDragStart={() => setDraggingId(lead.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverStage(null);
                      }}
                      className={`block cursor-grab rounded-lg border border-mecca-border bg-mecca-card p-3 transition hover:border-mecca-gold/40 active:cursor-grabbing ${
                        draggingId === lead.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-mecca-mist">
                          {lead.name}
                        </span>
                        {tag && (
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tag.className}`}
                          >
                            {tag.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-mecca-muted">
                        <span>{daysSince(lead.stage_changed_at)}d in stage</span>
                        <span>Last: {formatDate(lead.last_contact_at)}</span>
                      </div>
                    </Link>
                  );
                })}
                {columnLeads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-mecca-border px-2 py-6 text-center text-[11px] text-mecca-muted">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
