import { describe, expect, it } from "vitest";

import { isOverdue } from "./milestones.js";

describe("isOverdue", () => {
  it("marks unfinished milestones before today as overdue", () => {
    expect(isOverdue("2026-06-14", "not_started", "2026-06-15")).toBe(true);
    expect(isOverdue("2026-06-14", "in_progress", "2026-06-15")).toBe(true);
  });

  it("does not mark completed or cancelled milestones as overdue", () => {
    expect(isOverdue("2026-06-14", "completed", "2026-06-15")).toBe(false);
    expect(isOverdue("2026-06-14", "cancelled", "2026-06-15")).toBe(false);
  });

  it("does not mark a milestone due today as overdue", () => {
    expect(isOverdue("2026-06-15", "in_progress", "2026-06-15")).toBe(false);
  });
});
