import { describe, expect, it } from "vitest";
import {
  computeRStats,
  cumulativeR,
  rollingExpectancy,
  statsByGroup,
} from "./stats";

describe("computeRStats", () => {
  it("computes win rate, averages, expectancy, total", () => {
    const s = computeRStats([2, -1, 3, -1, 0]);
    expect(s.count).toBe(5);
    expect(s.winners).toBe(2);
    expect(s.losers).toBe(2);
    expect(s.scratches).toBe(1);
    expect(s.winRate).toBe(50);
    expect(s.avgWinR).toBe(2.5);
    expect(s.avgLossR).toBe(-1);
    expect(s.expectancy).toBe(0.6);
    expect(s.totalR).toBe(3);
  });
  it("handles empty input", () => {
    const s = computeRStats([]);
    expect(s.winRate).toBeNull();
    expect(s.expectancy).toBeNull();
    expect(s.totalR).toBe(0);
  });
});

describe("cumulativeR", () => {
  it("accumulates in order", () => {
    expect(cumulativeR([1, -0.5, 2])).toEqual([1, 0.5, 2.5]);
  });
});

describe("rollingExpectancy", () => {
  it("empty below the window size", () => {
    expect(rollingExpectancy([1, 2], 20)).toEqual([]);
  });
  it("computes trailing means", () => {
    expect(rollingExpectancy([1, 2, 3, 4], 2)).toEqual([1.5, 2.5, 3.5]);
  });
});

describe("statsByGroup", () => {
  it("groups by key, skips null R, sorts by total R desc", () => {
    const trades = [
      { setup: "pullback", r: 2 },
      { setup: "pullback", r: -1 },
      { setup: "breakout", r: 3 },
      { setup: null, r: 1 },
      { setup: "breakout", r: null },
    ];
    const grouped = statsByGroup(
      trades,
      (t) => t.setup,
      (t) => t.r,
    );
    expect(grouped.map((g) => g.key)).toEqual([
      "breakout",
      "pullback",
      "(none)",
    ]);
    expect(grouped[1].stats.totalR).toBe(1);
  });
});
