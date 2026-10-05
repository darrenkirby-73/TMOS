import { describe, expect, it } from "vitest";
import {
  calculateSize,
  checkLimits,
  equityAsOf,
  FX_UNITS_PER_LOT,
  roundSig,
  sizingProblems,
  type SizingInput,
} from "./sizing";

function shares(over: Partial<SizingInput> = {}): SizingInput {
  return {
    instrument: "shares",
    direction: "long",
    equity: 50_000,
    riskPercent: 1,
    entryPrice: 100,
    stopPrice: 98,
    rateToAccount: 1,
    ...over,
  };
}

describe("calculateSize — shares, same currency", () => {
  it("sizes at 1% of equity and reports what is actually risked", () => {
    // £50,000 × 1% = £500 target. Stop distance £2 → 250 shares exactly.
    const r = calculateSize(shares())!;
    expect(r.targetRisk).toBe(500);
    expect(r.riskPerUnit).toBe(2);
    expect(r.units).toBe(250);
    expect(r.realisedRisk).toBe(500);
    expect(r.realisedRiskPercent).toBe(1);
    expect(r.notional).toBe(25_000);
  });

  it("rounds DOWN, so realised risk comes in under the target, never over", () => {
    // £500 target, £3 stop distance → 166.67 shares. Must not become 167.
    const r = calculateSize(shares({ stopPrice: 97 }))!;
    expect(r.units).toBe(166);
    expect(r.realisedRisk).toBe(498);
    expect(r.realisedRisk).toBeLessThan(r.targetRisk);
    // round2 displays 0.996% as 1.00%; what must never happen is a realised
    // percentage reading ABOVE the limit the user asked for.
    expect(r.realisedRiskPercent).toBeLessThanOrEqual(1);
  });

  it("gives the 1R and 3R prices in the trade's direction", () => {
    const long = calculateSize(shares())!;
    expect(long.oneRPrice).toBe(102);
    expect(long.threeRPrice).toBe(106);

    const short = calculateSize(
      shares({ direction: "short", entryPrice: 100, stopPrice: 102 }),
    )!;
    expect(short.oneRPrice).toBe(98);
    expect(short.threeRPrice).toBe(94);
  });

  it("returns zero units rather than a fraction when one unit is unaffordable", () => {
    // £500 target but £600 of risk per share.
    const r = calculateSize(shares({ entryPrice: 1000, stopPrice: 400 }))!;
    expect(r.units).toBe(0);
    expect(r.realisedRisk).toBe(0);
  });
});

describe("calculateSize — shares in a foreign currency", () => {
  it("converts risk per share into the account currency", () => {
    // USD stock, $2 stop distance, 0.79 USD->GBP. Risk per share = £1.58.
    // £500 / £1.58 = 316.4 -> 316 shares.
    const r = calculateSize(shares({ rateToAccount: 0.79 }))!;
    expect(r.riskPerUnit).toBe(2);
    expect(r.riskPerUnitInAccount).toBeCloseTo(1.58, 5);
    expect(r.units).toBe(316);
    expect(r.realisedRisk).toBeCloseTo(499.28, 2);
    // Notional is converted too: 316 × $100 × 0.79.
    expect(r.notional).toBeCloseTo(24_964, 0);
  });

  it("a weaker instrument currency buys more shares for the same risk", () => {
    const strong = calculateSize(shares({ rateToAccount: 1.2 }))!;
    const weak = calculateSize(shares({ rateToAccount: 0.6 }))!;
    expect(weak.units).toBeGreaterThan(strong.units);
    // Both still respect the same cash risk limit.
    expect(strong.realisedRisk).toBeLessThanOrEqual(strong.targetRisk);
    expect(weak.realisedRisk).toBeLessThanOrEqual(weak.targetRisk);
  });
});

describe("calculateSize — FX pairs", () => {
  it("sizes in base-currency units and expresses them as lots", () => {
    // GBP/USD 1.2750 entry, 1.2700 stop → 0.0050 USD risk per unit.
    // USD->GBP at 0.78 → £0.0039 per unit. £500 / 0.0039 = 128,205 units.
    const r = calculateSize({
      instrument: "fx",
      direction: "long",
      equity: 50_000,
      riskPercent: 1,
      entryPrice: 1.275,
      stopPrice: 1.27,
      rateToAccount: 0.78,
    })!;
    // 1.275 - 1.27 is 0.004999999999999893 in binary floating point, and
    // two-decimal rounding would report it as 0.00.
    expect(r.riskPerUnit).toBe(0.005);
    expect(r.riskPerUnitInAccount).toBeCloseTo(0.0039, 6);
    expect(r.units).toBe(128_205);
    expect(r.lots).toBeCloseTo(1.2821, 3);
    expect(r.realisedRisk).toBeLessThanOrEqual(500);
  });

  it("a tiny stop distance does not collapse to zero and blow up the size", () => {
    // 0.0005 risk per unit. round2 would make this 0 and divide by zero.
    const r = calculateSize({
      instrument: "fx",
      direction: "long",
      equity: 10_000,
      riskPercent: 1,
      entryPrice: 1.1005,
      stopPrice: 1.1,
      rateToAccount: 1,
    })!;
    expect(Number.isFinite(r.units)).toBe(true);
    expect(r.units).toBe(200_000); // £100 / 0.0005
    expect(r.lots).toBe(2);
    expect(r.realisedRisk).toBeCloseTo(100, 2);
  });

  it("reports lots as null for shares", () => {
    expect(calculateSize(shares())!.lots).toBeNull();
    expect(FX_UNITS_PER_LOT).toBe(100_000);
  });
});

describe("sizingProblems", () => {
  it("accepts a complete, coherent input", () => {
    expect(sizingProblems(shares())).toEqual([]);
  });

  it("treats a missing rate as missing, never as parity", () => {
    const problems = sizingProblems(shares({ rateToAccount: null }));
    expect(problems).toHaveLength(1);
    expect(problems[0].field).toBe("rateToAccount");
    expect(calculateSize(shares({ rateToAccount: null }))).toBeNull();
  });

  it("rejects a stop on the wrong side of the entry", () => {
    const long = sizingProblems(shares({ entryPrice: 100, stopPrice: 102 }));
    expect(long.some((p) => p.message.includes("below the entry"))).toBe(true);

    const short = sizingProblems(
      shares({ direction: "short", entryPrice: 100, stopPrice: 98 }),
    );
    expect(short.some((p) => p.message.includes("above the entry"))).toBe(true);
  });

  it("rejects a zero stop distance instead of dividing by zero", () => {
    const problems = sizingProblems(shares({ stopPrice: 100 }));
    expect(problems.some((p) => p.message.includes("same price"))).toBe(true);
    expect(calculateSize(shares({ stopPrice: 100 }))).toBeNull();
  });

  it("reports every problem at once, not just the first", () => {
    const problems = sizingProblems(
      shares({ equity: 0, riskPercent: 0, entryPrice: -1, rateToAccount: null }),
    );
    const fields = problems.map((p) => p.field);
    expect(fields).toContain("equity");
    expect(fields).toContain("riskPercent");
    expect(fields).toContain("entryPrice");
    expect(fields).toContain("rateToAccount");
  });

  it("rejects a risk percent above 100", () => {
    expect(
      sizingProblems(shares({ riskPercent: 101 })).some(
        (p) => p.field === "riskPercent",
      ),
    ).toBe(true);
  });
});

describe("checkLimits", () => {
  const base = {
    equity: 50_000,
    maxOpenRiskPercent: 3,
    maxNewDailyRiskPercent: 2,
  };

  it("passes a trade that fits within both limits", () => {
    const c = checkLimits({
      ...base,
      proposedRisk: 500,
      openTradeRisks: [500],
      todayTradeRisks: [500],
    });
    expect(c.breachesOpenLimit).toBe(false);
    expect(c.breachesDailyLimit).toBe(false);
    expect(c.openRiskPercent).toBe(1);
    expect(c.openRiskRemaining).toBe(1000); // 3% = £1500, £500 used
    expect(c.dailyRiskRemaining).toBe(500); // 2% = £1000, £500 used
  });

  it("flags a breach of the open-risk cap caused by existing positions", () => {
    // 3% of £50,000 = £1500 open cap. £1200 on + £500 proposed = £1700.
    const c = checkLimits({
      ...base,
      proposedRisk: 500,
      openTradeRisks: [600, 600],
      todayTradeRisks: [],
    });
    expect(c.breachesOpenLimit).toBe(true);
    expect(c.breachesDailyLimit).toBe(false);
  });

  it("flags a breach of the daily cap independently of open risk", () => {
    // Two trades already opened and closed today: no open risk, daily used up.
    const c = checkLimits({
      ...base,
      proposedRisk: 500,
      openTradeRisks: [],
      todayTradeRisks: [500, 500],
    });
    expect(c.breachesOpenLimit).toBe(false);
    expect(c.breachesDailyLimit).toBe(true);
    expect(c.dailyRiskRemaining).toBe(0);
  });

  it("never reports negative remaining risk", () => {
    const c = checkLimits({
      ...base,
      proposedRisk: 0,
      openTradeRisks: [5000],
      todayTradeRisks: [5000],
    });
    expect(c.openRiskRemaining).toBe(0);
    expect(c.dailyRiskRemaining).toBe(0);
  });

  it("treats a trade landing exactly on the cap as allowed", () => {
    const c = checkLimits({
      ...base,
      proposedRisk: 500,
      openTradeRisks: [1000],
      todayTradeRisks: [500],
    });
    expect(c.breachesOpenLimit).toBe(false); // 1500 == cap
    expect(c.breachesDailyLimit).toBe(false); // 1000 == cap
  });
});

describe("equityAsOf", () => {
  const entries = [
    { as_of_date: "2026-01-01", amount: 40_000 },
    { as_of_date: "2026-06-01", amount: 50_000 },
    { as_of_date: "2026-09-01", amount: 45_000 },
  ];

  it("uses the figure in force on the date, not the latest one", () => {
    expect(equityAsOf(entries, "2026-07-15")?.amount).toBe(50_000);
    expect(equityAsOf(entries, "2026-12-31")?.amount).toBe(45_000);
  });

  it("uses an entry dated exactly on the day", () => {
    expect(equityAsOf(entries, "2026-06-01")?.amount).toBe(50_000);
  });

  it("refuses rather than reaching forward to an equity that didn't exist yet", () => {
    expect(equityAsOf(entries, "2025-12-31")).toBeNull();
    expect(equityAsOf([], "2026-06-01")).toBeNull();
  });
});

describe("roundSig", () => {
  it("keeps small FX magnitudes instead of flattening them", () => {
    expect(roundSig(0.0005)).toBe(0.0005);
    expect(roundSig(0.00039)).toBe(0.00039);
    expect(roundSig(0)).toBe(0);
  });
  it("keeps five significant figures on larger numbers", () => {
    expect(roundSig(1.27503)).toBe(1.275);
    expect(roundSig(106)).toBe(106);
  });
});
