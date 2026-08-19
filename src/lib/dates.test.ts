import { describe, expect, it } from "vitest";
import { addDaysIso, weekStartIso } from "./dates";

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
