import { describe, expect, it } from "vitest";
import { summariseWeek } from "./weekly";
import type { DayRecord, Trade } from "./types";

function day(overrides: Partial<DayRecord>): DayRecord {
  return {
    id: "d",
    user_id: "u",
    date: "2026-07-27",
    traded: true,
    planned_risk_per_trade: 0.25,
    max_daily_risk: 1,
    max_trades_planned: null,
    stress_before: null,
    energy_before: null,
    conditions_acceptable: true,
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
    ...overrides,
  };
}

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: "t",
    user_id: "u",
    day_record_id: null,
    date: "2026-07-27",
    ticker: "AAPL",
    direction: "long",
    setup: null,
    system: null,
    entry_price: 100,
    stop_price: 98,
    exit_price: 102,
    quantity: 10,
    risk_amount_gbp: 20,
    r_result: 1,
    is_complex_trade: false,
    position_size: null,
    trade_type: "shadow",
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
    ...overrides,
  };
}

describe("summariseWeek", () => {
  it("always produces seven labelled days starting Monday", () => {
    const s = summariseWeek("2026-07-27", [], []);
    expect(s.days).toHaveLength(7);
    expect(s.days[0]).toMatchObject({ date: "2026-07-27", label: "Mon" });
    expect(s.days[6]).toMatchObject({ date: "2026-08-02", label: "Sun" });
    expect(s.days.every((d) => !d.hasRecord)).toBe(true);
  });

  it("leaves subjective measures null when no check-ins exist", () => {
    const s = summariseWeek("2026-07-27", [], [trade({})]);
    expect(s.avgStressBefore).toBeNull();
    expect(s.avgStressAfter).toBeNull();
    expect(s.topLosingAttitude).toBeNull();
    expect(s.decisionQualityCounts).toEqual([]);
  });

  it("averages stress only over days that recorded it", () => {
    const s = summariseWeek(
      "2026-07-27",
      [
        day({ date: "2026-07-27", stress_before: 2, stress_after: 6 }),
        day({ date: "2026-07-28", stress_before: 4, stress_after: null }),
        day({ date: "2026-07-29" }),
      ],
      [],
    );
    expect(s.avgStressBefore).toBe(3);
    expect(s.avgStressAfter).toBe(6);
  });

  it("computes discipline compliance from the trade log", () => {
    const s = summariseWeek(
      "2026-07-27",
      [],
      [
        trade({ plan_compliant: true }),
        trade({ plan_compliant: true }),
        trade({ plan_compliant: false, mistake: true }),
        trade({ plan_compliant: false, discipline_lapse: true, lapse_type: "Moved stop" }),
      ],
    );
    expect(s.tradeCount).toBe(4);
    expect(s.planCompliantCount).toBe(2);
    expect(s.disciplineCompliance).toBe(50);
    expect(s.mistakesCount).toBe(1);
    expect(s.lapsesCount).toBe(1);
    expect(s.topLapseType).toBe("Moved stop");
  });

  it("has null compliance when no trades were taken", () => {
    expect(summariseWeek("2026-07-27", [day({})], []).disciplineCompliance).toBeNull();
  });

  it("counts mistakes against the day they occurred", () => {
    const s = summariseWeek(
      "2026-07-27",
      [],
      [
        trade({ date: "2026-07-28", mistake: true }),
        trade({ date: "2026-07-28", mistake: true }),
        trade({ date: "2026-07-30", mistake: false }),
      ],
    );
    expect(s.days[1].mistakes).toBe(2);
    expect(s.days[3].mistakes).toBe(0);
  });

  it("ranks attitudes across both day records and trades", () => {
    const s = summariseWeek(
      "2026-07-27",
      [
        day({ date: "2026-07-27", losing_attitudes_observed: ["FOMO"] }),
        day({ date: "2026-07-28", losing_attitudes_observed: ["FOMO", "Impatience"] }),
      ],
      [trade({ losing_attitude_present: true, attitude_tag: "Impatience" })],
    );
    expect(s.topLosingAttitude).toBe("FOMO");
  });

  it("tallies decision quality and check-in completion", () => {
    const s = summariseWeek(
      "2026-07-27",
      [
        day({ date: "2026-07-27", decision_quality: "good", morning_completed_at: "x", evening_completed_at: "x" }),
        day({ date: "2026-07-28", decision_quality: "good", morning_completed_at: "x" }),
        day({ date: "2026-07-29", decision_quality: "mixed" }),
      ],
      [],
    );
    expect(s.decisionQualityCounts).toEqual([
      { quality: "good", count: 2 },
      { quality: "mixed", count: 1 },
    ]);
    expect(s.checkinsCompleted).toEqual({ morning: 2, evening: 1 });
  });
});
