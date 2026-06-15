import type {
  CalendarMonthResponse,
  CreateMilestoneRequest,
  CreateGroupRequest,
  DailyNoteSummary,
  DocumentPayload,
  Group,
  Milestone,
  NewDailyDocumentDraft,
  ReorderGroupsRequest,
  ReorderMilestonesRequest,
  SaveDailyDocumentRequest,
  UpdateMilestoneRequest,
  UpdateGroupRequest,
  UpdateDailyNoteGroupsRequest,
  WeekStart,
} from "@timemagic/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./client.js";

interface ListResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export function useGroups() {
  return useQuery({
    queryFn: () => apiRequest<ListResponse<Group>>("/groups"),
    queryKey: ["groups"],
  });
}

interface MilestoneFilters {
  groupIds?: string[];
  includeCancelled?: boolean;
  includeCompleted?: boolean;
  includePast?: boolean;
}

export function useMilestones(filters: MilestoneFilters = {}) {
  const params = new URLSearchParams();
  filters.groupIds?.forEach((groupId) => params.append("groupId", groupId));
  if (filters.includeCancelled) params.set("includeCancelled", "true");
  if (filters.includeCompleted) params.set("includeCompleted", "true");
  if (filters.includePast) params.set("includePast", "true");
  const query = params.toString();

  return useQuery({
    queryFn: () =>
      apiRequest<ListResponse<Milestone>>(
        `/milestones${query ? `?${query}` : ""}`,
      ),
    queryKey: ["milestones", filters],
  });
}

export function useCalendar(
  year: number,
  month: number,
  weekStart: WeekStart,
  groupIds: string[],
) {
  const params = new URLSearchParams({ weekStart });
  groupIds.forEach((groupId) => params.append("groupId", groupId));
  return useQuery({
    queryFn: () =>
      apiRequest<CalendarMonthResponse>(
        `/calendar/${year}/${month}?${params.toString()}`,
      ),
    queryKey: ["calendar", year, month, weekStart, groupIds],
  });
}

export function useDailyNote(date: string) {
  return useQuery({
    queryFn: () => apiRequest<DailyNoteSummary>(`/daily-notes/${date}`),
    queryKey: ["daily-note", date],
  });
}

export function useDailyDocument(date: string) {
  return useQuery({
    queryFn: () =>
      apiRequest<DocumentPayload | NewDailyDocumentDraft>(
        `/daily-notes/${date}/document`,
      ),
    queryKey: ["daily-document", date],
  });
}

export function useSaveDailyDocument(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDailyDocumentRequest) =>
      apiRequest<DocumentPayload>(`/daily-notes/${date}/document`, {
        body: JSON.stringify(input),
        method: "PUT",
      }),
    onSuccess: async (document) => {
      queryClient.setQueryData(["daily-document", date], document);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["daily-note", date] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      ]);
    },
  });
}

export function useUpdateDailyNoteGroups(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDailyNoteGroupsRequest) =>
      apiRequest<DailyNoteSummary>(`/daily-notes/${date}/groups`, {
        body: JSON.stringify(input),
        method: "PATCH",
      }),
    onSuccess: async (summary) => {
      queryClient.setQueryData(["daily-note", date], summary);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["daily-document", date],
        }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      ]);
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupRequest) =>
      apiRequest<Group>("/groups", {
        body: JSON.stringify(input),
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupRequest) =>
      apiRequest<Group>(`/groups/${groupId}`, {
        body: JSON.stringify(input),
        method: "PATCH",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["milestones"] }),
      ]);
    },
  });
}

export function useArchiveGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expectedVersion: number) =>
      apiRequest<Group>(`/groups/${groupId}/archive`, {
        body: JSON.stringify({ expectedVersion }),
        method: "POST",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["milestones"] }),
      ]);
    },
  });
}

export function useReorderGroups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderGroupsRequest) =>
      apiRequest<ListResponse<Group>>("/groups/order", {
        body: JSON.stringify(input),
        method: "PUT",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneRequest) =>
      apiRequest<{ milestone: Milestone }>("/milestones", {
        body: JSON.stringify(input),
        method: "POST",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["milestones"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      ]);
    },
  });
}

export function useUpdateMilestone(milestoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMilestoneRequest) =>
      apiRequest<Milestone>(`/milestones/${milestoneId}`, {
        body: JSON.stringify(input),
        method: "PATCH",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["milestones"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      ]);
    },
  });
}

export function useReorderMilestones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderMilestonesRequest) =>
      apiRequest<ListResponse<Milestone>>("/milestones/day-order", {
        body: JSON.stringify(input),
        method: "PUT",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}
