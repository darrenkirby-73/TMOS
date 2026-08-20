import { describe, expect, it } from "vitest";
import { composePrompt, renderForPaste, WORKFLOW_LIST, WORKFLOWS } from "./index";
import { mockResponse } from "./mock";
import type { DayRecord, Trade } from "@/lib/types";

const emptyDay: DayRecord = {
  id: "d",
  user_id: "u",
  date: "2026-07-29",
  traded: false,
  planned_risk_per_trade: 0.25,
  max_daily_risk: 1,
  max_trades_planned: null,
  stress_before: 4,
  energy_before: 7,
  conditions_acceptable: true,
  winning_attitude_focus: null,
  losing_attitude_watch: null,
  discipline_checklist: null,
  decision_sequence: null,
  decision_commitment: null,
  morning_completed_at: "2026-07-29T07:00:00Z",
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
};

const trade: Trade = {
  id: "t",
  user_id: "u",
  day_record_id: null,
  date: "2026-07-29",
  ticker: "AAPL",
  direction: "long",
  setup: "Pullback to 10MA",
  system: "Swing pullback v1",
  entry_price: 100,
  stop_price: 98,
  exit_price: 106,
  quantity: 50,
  risk_amount_gbp: 100,
  r_result: 3,
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
};

describe("system prompt constraints", () => {
  it("states every hard product constraint", () => {
    const { system } = composePrompt("morning_coach", {}, {});
    expect(system).toMatch(/NEVER tell the user what to buy or sell/);
    expect(system).toMatch(/NEVER predict markets/);
    expect(system).toMatch(/NEVER invent, estimate, or assume market data/);
    expect(system).toMatch(/confirm it manually/);
    expect(system).toMatch(/valid loss/i);
  });

  it("layers system, role and task prompts for every workflow", () => {
    for (const def of WORKFLOW_LIST) {
      const { system } = composePrompt(def.id, {}, {});
      expect(system).toContain("Trader's Mental Operating System");
      expect(system).toContain("## Your role");
      expect(system).toContain("## This task");
      expect(system).toContain(def.taskPrompt);
    }
  });
});

describe("payload assembly", () => {
  it("marks an absent day record as having no record", () => {
    const { userMessage } = composePrompt(
      "morning_coach",
      {},
      { todayRecord: null },
    );
    expect(userMessage).toContain("NO RECORD");
    expect(userMessage).toContain("Do not infer its contents");
  });

  it("marks individual unfilled fields rather than omitting them", () => {
    const { userMessage } = composePrompt(
      "morning_coach",
      {},
      { todayRecord: emptyDay },
    );
    expect(userMessage).toContain("Stress before: 4");
    expect(userMessage).toContain("Winning attitude focus: NOT RECORDED");
    expect(userMessage).toContain("Decision sequence: NOT RECORDED");
  });

  it("says no trades were logged instead of staying silent", () => {
    const { userMessage } = composePrompt(
      "evening_debrief",
      {},
      { todayRecord: emptyDay, recentTrades: [] },
    );
    expect(userMessage).toContain("NONE LOGGED");
    expect(userMessage).toContain("Do not assume trades were taken");
  });

  it("supplies pre-computed stats and flags what they exclude", () => {
    const { userMessage } = composePrompt(
      "trade_analyst",
      {},
      {
        allClosedTrades: [
          trade,
          { ...trade, id: "2", r_result: -1 },
          { ...trade, id: "3", status: "open", r_result: null },
          { ...trade, id: "4", status: "closed", r_result: null },
        ],
      },
    );
    expect(userMessage).toContain("Expectancy (mean R per trade): +1.00R");
    expect(userMessage).toContain("Win rate: 50%");
    expect(userMessage).toContain("1 open trade(s), 1 closed trade(s) with no R");
  });

  it("reports an empty history as having nothing to analyse", () => {
    const { userMessage } = composePrompt(
      "trade_analyst",
      {},
      { allClosedTrades: [] },
    );
    expect(userMessage).toContain("no performance history to analyse yet");
  });

  it("includes the user's typed inputs", () => {
    const { userMessage } = composePrompt(
      "pre_trade_review",
      { ticker: "MSFT", earnings_near: "not checked" },
      {},
    );
    expect(userMessage).toContain("ticker: MSFT");
    expect(userMessage).toContain("earnings_near: not checked");
  });

  it("tells the model that missing markers are genuine", () => {
    const { userMessage } = composePrompt("morning_coach", {}, {});
    expect(userMessage).toContain("do not fill it in");
  });
});

describe("workflow definitions", () => {
  it("covers the five spec workflows with inputs and task prompts", () => {
    expect(Object.keys(WORKFLOWS).sort()).toEqual([
      "evening_debrief",
      "morning_coach",
      "pre_trade_review",
      "trade_analyst",
      "weekly_review",
    ]);
    for (const def of WORKFLOW_LIST) {
      expect(def.taskPrompt.length).toBeGreaterThan(100);
      expect(def.label).toBeTruthy();
    }
  });

  it("collects every input the pre-trade spec requires", () => {
    const names = WORKFLOWS.pre_trade_review.inputs.map((i) => i.name);
    for (const required of [
      "ticker",
      "setup",
      "entry_price",
      "stop_price",
      "target_area",
      "account_size",
      "intended_risk_gbp",
      "earnings_near",
      "stress_now",
      "trend_filter_confirmed",
    ]) {
      expect(names).toContain(required);
    }
  });
});

describe("mock mode", () => {
  it("is clearly labelled and offers no coaching judgement", () => {
    const { userMessage } = composePrompt("morning_coach", {}, {});
    const out = mockResponse("morning_coach", userMessage);
    expect(out).toContain("Mock response");
    expect(out).toContain("No model was called");
    expect(out).toContain("ANTHROPIC_API_KEY");
  });

  it("reports what the assembled payload was missing", () => {
    const { userMessage } = composePrompt(
      "morning_coach",
      {},
      { todayRecord: emptyDay },
    );
    const out = mockResponse("morning_coach", userMessage);
    expect(out).toMatch(/\d+ fields? in your records/);
  });
});

describe("renderForPaste", () => {
  it("carries the hard constraints into the flattened prompt", () => {
    // A Claude chat has no system field. If the flatten dropped the system
    // turn, paste-through would silently run without the constraints that
    // stop the coach recommending trades — the one failure that matters.
    for (const def of WORKFLOW_LIST) {
      const text = renderForPaste(composePrompt(def.id, {}, {}));
      expect(text).toMatch(/NEVER tell the user what to buy or sell/);
      expect(text).toMatch(/NEVER predict markets/);
      expect(text).toMatch(/NEVER invent, estimate, or assume market data/);
      expect(text).toContain(def.taskPrompt);
    }
  });

  it("keeps both turns whole and in order", () => {
    const prompt = composePrompt("morning_coach", { note: "slept badly" }, {});
    const text = renderForPaste(prompt);
    expect(text).toContain(prompt.system);
    expect(text).toContain(prompt.userMessage);
    expect(text.indexOf(prompt.system)).toBeLessThan(
      text.indexOf(prompt.userMessage),
    );
    expect(text).toContain("note: slept badly");
  });

  it("keeps the missing-data markers the payload relies on", () => {
    const text = renderForPaste(composePrompt("evening_debrief", {}, {}));
    expect(text).toContain("NO RECORD");
    expect(text).toContain("do not fill it in");
  });
});
