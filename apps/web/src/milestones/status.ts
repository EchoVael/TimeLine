import type { MilestoneStatus } from "@timemagic/shared";

export const statusLabels: Record<MilestoneStatus, string> = {
  cancelled: "Cancelled",
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
};
