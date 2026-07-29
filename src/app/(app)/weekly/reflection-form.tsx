"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { WeeklyReflection } from "@/lib/types";
import { saveWeeklyReflection } from "./actions";

const FIELDS: { name: keyof WeeklyReflection; label: string; hint?: string }[] =
  [
    { name: "went_well", label: "What went well" },
    { name: "what_broke_down", label: "What broke down" },
    {
      name: "improvement_risk",
      label: "Improvement — risk",
      hint: "sizing, exposure, stops",
    },
    {
      name: "improvement_stress",
      label: "Improvement — stress",
      hint: "state management, routine",
    },
    {
      name: "improvement_attitude_discipline",
      label: "Improvement — attitude & discipline",
    },
    {
      name: "improvement_decision_process",
      label: "Improvement — decision process",
    },
    {
      name: "rules_to_adjust",
      label: "Rules to adjust",
      hint: "changes you are committing to next week",
    },
  ];

export function ReflectionForm({
  weekStart,
  reflection,
}: {
  weekStart: string;
  reflection: WeeklyReflection | null;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(reflection));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveWeeklyReflection(form);
      if (result.ok) {
        toast("Weekly reflection saved");
        setSaved(true);
      } else {
        setError(result.error);
        toast(result.error, "error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
      <input type="hidden" name="week_start_date" value={weekStart} />
      <h2 className="text-base font-semibold">Weekly reflection</h2>
      {FIELDS.map((f) => (
        <Field key={f.name} label={f.label} hint={f.hint}>
          <textarea
            name={f.name}
            rows={2}
            defaultValue={(reflection?.[f.name] as string) ?? ""}
            className={inputClass}
          />
        </Field>
      ))}
      {error ? (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-4">
        {saved ? (
          <span className="text-sm text-muted">Saved for this week</span>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : saved ? "Update reflection" : "Save reflection"}
        </Button>
      </div>
    </form>
  );
}
