import type { Group } from "@timemagic/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupDetails } from "./GroupDetails.js";

const archiveGroup = vi.fn();
const unarchiveGroup = vi.fn();
const updateGroup = vi.fn();

vi.mock("../api/queries.js", () => ({
  useArchiveGroup: () => ({
    isPending: false,
    mutateAsync: archiveGroup,
  }),
  useUnarchiveGroup: () => ({
    isPending: false,
    mutateAsync: unarchiveGroup,
  }),
  useUpdateGroup: () => ({
    isPending: false,
    mutateAsync: updateGroup,
  }),
}));

const archivedGroup: Group = {
  archivedAt: "2026-06-15T19:06:56.849Z",
  color: "#d1495b",
  description: "",
  id: "group-thesis",
  name: "Thesis",
  sortOrder: 0,
  version: 2,
};

describe("GroupDetails", () => {
  beforeEach(() => {
    archiveGroup.mockReset();
    unarchiveGroup.mockReset();
    updateGroup.mockReset();
  });

  it("restores an archived project", async () => {
    const user = userEvent.setup();
    render(<GroupDetails group={archivedGroup} />);

    expect(
      screen.queryByRole("button", { name: "Archive project" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Unarchive project" }),
    );

    expect(unarchiveGroup).toHaveBeenCalledWith(2);
  });
});
