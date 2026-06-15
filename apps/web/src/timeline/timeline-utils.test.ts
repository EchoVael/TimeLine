import { describe, expect, it } from "vitest";

import {
  formatTimelineDate,
  startsTimelineYear,
  timelineYear,
} from "./timeline-utils.js";

describe("timeline date utilities", () => {
  it("keeps milestone dates compact", () => {
    expect(formatTimelineDate("2026-06-30")).toBe("Jun 30");
  });

  it("starts a year for the first visible item", () => {
    expect(startsTimelineYear("2026-06-30", undefined)).toBe(true);
  });

  it("does not start a year for another item in the same year", () => {
    expect(startsTimelineYear("2026-07-05", "2026-06-30")).toBe(
      false,
    );
  });

  it("starts a year when the year changes", () => {
    expect(startsTimelineYear("2027-01-03", "2026-07-05")).toBe(true);
  });

  it("extracts the year from a local date", () => {
    expect(timelineYear("2027-01-03")).toBe(2027);
  });
});
