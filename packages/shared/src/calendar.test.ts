import { describe, expect, it } from "vitest";

import { calendarDisplayRange, calendarDates } from "./calendar.js";

describe("calendarDates", () => {
  it("returns a six-week Monday-first grid", () => {
    const dates = calendarDates(2026, 6, "monday");

    expect(dates).toHaveLength(42);
    expect(dates[0]).toBe("2026-06-01");
    expect(dates.at(-1)).toBe("2026-07-12");
  });

  it("returns a six-week Sunday-first grid", () => {
    const dates = calendarDates(2026, 6, "sunday");

    expect(dates).toHaveLength(42);
    expect(dates[0]).toBe("2026-05-31");
    expect(dates.at(-1)).toBe("2026-07-11");
  });

  it("handles February in a leap year", () => {
    const dates = calendarDates(2028, 2, "monday");

    expect(dates).toContain("2028-02-29");
    expect(dates).not.toContain("2028-02-30");
  });
});

describe("calendarDisplayRange", () => {
  it("returns the first and last displayed dates", () => {
    expect(calendarDisplayRange(2026, 6, "sunday")).toEqual({
      from: "2026-05-31",
      to: "2026-07-11",
    });
  });
});
