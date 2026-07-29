import { describe, expect, it } from "vitest";
import {
  formatR,
  rawPnl,
  stopDistance,
  suggestedR,
  suggestedRiskAmount,
} from "./r";

describe("stopDistance", () => {
  it("is the absolute entry-stop distance", () => {
    expect(stopDistance(100, 98)).toBe(2);
    expect(stopDistance(98, 100)).toBe(2);
  });
});

describe("suggestedRiskAmount", () => {
  it("is stop distance times quantity", () => {
    expect(suggestedRiskAmount(100, 98, 50)).toBe(100);
  });
  it("rejects invalid inputs", () => {
    expect(suggestedRiskAmount(0, 98, 50)).toBeNull();
    expect(suggestedRiskAmount(100, 100, 50)).toBeNull();
    expect(suggestedRiskAmount(100, 98, 0)).toBeNull();
    expect(suggestedRiskAmount(NaN, 98, 50)).toBeNull();
  });
});

describe("rawPnl", () => {
  it("long: (exit − entry) × qty", () => {
    expect(rawPnl("long", 100, 106, 50)).toBe(300);
    expect(rawPnl("long", 100, 97, 50)).toBe(-150);
  });
  it("short: sign reversed", () => {
    expect(rawPnl("short", 100, 94, 50)).toBe(300);
    expect(rawPnl("short", 100, 103, 50)).toBe(-150);
  });
});

describe("suggestedR", () => {
  const base = {
    direction: "long" as const,
    entryPrice: 100,
    quantity: 50,
    riskAmountGbp: 100,
  };
  it("long winner: +3R", () => {
    expect(suggestedR({ ...base, exitPrice: 106 })).toBe(3);
  });
  it("long loser at stop: −1R", () => {
    expect(suggestedR({ ...base, exitPrice: 98 })).toBe(-1);
  });
  it("short winner", () => {
    expect(
      suggestedR({ ...base, direction: "short", exitPrice: 94 }),
    ).toBe(3);
  });
  it("short loser", () => {
    expect(
      suggestedR({ ...base, direction: "short", exitPrice: 102 }),
    ).toBe(-1);
  });
  it("uses risk_amount_gbp as the denominator, not stop distance", () => {
    // User sized risk at £150 even though stop distance implies £100
    expect(
      suggestedR({ ...base, riskAmountGbp: 150, exitPrice: 106 }),
    ).toBe(2);
  });
  it("null when exit missing or risk invalid", () => {
    expect(suggestedR({ ...base, exitPrice: null })).toBeNull();
    expect(suggestedR({ ...base, exitPrice: 106, riskAmountGbp: 0 })).toBeNull();
  });
  it("rounds to 2dp", () => {
    expect(suggestedR({ ...base, exitPrice: 100.333 })).toBe(0.17);
  });
});

describe("formatR", () => {
  it("formats with sign and R suffix", () => {
    expect(formatR(2.5)).toBe("+2.50R");
    expect(formatR(-0.8)).toBe("-0.80R");
    expect(formatR(null)).toBe("—");
  });
});
