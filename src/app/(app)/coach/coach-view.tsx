"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ScaleField, inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { modelLabel, PASTE_MODEL } from "@/lib/coach-models";
import type { WorkflowDefinition } from "@/lib/prompts";
import type { InputField } from "@/lib/prompts/workflows/types";
import type { CoachWorkflow } from "@/lib/types";
import {
  composeCoachPrompt,
  runCoachWorkflow,
  savePastedResponse,
} from "./actions";

/**
 * How a coaching run gets its response.
 *  api   — calls Claude directly; needs ANTHROPIC_API_KEY, costs per run.
 *  paste — composes the prompt for you to run in a Claude chat and paste
 *          back; real coaching, no API account, no cost.
 *  mock  — composes and logs but consults no model; proves the plumbing.
 */
type Mode = "api" | "paste" | "mock";

const MODE_LABELS: Record<Mode, string> = {
  api: "Direct API",
  paste: "Paste-through",
  mock: "Mock",
};

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
  const modes: Mode[] = configured ? ["api", "paste"] : ["paste", "mock"];
  const [mode, setMode] = useState<Mode>(modes[0]);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(workflows[0]),
  );
  const [prompt, setPrompt] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = workflows.find((w) => w.id === active)!;

  function clearRun() {
    setPrompt(null);
    setPasted("");
    setResponse(null);
    setModel(null);
    setError(null);
  }

  function selectWorkflow(id: CoachWorkflow) {
    const next = workflows.find((w) => w.id === id)!;
    setActive(id);
    setValues(initialValues(next));
    clearRun();
  }

  function selectMode(next: Mode) {
    setMode(next);
    clearRun();
  }

  /** Returns true when every required input has a value. */
  function inputsComplete(): boolean {
    const missing = def.inputs.filter(
      (f) => f.required && (values[f.name] === "" || values[f.name] === undefined),
    );
    if (missing.length === 0) return true;
    const message = `Fill in: ${missing.map((f) => f.label).join(", ")}`;
    setError(message);
    toast(message, "error");
    return false;
  }

  function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!inputsComplete()) return;

    if (mode === "paste") {
      startTransition(async () => {
        const result = await composeCoachPrompt(active, values);
        if (result.ok) {
          setPrompt(result.prompt);
          setResponse(null);
          setModel(null);
        } else {
          setError(result.error);
          toast(result.error, "error");
        }
      });
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

  function savePasted() {
    setError(null);
    if (pasted.trim() === "") {
      const message = "Paste the response before saving";
      setError(message);
      toast(message, "error");
      return;
    }
    startTransition(async () => {
      const result = await savePastedResponse(active, values, prompt ?? "", pasted);
      if (result.ok) {
        setResponse(pasted.trim());
        setModel(PASTE_MODEL);
        setPrompt(null);
        setPasted("");
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

      <div className="card flex flex-col gap-3 p-5 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">How to answer</span>
          <div className="flex flex-wrap gap-2">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => selectMode(m)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  mode === m
                    ? "bg-accent-soft font-medium text-accent"
                    : "border border-border-subtle text-muted hover:text-foreground"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        <p className="text-muted">
          {mode === "api" ? (
            <>
              Calls Claude directly with your composed prompt. Billed to the
              configured <code>ANTHROPIC_API_KEY</code>.
            </>
          ) : mode === "paste" ? (
            <>
              Composes the same prompt and hands it to you to run in a Claude
              chat, then stores the response you paste back. Real coaching, no
              API account, no per-run cost.
            </>
          ) : (
            <>
              Assembles your data and composes the prompt but consults no
              model, returning an obviously-labelled placeholder. Use it to
              check the plumbing, not the coaching.
            </>
          )}
          {!configured && mode !== "mock" ? (
            <>
              {" "}
              No <code>ANTHROPIC_API_KEY</code> is configured, so Direct API
              isn&apos;t available.
            </>
          ) : null}
        </p>
      </div>

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

        {error && !prompt ? (
          <p className="text-sm text-negative" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-faint">
            {mode === "paste"
              ? "Your stored records for this workflow are built into the prompt. Missing data is marked as missing, never guessed."
              : "Your stored records for this workflow are sent with the request. Missing data is marked as missing, never guessed."}
          </p>
          <Button type="submit" disabled={pending}>
            {pending
              ? mode === "paste"
                ? "Composing…"
                : "Coaching…"
              : mode === "paste"
                ? "Compose prompt"
                : "Run"}
          </Button>
        </div>
      </form>

      {pending && !prompt ? (
        <div className="card p-6 text-sm text-muted">
          Assembling your data and composing the prompt…
        </div>
      ) : null}

      {prompt ? (
        <section className="card flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Your prompt</h2>
            <p className="mt-0.5 text-sm text-muted">
              Copy this into a new{" "}
              <a
                href="https://claude.ai/new"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Claude chat
              </a>
              , send it, then paste the reply back below. Copy the whole thing
              — the constraints that stop the coach recommending trades are in
              the opening section.
            </p>
          </div>

          <CopyButton text={prompt} />

          <pre className="max-h-72 overflow-auto rounded-xl border border-border-subtle bg-background p-4 text-xs whitespace-pre-wrap">
            {prompt}
          </pre>

          <Field label="Claude's response" hint="Paste the whole reply.">
            <textarea
              rows={8}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              className={inputClass}
            />
          </Field>

          {error ? (
            <p className="text-sm text-negative" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={clearRun}
              className="text-sm text-muted hover:text-foreground"
            >
              Discard
            </button>
            <Button type="button" onClick={savePasted} disabled={pending}>
              {pending ? "Saving…" : "Save response"}
            </Button>
          </div>
        </section>
      ) : null}

      {response && !pending ? (
        <section className="card p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Response</h2>
            <span className="text-xs text-faint">
              {model ? modelLabel(model) : null}
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
