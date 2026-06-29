"use client";

import { useState, useTransition } from "react";
import { SEQUENCE_TYPES } from "@/lib/constants";
import { triggerSequence } from "@/app/actions";

export default function TriggerSequencePanel({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function run(key: string) {
    setRunningKey(key);
    setDone(null);
    startTransition(async () => {
      await triggerSequence(leadId, key);
      setRunningKey(null);
      setDone(key);
    });
  }

  return (
    <div className="space-y-2">
      {SEQUENCE_TYPES.map((seq) => (
        <div
          key={seq.key}
          className="flex items-center gap-3 rounded-lg border border-mecca-border bg-mecca-panel px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-mecca-mist">
              {seq.label}
            </div>
            <div className="truncate text-xs text-mecca-muted">
              {seq.description}
            </div>
          </div>
          {done === seq.key ? (
            <span className="shrink-0 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
              Triggered ✓
            </span>
          ) : (
            <button
              onClick={() => run(seq.key)}
              disabled={pending}
              className="shrink-0 rounded-md bg-mecca-gold px-3 py-1.5 text-xs font-semibold text-mecca-black transition hover:bg-mecca-goldsoft disabled:opacity-50"
            >
              {runningKey === seq.key ? "Running…" : "Run"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
