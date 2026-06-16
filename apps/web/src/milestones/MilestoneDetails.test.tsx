import type { Group, Milestone } from "@timemagic/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MilestoneDetails } from "./MilestoneDetails.js";

const deleteMilestone = vi.fn();
const updateMilestone = vi.fn();

vi.mock("../api/queries.js", () => ({
  useDeleteMilestone: () => ({
    isPending: false,
    mutateAsync: deleteMilestone,
  }),
  useUpdateMilestone: () => ({
    isPending: false,
    mutateAsync: updateMilestone,
  }),
}));

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

const milestone: Milestone = {
  completedOn: null,
  date: "2027-01-03",
  dayOrder: 0,
  documentId: "doc-final",
  groupId: "group-thesis",
  id: "milestone-final",
  overdue: false,
  status: "not_started",
  title: "Final submission",
  version: 2,
};

describe("MilestoneDetails", () => {
  beforeEach(() => {
    deleteMilestone.mockReset();
    updateMilestone.mockReset();
  });

  it("confirms before deleting a milestone", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(
      <MilestoneDetails
        groups={groups}
        milestone={milestone}
        onDeleted={onDeleted}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete milestone" }));
    expect(
      screen.getByText("Delete this milestone from the timeline?"),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByText("Delete this milestone from the timeline?"),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Delete milestone" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(deleteMilestone).toHaveBeenCalledWith(2);
    expect(onDeleted).toHaveBeenCalledOnce();
  });
});
