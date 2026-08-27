import { useEffect, useState, type FormEvent } from "react";
import type {
  Group,
  LocalDate,
  Milestone,
  MilestoneStatus,
} from "@timemagic/shared";

import { useDeleteMilestone, useUpdateMilestone } from "../api/queries.js";

export function MilestoneDetails({
  groups,
  milestone,
  onDeleted,
}: {
  groups: Group[];
  milestone: Milestone;
  onDeleted?: () => void;
}) {
  const update = useUpdateMilestone(milestone.id);
  const deleteMilestone = useDeleteMilestone(milestone.id);
  const [title, setTitle] = useState(milestone.title);
  const [date, setDate] = useState<LocalDate>(milestone.date);
  const [groupId, setGroupId] = useState(milestone.groupId);
  const [status, setStatus] = useState<MilestoneStatus>(milestone.status);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(milestone.title);
    setDate(milestone.date);
    setGroupId(milestone.groupId);
    setStatus(milestone.status);
    setConfirmDelete(false);
  }, [milestone]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await update.mutateAsync({
      date,
      expectedVersion: milestone.version,
      groupId,
      status,
      title: title.trim(),
    });
  }

  async function confirmDeleteMilestone() {
    await deleteMilestone.mutateAsync(milestone.version);
    onDeleted?.();
  }

  return (
    <form className="detailsForm" onSubmit={submit}>
      <label>
        <span>Short title</span>
        <input
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </label>
      <label>
        <span>Date</span>
        <input
          onChange={(event) => setDate(event.target.value as LocalDate)}
          type="date"
          value={date}
        />
      </label>
      <label>
        <span>Project</span>
        <select
          onChange={(event) => setGroupId(event.target.value)}
          value={groupId}
        >
          {groups.map((group) => (
            <option
              disabled={
                Boolean(group.archivedAt) && group.id !== milestone.groupId
              }
              key={group.id}
              value={group.id}
            >
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select
          onChange={(event) =>
            setStatus(event.target.value as MilestoneStatus)
          }
          value={status}
        >
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      {milestone.completedOn ? (
        <div className="propertyReadout">
          <span>Completed</span>
          <strong>{milestone.completedOn}</strong>
        </div>
      ) : null}
      {milestone.overdue ? (
        <div className="overdueNotice">Overdue and unfinished</div>
      ) : null}
      <button
        className="primaryButton"
        disabled={update.isPending || !title.trim()}
        type="submit"
      >
        Save milestone
      </button>
      {confirmDelete ? (
        <div className="deleteConfirmation">
          <p>Delete this milestone from the timeline?</p>
          <div className="inlineActions">
            <button
              className="dangerButton"
              disabled={deleteMilestone.isPending}
              onClick={() => void confirmDeleteMilestone()}
              type="button"
            >
              Confirm delete
            </button>
            <button
              className="textButton"
              disabled={deleteMilestone.isPending}
              onClick={() => setConfirmDelete(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="dangerButton"
          disabled={deleteMilestone.isPending}
          onClick={() => setConfirmDelete(true)}
          type="button"
        >
          Delete milestone
        </button>
      )}
      <div className="documentPlaceholder">
        Markdown editing arrives in the next development slice.
      </div>
    </form>
  );
}
