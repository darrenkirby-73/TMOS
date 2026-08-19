import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  isoDateInTimezone,
  isValidIsoDate,
  safeDateParam,
  todayIso,
  weekStartIso,
} from "./dates";

describe("weekStartIso", () => {
  it("returns Monday for mid-week dates", () => {
    expect(weekStartIso("2026-07-29")).toBe("2026-07-27"); // Wed -> Mon
  });
  it("returns the same day for a Monday", () => {
    expect(weekStartIso("2026-07-27")).toBe("2026-07-27");
  });
  it("returns previous Monday for a Sunday", () => {
    expect(weekStartIso("2026-08-02")).toBe("2026-07-27");
  });
});

describe("addDaysIso", () => {
  it("crosses month boundaries", () => {
    expect(addDaysIso("2026-07-30", 3)).toBe("2026-08-02");
  });
});

describe("isoDateInTimezone", () => {
  it("resolves the London date, not the runtime's UTC date", () => {
    // 00:30 London during BST is 23:30 UTC the previous day. A check-in then
    // must be filed against the London day, or the server and browser disagree.
    const instant = new Date("2026-07-14T23:30:00Z");
    expect(isoDateInTimezone(instant, "Europe/London")).toBe("2026-07-15");
    expect(isoDateInTimezone(instant, "UTC")).toBe("2026-07-14");
  });

  it("agrees with UTC outside BST", () => {
    const instant = new Date("2026-01-14T23:30:00Z");
    expect(isoDateInTimezone(instant, "Europe/London")).toBe("2026-01-14");
    expect(isoDateInTimezone(instant, "UTC")).toBe("2026-01-14");
  });

  it("handles the BST transition instants", () => {
    // Clocks go forward 2026-03-29 01:00 UTC
    expect(isoDateInTimezone(new Date("2026-03-29T00:59:00Z"), "Europe/London")).toBe("2026-03-29");
    expect(isoDateInTimezone(new Date("2026-03-29T01:01:00Z"), "Europe/London")).toBe("2026-03-29");
  });

  it("todayIso returns a well-formed date", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isValidIsoDate / safeDateParam", () => {
  it("accepts real dates", () => {
    expect(isValidIsoDate("2026-07-29")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true); // leap year
  });
  it("rejects malformed and rolled-over dates", () => {
    for (const bad of ["garbage", "", "2026-13-45", "2026-02-30", "2023-02-29", "26-1-1"]) {
      expect(isValidIsoDate(bad)).toBe(false);
    }
    expect(isValidIsoDate(undefined)).toBe(false);
  });
  it("safeDateParam passes valid dates through and falls back otherwise", () => {
    expect(safeDateParam("2026-07-29")).toBe("2026-07-29");
    expect(safeDateParam("2026-13-45")).toBe(todayIso());
    expect(safeDateParam(undefined)).toBe(todayIso());
  });
});
