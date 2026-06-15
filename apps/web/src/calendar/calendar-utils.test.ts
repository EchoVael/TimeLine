import { describe, expect, it } from "vitest";

import { calendarYearOptions } from "./calendar-utils.js";

describe("calendarYearOptions", () => {
  it("returns the cursor year with ten years on either side", () => {
    const years = calendarYearOptions(2026);

    expect(years).toHaveLength(21);
    expect(years[0]).toBe(2016);
    expect(years[10]).toBe(2026);
    expect(years[20]).toBe(2036);
  });
});
