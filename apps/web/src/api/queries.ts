import type {
  CreateGroupRequest,
  Group,
  Milestone,
  ReorderGroupsRequest,
  UpdateGroupRequest,
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

export function useMilestones() {
  return useQuery({
    queryFn: () => apiRequest<ListResponse<Milestone>>("/milestones"),
    queryKey: ["milestones"],
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
