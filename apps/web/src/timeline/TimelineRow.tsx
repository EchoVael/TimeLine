import type { Group, Milestone } from "@timemagic/shared";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical } from "lucide-react";

import { StatusBadge } from "../components/StatusBadge.js";
import { formatTimelineDate } from "./timeline-utils.js";

export function TimelineRow({
  group,
  milestone,
  onSelect,
}: {
  group: Group;
  milestone: Milestone;
  onSelect: () => void;
}) {
  const sortable = useSortable({ id: milestone.id });

  return (
    <div
      className="timelineRow"
      data-status={milestone.status}
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      <time dateTime={milestone.date}>
        {formatTimelineDate(milestone.date)}
      </time>
      <div className="timelineRail" aria-hidden>
        <span
          className="timelineDot"
          style={{ borderColor: group.color }}
        />
      </div>
      <button
        aria-label={`Open ${milestone.title}`}
        className="timelineContent"
        onClick={onSelect}
        type="button"
      >
        <span className="timelineTitleLine">
          <strong title={milestone.title}>{milestone.title}</strong>
          {milestone.overdue ? (
            <span aria-label="Overdue" className="overdueIcon">
              <AlertTriangle aria-hidden size={15} />
            </span>
          ) : null}
        </span>
        <span className="timelineMeta">
          <span
            className="groupTag"
            style={{ borderColor: group.color }}
          >
            <span
              aria-hidden
              className="groupSwatch"
              style={{ backgroundColor: group.color }}
            />
            {group.name}
          </span>
          <StatusBadge status={milestone.status} />
        </span>
      </button>
      <button
        aria-label={`Reorder ${milestone.title}`}
        className="timelineDragHandle"
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical aria-hidden size={16} />
      </button>
    </div>
  );
}
