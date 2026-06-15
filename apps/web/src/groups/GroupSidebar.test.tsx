import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupSidebar } from "./GroupSidebar.js";

const createGroup = vi.fn();
const reorderGroups = vi.fn();

vi.mock("../api/queries.js", () => ({
  useCreateGroup: () => ({ isPending: false, mutateAsync: createGroup }),
  useGroups: () => ({
    data: {
      items: [
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
          color: "#2a9d8f",
          description: "",
          id: "group-visa",
          name: "Visa",
          sortOrder: 1,
          version: 1,
        },
      ],
      nextCursor: null,
    },
    isLoading: false,
  }),
  useReorderGroups: () => ({ mutateAsync: reorderGroups }),
}));

describe("GroupSidebar", () => {
  beforeEach(() => {
    createGroup.mockReset();
    reorderGroups.mockReset();
  });

  it("creates a trimmed group from the visible form", async () => {
    const user = userEvent.setup();
    render(
      <GroupSidebar
        onSelect={vi.fn()}
        onVisibleGroupIdsChange={vi.fn()}
        selectedGroupId={null}
        visibleGroupIds={["group-thesis", "group-visa"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Project name"), "  Research  ");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(createGroup).toHaveBeenCalledWith({
      color: "#177d67",
      name: "Research",
    });
  });

  it("keeps visibility, selection, and only-this-group as separate actions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onVisibleGroupIdsChange = vi.fn();

    render(
      <GroupSidebar
        onSelect={onSelect}
        onVisibleGroupIdsChange={onVisibleGroupIdsChange}
        selectedGroupId={null}
        visibleGroupIds={["group-thesis", "group-visa"]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Show Thesis" }));
    expect(onVisibleGroupIdsChange).toHaveBeenLastCalledWith(["group-visa"]);
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Open Thesis" }));
    expect(onSelect).toHaveBeenCalledWith("group-thesis");

    await user.click(screen.getByRole("button", { name: "Only Thesis" }));
    expect(onVisibleGroupIdsChange).toHaveBeenLastCalledWith(["group-thesis"]);
  });
});
