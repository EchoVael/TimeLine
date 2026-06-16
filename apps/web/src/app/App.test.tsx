import type { CalendarMonthResponse, Group, Milestone } from "@timemagic/shared";
import { calendarDates } from "@timemagic/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.js";

const deleteMilestone = vi.fn();

const groups: Group[] = [
  {
    archivedAt: null,
    color: "#177d67",
    description: "",
    id: "group-thesis",
    name: "Thesis",
    sortOrder: 0,
    version: 1,
  },
];

const milestones: Milestone[] = [
  {
    completedOn: null,
    date: "2027-01-03",
    dayOrder: 0,
    documentId: "doc-final",
    groupId: "group-thesis",
    id: "milestone-final",
    overdue: false,
    status: "not_started",
    title: "Final submission",
    version: 1,
  },
];

function calendarResponse(
  year: number,
  month: number,
): CalendarMonthResponse {
  return {
    days: calendarDates(year, month, "monday").map((date) => ({
      date,
      firstMilestoneTitle:
        date === "2027-01-03" ? "Final submission" : null,
      groupIds: date === "2027-01-03" ? ["group-thesis"] : [],
      hasDailyNote: false,
      milestoneCount: date === "2027-01-03" ? 1 : 0,
      overflowCount: 0,
    })),
    month,
    year,
  };
}

vi.mock("../api/queries.js", () => ({
  useCreateGroup: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useGroups: () => ({
    data: { items: groups, nextCursor: null },
    isLoading: false,
  }),
  useMilestones: () => ({
    data: { items: milestones, nextCursor: null },
    isLoading: false,
  }),
  useCreateMilestone: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteMilestone: () => ({
    isPending: false,
    mutateAsync: deleteMilestone,
  }),
  useUpdateMilestone: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCalendar: (year: number, month: number) => ({
    data: calendarResponse(year, month),
    isLoading: false,
  }),
  useReorderMilestones: () => ({ mutateAsync: vi.fn() }),
  useReorderGroups: () => ({ mutateAsync: vi.fn() }),
}));

describe("App", () => {
  beforeEach(() => {
    deleteMilestone.mockReset();
    deleteMilestone.mockResolvedValue({ deleted: true, id: "milestone-final" });
  });

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

  it("opens Calendar on the selected Timeline milestone month", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Open Final submission" }),
    );
    expect(
      within(
        screen.getByRole("complementary", { name: "Details" }),
      ).getByLabelText("Short title"),
    ).toHaveProperty("value", "Final submission");

    await user.click(
      within(screen.getByRole("group", { name: "Primary view" })).getByRole(
        "button",
        { name: "Calendar" },
      ),
    );

    expect(screen.getByRole("combobox", { name: "Year" })).toHaveProperty(
      "value",
      "2027",
    );
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveProperty(
      "value",
      "1",
    );
    expect(screen.getByRole("grid", { name: "January 2027" })).toBeTruthy();
    expect(
      within(
        screen.getByRole("complementary", { name: "Details" }),
      ).getByLabelText("Short title"),
    ).toHaveProperty("value", "Final submission");
  });

  it("clears the selected milestone after deleting it", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Open Final submission" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete milestone" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(deleteMilestone).toHaveBeenCalledWith(1);
    expect(
      within(screen.getByRole("complementary", { name: "Details" })).getByText(
        "Select a project or milestone.",
      ),
    ).toBeTruthy();
  });
});
