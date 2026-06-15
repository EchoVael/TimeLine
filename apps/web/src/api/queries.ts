import type { Group, Milestone } from "@timemagic/shared";
import { useQuery } from "@tanstack/react-query";

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
