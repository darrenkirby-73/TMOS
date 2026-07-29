"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Field, ScaleField, inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { WorkflowDefinition } from "@/lib/prompts";
import type { InputField } from "@/lib/prompts/workflows/types";
import type { CoachWorkflow } from "@/lib/types";
import { runCoachWorkflow } from "./actions";

function initialValues(def: WorkflowDefinition): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of def.inputs) {
    if (field.type === "scale") values[field.name] = 3;
    else if (field.type === "boolean") values[field.name] = false;
    else if (field.type === "select") values[field.name] = field.options?.[0] ?? "";
    else values[field.name] = "";
  }
  return values;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: InputField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "scale") {
    return (
      <ScaleField
        label={field.label}
        name={field.name}
        value={Number(value)}
        onChange={onChange}
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="font-medium">{field.label}</span>
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <Field label={field.label} hint={field.hint}>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "textarea") {
    return (
      <Field label={field.label} hint={field.hint} className="sm:col-span-2">
        <textarea
          rows={2}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </Field>
    );
  }
  return (
    <Field label={field.label} hint={field.hint}>
      <input
        type={field.type === "number" ? "number" : "text"}
        step={field.type === "number" ? "any" : undefined}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </Field>
  );
}

export function CoachView({
  workflows,
  configured,
}: {
  workflows: WorkflowDefinition[];
  configured: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<CoachWorkflow>(workflows[0].id);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(workflows[0]),
  );
  const [response, setResponse] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = workflows.find((w) => w.id === active)!;

  function selectWorkflow(id: CoachWorkflow) {
    const next = workflows.find((w) => w.id === id)!;
    setActive(id);
    setValues(initialValues(next));
    setResponse(null);
    setModel(null);
    setError(null);
  }

  function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const missing = def.inputs.filter(
      (f) => f.required && (values[f.name] === "" || values[f.name] === undefined),
    );
    if (missing.length > 0) {
      const message = `Fill in: ${missing.map((f) => f.label).join(", ")}`;
      setError(message);
      toast(message, "error");
      return;
    }
    startTransition(async () => {
      const result = await runCoachWorkflow(active, values);
      if (result.ok) {
        setResponse(result.response);
        setModel(result.model);
        toast("Coaching session saved");
      } else {
        setError(result.error);
        toast(result.error, "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {workflows.map((w) => (
          <button
            key={w.id}
            type="button"
            aria-pressed={active === w.id}
            onClick={() => selectWorkflow(w.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              active === w.id
                ? "bg-accent-soft font-medium text-accent"
                : "border border-border-subtle text-muted hover:text-foreground"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {!configured ? (
        <div className="card p-5 text-sm">
          <p className="font-medium">Mock mode</p>
          <p className="mt-1 text-muted">
            No <code>ANTHROPIC_API_KEY</code> is configured, so the coach
            composes your prompt and assembles your data but returns a mock
            response instead of calling a model. Sessions are still logged.
          </p>
        </div>
      ) : null}

      <form onSubmit={run} className="card flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-base font-semibold">{def.label}</h2>
          <p className="mt-0.5 text-sm text-muted">{def.blurb}</p>
        </div>

        {def.inputs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {def.inputs.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name]}
                onChange={(v) => setValues((s) => ({ ...s, [field.name]: v }))}
              />
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-negative" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-faint">
            Your stored records for this workflow are sent with the request.
            Missing data is marked as missing, never guessed.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Coaching…" : "Run"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="card p-6 text-sm text-muted">
          Assembling your data and composing the prompt…
        </div>
      ) : null}

      {response && !pending ? (
        <section className="card p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Response</h2>
            <span className="text-xs text-faint">
              {model === "mock" ? "mock mode" : model}
            </span>
          </div>
          <Markdown text={response} />
        </section>
      ) : null}

      <p className="text-sm text-muted">
        <Link href="/coach/history" className="text-accent hover:underline">
          View past coaching sessions →
        </Link>
      </p>
    </div>
  );
}
