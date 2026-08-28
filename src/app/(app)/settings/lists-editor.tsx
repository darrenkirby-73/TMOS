"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { Tag, TagCategory } from "@/lib/types";
import {
  countTradesUsing,
  createTag,
  deleteTag,
  renameTag,
  type ActionResult,
} from "./actions";

export type ListDefinition = {
  category: TagCategory;
  title: string;
  blurb: string;
  /** Where this vocabulary is offered, so it's clear what editing changes. */
  usedIn: string;
};

/**
 * The seeded contents of these lists are starting points, not authoritative —
 * the migration says so, and until now the only way to act on that was SQL.
 */
export const LISTS: ListDefinition[] = [
  {
    category: "setup",
    title: "Setups",
    blurb: "The patterns you trade.",
    usedIn: "Offered on the trade form and used to group Reports.",
  },
  {
    category: "system",
    title: "Systems",
    blurb: "Names of your trading systems.",
    usedIn: "Offered on the trade form. Define their rules under Systems.",
  },
  {
    category: "winning_attitude",
    title: "Winning attitudes",
    blurb: "States worth deliberately applying.",
    usedIn: "Morning focus, evening debrief, and per-trade tagging.",
  },
  {
    category: "losing_attitude",
    title: "Losing attitudes",
    blurb: "States worth watching for.",
    usedIn: "Morning watch-list, evening debrief, and per-trade tagging.",
  },
  {
    category: "lapse_type",
    title: "Discipline lapses",
    blurb: "Ways your process breaks down.",
    usedIn: "Trade form and the weekly discipline breakdown.",
  },
];

function ListSection({
  definition,
  tags,
}: {
  definition: ListDefinition;
  tags: Tag[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<Tag | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [applyToTrades, setApplyToTrades] = useState(false);
  const [removing, setRemoving] = useState<Tag | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);

  function report(result: ActionResult) {
    toast(result.ok ? result.message : result.error, result.ok ? "success" : "error");
    return result.ok;
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const label = adding;
    startTransition(async () => {
      if (report(await createTag(definition.category, label))) setAdding("");
    });
  }

  function openEdit(tag: Tag) {
    setEditing(tag);
    setEditLabel(tag.label);
    setApplyToTrades(false);
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const tag = editing;
    startTransition(async () => {
      const result = await renameTag(
        tag.id,
        definition.category,
        tag.label,
        editLabel,
        applyToTrades,
      );
      if (report(result)) setEditing(null);
    });
  }

  function openRemove(tag: Tag) {
    setRemoving(tag);
    setUsageCount(null);
    startTransition(async () => {
      setUsageCount(await countTradesUsing(definition.category, tag.label));
    });
  }

  function confirmRemove() {
    if (!removing) return;
    const tag = removing;
    startTransition(async () => {
      if (report(await deleteTag(tag.id))) setRemoving(null);
    });
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold">{definition.title}</h2>
      <p className="mt-0.5 text-sm text-muted">{definition.blurb}</p>
      <p className="mt-0.5 text-xs text-faint">{definition.usedIn}</p>

      {tags.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nothing in this list yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border-subtle">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="text-sm">{tag.label}</span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(tag)}
                  className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => openRemove(tag)}
                  className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-negative"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder={`Add to ${definition.title.toLowerCase()}`}
          aria-label={`Add to ${definition.title}`}
          className={inputClass}
        />
        <Button type="submit" variant="ghost" disabled={pending || adding.trim() === ""}>
          Add
        </Button>
      </form>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Rename in ${definition.title.toLowerCase()}`}
      >
        <form onSubmit={saveEdit} className="flex flex-col gap-4">
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            aria-label="New label"
            className={inputClass}
            autoFocus
          />
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={applyToTrades}
              onChange={(e) => setApplyToTrades(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              Also update trades already tagged{" "}
              <span className="font-medium">{editing?.label}</span>
              <span className="mt-0.5 block text-xs text-muted">
                Off by default — this rewrites logged trades. Leave it off and
                past trades keep their original wording.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove from list"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Remove <span className="font-medium">{removing?.label}</span> from{" "}
            {definition.title.toLowerCase()}? It stops being offered as a
            suggestion.
          </p>
          <p className="text-sm text-muted">
            {usageCount === null
              ? "Checking how many trades use it…"
              : usageCount === 0
                ? "No trades use it."
                : `${usageCount} ${usageCount === 1 ? "trade uses" : "trades use"} it. Those trades keep their wording — removing a suggestion never rewrites history.`}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmRemove}
              disabled={pending}
            >
              Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

export function ListsEditor({ tags }: { tags: Tag[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {LISTS.map((definition) => (
        <ListSection
          key={definition.category}
          definition={definition}
          tags={tags.filter((t) => t.category === definition.category)}
        />
      ))}
    </div>
  );
}
