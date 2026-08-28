import { describe, expect, it } from "vitest";
import {
  compareLatest,
  disciplineByPeriod,
  groupTrendByPeriod,
  measurableTrades,
  monthsAgoIso,
  nextPeriodKey,
  periodKey,
  periodRange,
  trendByPeriod,
} from "./trends";
import type { DayRecord, Trade } from "./types";

function trade(over: Partial<Trade>): Trade {
  return {
    id: crypto.randomUUID(),
    user_id: "u",
    day_record_id: null,
    date: "2026-07-01",
    ticker: "AAA",
    direction: "long",
    setup: null,
    system: null,
    entry_price: 100,
    stop_price: 98,
    exit_price: 104,
    quantity: 50,
    risk_amount_gbp: 100,
    r_result: 1,
    is_complex_trade: false,
    position_size: null,
    trade_type: "live_full",
    status: "closed",
    plan_compliant: true,
    mistake: false,
    discipline_lapse: false,
    lapse_type: null,
    losing_attitude_present: false,
    attitude_tag: null,
    winning_attitude_applied: null,
    decision_quality: null,
    stress_before_trade: null,
    stress_after_trade: null,
    screenshot_url: null,
    notes: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function day(over: Partial<DayRecord>): DayRecord {
  return {
    id: crypto.randomUUID(),
    user_id: "u",
    date: "2026-07-01",
    traded: true,
    planned_risk_per_trade: null,
    max_daily_risk: null,
    max_trades_planned: null,
    stress_before: null,
    energy_before: null,
    conditions_acceptable: null,
    winning_attitude_focus: null,
    losing_attitude_watch: null,
    discipline_checklist: null,
    decision_sequence: null,
    decision_commitment: null,
    morning_completed_at: null,
    stress_after: null,
    stress_trend: null,
    num_trades: 0,
    total_r_today: null,
    plan_compliant_trades: 0,
    mistakes_count: 0,
    discipline_lapses_count: 0,
    top_lapse_type: null,
    losing_attitudes_observed: null,
    winning_attitudes_applied: null,
    decision_quality: null,
    worst_decision_note: null,
    best_catch_note: null,
    tomorrow_adjustment: null,
    evening_completed_at: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("period keys", () => {
  it("buckets weeks to the Monday and months to YYYY-MM", () => {
    expect(periodKey("2026-07-29", "week")).toBe("2026-07-27"); // Wed -> Mon
    expect(periodKey("2026-07-29", "month")).toBe("2026-07");
  });
  it("advances weeks by seven days and months across a year boundary", () => {
    expect(nextPeriodKey("2026-07-27", "week")).toBe("2026-08-03");
    expect(nextPeriodKey("2026-11", "month")).toBe("2026-12");
    expect(nextPeriodKey("2026-12", "month")).toBe("2027-01");
  });
});

describe("periodRange", () => {
  it("includes quiet periods so the axis doesn't compress time", () => {
    // Three weeks apart with nothing in between.
    expect(periodRange("2026-07-01", "2026-07-22", "week")).toEqual([
      "2026-06-29",
      "2026-07-06",
      "2026-07-13",
      "2026-07-20",
    ]);
  });
  it("spans months inclusively", () => {
    expect(periodRange("2026-11-15", "2027-01-04", "month")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });
});

describe("measurableTrades", () => {
  it("excludes open trades and closed ones with no R", () => {
    const trades = [
      trade({ status: "closed", r_result: 2 }),
      trade({ status: "open", r_result: null }),
      trade({ status: "closed", r_result: null }),
    ];
    expect(measurableTrades(trades)).toHaveLength(1);
  });
});

describe("trendByPeriod", () => {
  it("computes per-period stats and carries the equity curve through gaps", () => {
    const points = trendByPeriod(
      [
        trade({ date: "2026-07-01", r_result: 2 }),
        trade({ date: "2026-07-02", r_result: -1 }),
        // nothing in the week of the 6th
        trade({ date: "2026-07-15", r_result: 3 }),
      ],
      "week",
    );
    expect(points.map((p) => p.key)).toEqual([
      "2026-06-29",
      "2026-07-06",
      "2026-07-13",
    ]);

    expect(points[0].trades).toBe(2);
    expect(points[0].totalR).toBe(1);
    expect(points[0].expectancy).toBe(0.5);
    expect(points[0].winRate).toBe(50);
    expect(points[0].cumulativeR).toBe(1);

    // An empty period is a gap in the measurements, not a zero...
    expect(points[1].trades).toBe(0);
    expect(points[1].expectancy).toBeNull();
    expect(points[1].totalR).toBeNull();
    expect(points[1].winRate).toBeNull();
    // ...but the running total is unchanged rather than absent.
    expect(points[1].cumulativeR).toBe(1);

    expect(points[2].expectancy).toBe(3);
    expect(points[2].cumulativeR).toBe(4);
  });

  it("ignores open and R-less trades entirely", () => {
    const points = trendByPeriod(
      [
        trade({ date: "2026-07-01", r_result: 2 }),
        trade({ date: "2026-07-01", status: "open", r_result: null }),
        trade({ date: "2026-07-01", status: "closed", r_result: null }),
      ],
      "week",
    );
    expect(points).toHaveLength(1);
    expect(points[0].trades).toBe(1);
    expect(points[0].expectancy).toBe(2);
  });

  it("returns nothing when there is nothing measurable", () => {
    expect(trendByPeriod([trade({ status: "open", r_result: null })], "week")).toEqual([]);
    expect(trendByPeriod([], "month")).toEqual([]);
  });
});

describe("disciplineByPeriod", () => {
  it("counts behaviour from trades and mood from check-ins, independently", () => {
    const points = disciplineByPeriod(
      [
        trade({ date: "2026-07-01", mistake: true, plan_compliant: false, discipline_lapse: true }),
        trade({ date: "2026-07-02", mistake: false, plan_compliant: true }),
        trade({ date: "2026-07-03", mistake: false, plan_compliant: true }),
        trade({ date: "2026-07-04", mistake: false, plan_compliant: false }),
      ],
      [day({ date: "2026-07-01", stress_before: 4, stress_after: 2, energy_before: 3 })],
      "week",
    );
    expect(points).toHaveLength(1);
    expect(points[0].trades).toBe(4);
    expect(points[0].mistakeRate).toBe(25);
    expect(points[0].planCompliance).toBe(50);
    expect(points[0].lapseRate).toBe(25);
    expect(points[0].stressBefore).toBe(4);
    expect(points[0].stressAfter).toBe(2);
  });

  it("averages only the check-ins that recorded a value", () => {
    const points = disciplineByPeriod(
      [],
      [
        day({ date: "2026-07-01", stress_before: 4 }),
        day({ date: "2026-07-02", stress_before: null }), // morning only, no evening
        day({ date: "2026-07-03", stress_before: 2 }),
      ],
      "week",
    );
    // Mean of 4 and 2 — the unrecorded day is absent, not zero.
    expect(points[0].stressBefore).toBe(3);
    expect(points[0].stressAfter).toBeNull();
  });

  it("reports null rates for a period with check-ins but no trades", () => {
    const points = disciplineByPeriod([], [day({ date: "2026-07-01", stress_before: 3 })], "week");
    expect(points[0].trades).toBe(0);
    expect(points[0].mistakeRate).toBeNull();
    expect(points[0].planCompliance).toBeNull();
    expect(points[0].stressBefore).toBe(3);
  });

  it("counts a trade even when it has no R, since a mistake is still a mistake", () => {
    const points = disciplineByPeriod(
      [trade({ date: "2026-07-01", status: "open", r_result: null, mistake: true })],
      [],
      "week",
    );
    expect(points[0].trades).toBe(1);
    expect(points[0].mistakeRate).toBe(100);
  });
});

describe("groupTrendByPeriod", () => {
  it("aligns every group to one axis with nulls where it didn't trade", () => {
    const groups = groupTrendByPeriod(
      [
        trade({ date: "2026-07-01", setup: "Pullback", r_result: 2 }),
        trade({ date: "2026-07-15", setup: "Pullback", r_result: -1 }),
        trade({ date: "2026-07-15", setup: "Breakout", r_result: 1 }),
      ],
      "week",
      (t) => t.setup,
    );

    const pullback = groups.find((g) => g.group === "Pullback")!;
    const breakout = groups.find((g) => g.group === "Breakout")!;

    // Same axis for both, so they can be read against each other.
    expect(pullback.points.map((p) => p.key)).toEqual(breakout.points.map((p) => p.key));
    expect(pullback.totalTrades).toBe(2);
    expect(breakout.points[0].expectancy).toBeNull(); // wasn't traded that week
    expect(breakout.points[2].expectancy).toBe(1);
    // Busiest group first.
    expect(groups[0].group).toBe("Pullback");
  });

  it("labels untagged trades rather than dropping them", () => {
    const groups = groupTrendByPeriod(
      [trade({ date: "2026-07-01", setup: null, r_result: 1 })],
      "week",
      (t) => t.setup,
    );
    expect(groups[0].group).toBe("(none)");
  });
});

describe("compareLatest", () => {
  it("compares the last value against the mean of the rest", () => {
    expect(compareLatest([1, 2, 3])).toEqual({
      latest: 3,
      previousAverage: 1.5,
      delta: 1.5,
    });
  });
  it("skips gaps when comparing", () => {
    expect(compareLatest([1, null, 3])).toEqual({
      latest: 3,
      previousAverage: 1,
      delta: 2,
    });
  });
  it("gives no delta rather than a fake zero when there's no history", () => {
    expect(compareLatest([5])).toEqual({
      latest: 5,
      previousAverage: null,
      delta: null,
    });
    expect(compareLatest([])).toEqual({
      latest: null,
      previousAverage: null,
      delta: null,
    });
    expect(compareLatest([null, null])).toEqual({
      latest: null,
      previousAverage: null,
      delta: null,
    });
  });
});

describe("monthsAgoIso", () => {
  it("goes back whole months", () => {
    expect(monthsAgoIso("2026-08-28", 6)).toBe("2026-02-28");
    expect(monthsAgoIso("2026-01-15", 3)).toBe("2025-10-15");
  });
});
