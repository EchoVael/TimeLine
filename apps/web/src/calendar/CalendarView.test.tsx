import type { CalendarMonthResponse, Group } from "@timemagic/shared";
import { calendarDates } from "@timemagic/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarView } from "./CalendarView.js";

const createMilestone = vi.fn();

const groups: Group[] = [
  {
    archivedAt: null,
    color: "#d1495b",
    description: "",
    id: "group-thesis",
    name: "Thesis",
    sortOrder: 0,
    version: 1,
  },
  {
    archivedAt: null,
    color: "#3a7d44",
    description: "",
    id: "group-visa",
    name: "Visa",
    sortOrder: 1,
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
        date === "2026-06-16" ? "First draft" : null,
      groupIds:
        date === "2026-06-16"
          ? ["group-thesis", "group-visa"]
          : [],
      hasDailyNote: date === "2026-06-16",
      milestoneCount: date === "2026-06-16" ? 3 : 0,
      overflowCount: date === "2026-06-16" ? 2 : 0,
    })),
    month,
    year,
  };
}

vi.mock("../api/queries.js", () => ({
  useCalendar: (year: number, month: number) => ({
    data: calendarResponse(year, month),
    isLoading: false,
  }),
  useCreateMilestone: () => ({
    isPending: false,
    mutateAsync: createMilestone,
  }),
}));

describe("CalendarView", () => {
  beforeEach(() => {
    createMilestone.mockReset();
  });

  it("renders a compact Monday-first month with daily summaries", () => {
    render(
      <CalendarView
        groups={groups}
        onSelectDate={vi.fn()}
        selectedDate={null}
        today="2026-06-16"
        visibleGroupIds={groups.map(({ id }) => id)}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Year" })).toHaveProperty(
      "value",
      "2026",
    );
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveProperty(
      "value",
      "6",
    );
    expect(screen.getByRole("grid", { name: "June 2026" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map(({ textContent }) => textContent)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(screen.getByText("First draft")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
    expect(screen.getByLabelText("Daily note on 2026-06-16")).toBeTruthy();
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
  });

  it("selects a month and year, navigates, and returns to today", async () => {
    const user = userEvent.setup();
    render(
      <CalendarView
        groups={groups}
        onSelectDate={vi.fn()}
        selectedDate={null}
        today="2026-06-16"
        visibleGroupIds={groups.map(({ id }) => id)}
      />,
    );

    const year = screen.getByRole("combobox", { name: "Year" });
    const month = screen.getByRole("combobox", { name: "Month" });

    await user.selectOptions(month, "12");
    expect(screen.getByRole("grid", { name: "December 2026" })).toBeTruthy();

    await user.selectOptions(year, "2036");
    expect(screen.getByRole("grid", { name: "December 2036" })).toBeTruthy();

    fireEvent.change(year, { target: { value: "not-a-year" } });
    fireEvent.change(month, { target: { value: "13" } });
    expect(screen.getByRole("grid", { name: "December 2036" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(year).toHaveProperty("value", "2037");
    expect(month).toHaveProperty("value", "1");
    expect(screen.getByRole("option", { name: "2037" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(year).toHaveProperty("value", "2026");
    expect(month).toHaveProperty("value", "6");
  });

  it("starts from an initial date without overriding manual navigation", async () => {
    const user = userEvent.setup();
    const props = {
      groups,
      onSelectDate: vi.fn(),
      selectedDate: null,
      today: "2026-06-16" as const,
      visibleGroupIds: groups.map(({ id }) => id),
    };
    const { rerender } = render(
      <CalendarView
        {...props}
        initialDate="2027-01-03"
      />,
    );

    expect(screen.getByRole("grid", { name: "January 2027" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("grid", { name: "June 2026" })).toBeTruthy();

    rerender(
      <CalendarView
        {...props}
        initialDate="2027-01-03"
      />,
    );
    expect(screen.getByRole("grid", { name: "June 2026" })).toBeTruthy();
  });

  it("selects a date and opens milestone creation prefilled to it", async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    render(
      <CalendarView
        groups={groups}
        onSelectDate={onSelectDate}
        selectedDate={null}
        today="2026-06-16"
        visibleGroupIds={groups.map(({ id }) => id)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open 2026-06-16" }));
    expect(onSelectDate).toHaveBeenCalledWith("2026-06-16");

    await user.click(
      screen.getByRole("button", {
        name: "Add milestone on 2026-06-16",
      }),
    );
    expect(screen.getByLabelText("Date")).toHaveProperty(
      "value",
      "2026-06-16",
    );
    await user.type(screen.getByLabelText("Short title"), "Advisor review");
    await user.click(screen.getByRole("button", { name: "Create milestone" }));
    expect(createMilestone).toHaveBeenCalledWith({
      date: "2026-06-16",
      groupId: "group-thesis",
      title: "Advisor review",
    });
  });
});
