import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App.js";

vi.mock("../api/queries.js", () => ({
  useCreateGroup: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useGroups: () => ({
    data: { items: [], nextCursor: null },
    isLoading: false,
  }),
  useMilestones: () => ({
    data: { items: [], nextCursor: null },
    isLoading: false,
  }),
  useCreateMilestone: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCalendar: () => ({
    data: {
      days: Array.from({ length: 42 }, (_, index) => ({
        date: `2026-06-${String(index + 1).padStart(2, "0")}`,
        firstMilestoneTitle: null,
        groupIds: [],
        hasDailyNote: false,
        milestoneCount: 0,
        overflowCount: 0,
      })),
      month: 6,
      year: 2026,
    },
    isLoading: false,
  }),
  useReorderMilestones: () => ({ mutateAsync: vi.fn() }),
  useReorderGroups: () => ({ mutateAsync: vi.fn() }),
}));

describe("App", () => {
  it("renders the three-pane workspace and switches primary views", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("navigation", { name: "Projects" }),
    ).toBeTruthy();
    expect(screen.getByRole("main", { name: "Timeline" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Details" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse projects" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse details" }),
    ).toBeTruthy();
    const viewSwitcher = screen.getByRole("group", { name: "Primary view" });
    expect(
      within(viewSwitcher).getByRole("button", {
        name: "Timeline",
        pressed: true,
      }),
    ).toBeTruthy();
    const calendarButton = within(viewSwitcher).getByRole("button", {
      name: "Calendar",
    });
    expect(calendarButton).not.toHaveProperty("disabled", true);
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(
      within(mobileNavigation).getByRole("button", { name: "Timeline" }),
    ).toBeTruthy();
    expect(
      within(mobileNavigation).getByRole("button", { name: "Calendar" }),
    ).toBeTruthy();
    await user.click(calendarButton);
    expect(
      screen.getByRole("main", { name: "Calendar" }),
    ).toBeTruthy();
  });
});
