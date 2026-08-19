"use client";

import { useRouter } from "next/navigation";
import { addDaysIso, weekRangeLabel, weekStartIso, todayIso } from "@/lib/dates";

export function WeekPicker({ weekStart }: { weekStart: string }) {
  const router = useRouter();
  const thisWeek = weekStartIso(todayIso());
  const isCurrent = weekStart === thisWeek;

  function go(week: string) {
    router.push(`/weekly?week=${week}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <button
        type="button"
        onClick={() => go(addDaysIso(weekStart, -7))}
        className="rounded-xl border border-border-subtle px-3 py-1.5 text-sm text-muted hover:text-foreground"
      >
        ← Previous
      </button>
      <span className="metric text-sm font-medium">
        {weekRangeLabel(weekStart)}
      </span>
      <button
        type="button"
        onClick={() => go(addDaysIso(weekStart, 7))}
        disabled={isCurrent}
        className="rounded-xl border border-border-subtle px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-40"
      >
        Next →
      </button>
      {!isCurrent ? (
        <button
          type="button"
          onClick={() => go(thisWeek)}
          className="text-sm text-accent hover:underline"
        >
          This week
        </button>
      ) : null}
    </div>
  );
}
