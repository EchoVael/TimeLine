import type { MilestoneStatus } from "@timemagic/shared";

const labels: Record<MilestoneStatus, string> = {
  cancelled: "Cancelled",
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
};

export function StatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <span className={`statusBadge statusBadge--${status}`}>
      {labels[status]}
    </span>
  );
}
