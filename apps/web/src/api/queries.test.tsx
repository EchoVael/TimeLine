import type { PropsWithChildren } from "react";
import type { DailyNoteSummary, Milestone } from "@timemagic/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./client.js";
import { useCreateMilestone, useDailyNote, useDeleteMilestone, useUpdateMilestone } from "./queries.js";

vi.mock("./client.js", () => ({ apiRequest: vi.fn() }));
afterEach(() => vi.resetAllMocks());

const milestone: Milestone = {
  id: "task", documentId: "doc", groupId: "group", title: "Draft",
  date: "2026-06-16", dayOrder: 0, status: "not_started",
  completedOn: null, overdue: false, version: 1,
};

function summary(date: DailyNoteSummary["date"], items: Milestone[]): DailyNoteSummary {
  return { date, documentId: null, exists: false, version: null,
    groupIds: [], recycledGroupIds: [], dueMilestones: items.filter((item) => item.date === date) };
}

describe("milestone changes in calendar day details", () => {
  it.each(["create", "move", "delete"] as const)("refreshes day details after %s", async (operation) => {
    let items = operation === "create" ? [] : [milestone];
    vi.mocked(apiRequest).mockImplementation(async (path, init) => {
      if (!init) return summary(path.endsWith("17") ? "2026-06-17" : "2026-06-16", items);
      if (operation === "create") items = [milestone];
      if (operation === "move") items = [{ ...milestone, date: "2026-06-17" }];
      if (operation === "delete") items = [];
      return operation === "create" ? { milestone } : items[0] ?? { deleted: true, id: milestone.id };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => ({
      oldDay: useDailyNote("2026-06-16"), newDay: useDailyNote("2026-06-17"),
      create: useCreateMilestone(), update: useUpdateMilestone(milestone.id), remove: useDeleteMilestone(milestone.id),
    }), { wrapper });
    await waitFor(() => expect(result.current.oldDay.isSuccess && result.current.newDay.isSuccess).toBe(true));
    await act(async () => {
      if (operation === "create") await result.current.create.mutateAsync({ title: milestone.title, date: milestone.date, groupId: milestone.groupId });
      if (operation === "move") await result.current.update.mutateAsync({ date: "2026-06-17", expectedVersion: 1 });
      if (operation === "delete") await result.current.remove.mutateAsync(1);
    });
    await waitFor(() => {
      expect(result.current.oldDay.data?.dueMilestones.map(({ id }) => id)).toEqual(operation === "create" ? [milestone.id] : []);
      expect(result.current.newDay.data?.dueMilestones.map(({ id }) => id)).toEqual(operation === "move" ? [milestone.id] : []);
    });
    unmount();
    client.clear();
  });
});
