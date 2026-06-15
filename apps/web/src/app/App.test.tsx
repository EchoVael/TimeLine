import { render, screen, within } from "@testing-library/react";
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
  useReorderMilestones: () => ({ mutateAsync: vi.fn() }),
  useReorderGroups: () => ({ mutateAsync: vi.fn() }),
}));

describe("App", () => {
  it("renders the three-pane workspace and view switcher", () => {
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
    expect(within(viewSwitcher).getByRole("button", { name: "Calendar" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
