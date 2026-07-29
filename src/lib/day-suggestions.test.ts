import { describe, expect, it } from "vitest";
import { suggestFromTrades } from "./day-suggestions";
import type { Trade } from "./types";

const base: Trade = {
  id: "x",
  user_id: "u",
  day_record_id: null,
  date: "2026-07-29",
  ticker: "AAPL",
  direction: "long",
  setup: null,
  system: null,
  entry_price: 100,
  stop_price: 98,
  exit_price: null,
  quantity: 10,
  risk_amount_gbp: 20,
  r_result: null,
  is_complex_trade: false,
  position_size: null,
  trade_type: "shadow",
  status: "open",
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
};

function trade(overrides: Partial<Trade>): Trade {
  return { ...base, ...overrides };
}

describe("suggestFromTrades", () => {
  it("returns an empty day when there are no trades", () => {
    const s = suggestFromTrades([]);
    expect(s.traded).toBe(false);
    expect(s.numTrades).toBe(0);
    expect(s.totalRToday).toBeNull();
    expect(s.planCompliantTrades).toBe(0);
  });

  it("counts all trades but only sums R from closed trades with a result", () => {
    const s = suggestFromTrades([
      trade({ status: "closed", r_result: 2 }),
      trade({ status: "closed", r_result: -1 }),
      trade({ status: "open" }),
      trade({ status: "closed", r_result: null }),
    ]);
    expect(s.numTrades).toBe(4);
    expect(s.totalRToday).toBe(1);
    expect(s.openTrades).toBe(1);
    expect(s.closedWithoutR).toBe(1);
  });

  it("counts plan compliance, mistakes and lapses", () => {
    const s = suggestFromTrades([
      trade({ plan_compliant: true }),
      trade({ plan_compliant: false, mistake: true, discipline_lapse: true, lapse_type: "Moved stop" }),
      trade({ plan_compliant: false, mistake: true, discipline_lapse: true, lapse_type: "Moved stop" }),
      trade({ discipline_lapse: true, lapse_type: "Chased entry" }),
    ]);
    expect(s.planCompliantTrades).toBe(2);
    expect(s.mistakesCount).toBe(2);
    expect(s.disciplineLapsesCount).toBe(3);
    expect(s.topLapseType).toBe("Moved stop");
  });

  it("collects distinct attitudes, ignoring blanks", () => {
    const s = suggestFromTrades([
      trade({ losing_attitude_present: true, attitude_tag: "FOMO" }),
      trade({ losing_attitude_present: true, attitude_tag: "FOMO" }),
      trade({ losing_attitude_present: false, attitude_tag: "Ignored" }),
      trade({ winning_attitude_applied: "Patient" }),
      trade({ winning_attitude_applied: null }),
    ]);
    expect(s.losingAttitudes).toEqual(["FOMO"]);
    expect(s.winningAttitudes).toEqual(["Patient"]);
  });

  it("has no top lapse type when no lapses were flagged", () => {
    const s = suggestFromTrades([trade({}), trade({})]);
    expect(s.topLapseType).toBeNull();
  });
});
