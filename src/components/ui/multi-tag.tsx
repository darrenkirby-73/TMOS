"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/form";

/**
 * Multi-value tag picker. Selected values are submitted as repeated form
 * entries under `name`. Options come from the user's tags plus anything
 * already selected, and free text can be added.
 */
export function MultiTagField({
  label,
  name,
  options,
  selected,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  hint?: string;
}) {
  const [custom, setCustom] = useState("");
  const all = [...new Set([...options, ...selected])];

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  function addCustom() {
    const value = custom.trim();
    if (value === "" || selected.includes(value)) {
      setCustom("");
      return;
    }
    onChange([...selected, value]);
    setCustom("");
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium">
        {label}
        {hint ? <span className="ml-2 font-normal text-faint">{hint}</span> : null}
      </span>
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {all.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {all.map((value) => {
            const isSelected = selected.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(value)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  isSelected
                    ? "bg-accent-soft font-medium text-accent"
                    : "border border-border-subtle text-muted hover:text-foreground"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add another…"
          aria-label={`Add ${label}`}
          className={`${inputClass} max-w-xs`}
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 text-sm text-accent hover:underline"
        >
          Add
        </button>
      </div>
    </div>
  );
}
