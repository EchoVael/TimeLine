import type { Group, Milestone } from "@timemagic/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TimelineView } from "./TimelineView.js";

const createMilestone = vi.fn();
const reorderMilestones = vi.fn();

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
];

const milestones: Milestone[] = [
  {
    completedOn: null,
    date: "2025-12-31",
    dayOrder: 0,
    documentId: "doc-past",
    groupId: "group-thesis",
    id: "past",
    overdue: true,
    status: "in_progress",
    title: "Past draft",
    version: 1,
  },
  {
    completedOn: null,
    date: "2026-06-30",
    dayOrder: 0,
    documentId: "doc-future",
    groupId: "group-thesis",
    id: "future",
    overdue: false,
    status: "not_started",
    title: "Future draft",
    version: 1,
  },
  {
    completedOn: "2026-06-10",
    date: "2026-07-05",
    dayOrder: 0,
    documentId: "doc-completed",
    groupId: "group-thesis",
    id: "completed",
    overdue: false,
    status: "completed",
    title: "Completed review",
    version: 1,
  },
  {
    completedOn: null,
    date: "2027-01-03",
    dayOrder: 0,
    documentId: "doc-next-year",
    groupId: "group-thesis",
    id: "next-year",
    overdue: false,
    status: "not_started",
    title: "Final submission",
    version: 1,
  },
];

vi.mock("../api/queries.js", () => ({
  useCreateMilestone: () => ({
    isPending: false,
    mutateAsync: createMilestone,
  }),
  useMilestones: () => ({
    data: { items: milestones, nextCursor: null },
    isLoading: false,
  }),
  useReorderMilestones: () => ({ mutateAsync: reorderMilestones }),
}));

describe("TimelineView", () => {
  beforeEach(() => {
    createMilestone.mockReset();
    reorderMilestones.mockReset();
  });

  it("keeps past and completed milestones around today", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TimelineView
        groups={groups}
        onSelect={onSelect}
        today="2026-06-15"
        visibleGroupIds={["group-thesis"]}
      />,
    );

    expect(screen.getByText("Future draft")).toBeTruthy();
    expect(screen.getByText("Final submission")).toBeTruthy();
    expect(screen.getAllByText("Thesis")).toHaveLength(4);
    expect(screen.getByText("Past draft")).toBeTruthy();
    expect(screen.getByText("Completed review")).toBeTruthy();
    expect(screen.getByLabelText("Overdue")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Show past" })).toBeNull();
    expect(
      screen.getAllByRole("separator", { name: /Year/ })
        .map((marker) => marker.getAttribute("aria-label")),
    ).toEqual(["Year 2025", "Year 2026", "Year 2027"]);
    const past = screen.getByText("Past draft");
    const today = screen.getByText("Today");
    const future = screen.getByText("Future draft");
    expect(past.compareDocumentPosition(today) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(today.compareDocumentPosition(future) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Open Future draft" }),
    );
    expect(onSelect).toHaveBeenCalledWith("future");
  });

  it.each([
    { height: 500, content: 1500, marker: 600, expected: 580 },
    { height: 500, content: 900, marker: 600, expected: 400 },
    { height: 1000, content: 900, marker: 600, expected: 0 },
  ])("restores layout with viewport $height and content $content", async ({
    height, content, marker, expected,
  }) => {
    const user = userEvent.setup();
    const { container } = render(
      <TimelineView groups={groups} onSelect={vi.fn()} today="2026-06-15"
        visibleGroupIds={["group-thesis"]} />,
    );
    const canvas = container.querySelector(".timelineCanvas") as HTMLDivElement;
    const today = container.querySelector(".todayMarker") as HTMLDivElement;
    Object.defineProperty(canvas, "clientHeight", { value: height });
    Object.defineProperty(canvas, "scrollHeight", { value: content });
    vi.spyOn(canvas, "getBoundingClientRect").mockImplementation(() => ({ top: 100 } as DOMRect));
    vi.spyOn(today, "getBoundingClientRect").mockImplementation(
      () => ({ top: 100 + marker - canvas.scrollTop } as DOMRect),
    );
    canvas.scrollTop = 123;
    await user.click(screen.getByRole("button", { name: "Back to today" }));
    expect(canvas.scrollTop).toBe(expected);
    canvas.scrollTop = 50;
    await user.click(screen.getByRole("button", { name: "Back to today" }));
    expect(canvas.scrollTop).toBe(expected);
  });

  it("prefills a new milestone with today and the first visible group", async () => {
    const user = userEvent.setup();
    render(
      <TimelineView
        groups={groups}
        onSelect={vi.fn()}
        today="2026-06-15"
        visibleGroupIds={["group-thesis"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New milestone" }));
    expect(screen.getByLabelText("Date")).toHaveProperty(
      "value",
      "2026-06-15",
    );
    await user.type(screen.getByLabelText("Short title"), "First draft");
    await user.click(screen.getByRole("button", { name: "Create milestone" }));

    expect(createMilestone).toHaveBeenCalledWith({
      date: "2026-06-15",
      groupId: "group-thesis",
      title: "First draft",
    });
  });
});
