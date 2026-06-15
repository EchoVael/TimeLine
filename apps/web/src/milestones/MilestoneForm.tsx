import { useState, type FormEvent } from "react";
import type { Group, LocalDate } from "@timemagic/shared";

import { useCreateMilestone } from "../api/queries.js";

interface MilestoneFormProps {
  defaultDate: LocalDate;
  groups: Group[];
  onCancel: () => void;
}

export function MilestoneForm({
  defaultDate,
  groups,
  onCancel,
}: MilestoneFormProps) {
  const create = useCreateMilestone();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<LocalDate>(defaultDate);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !groupId) {
      return;
    }
    await create.mutateAsync({ date, groupId, title: trimmedTitle });
    onCancel();
  }

  return (
    <div aria-label="New milestone" className="modalBackdrop" role="dialog">
      <form className="modalPanel" onSubmit={submit}>
        <div className="modalHeader">
          <h2>New milestone</h2>
          <p>Add a dated checkpoint to the timeline.</p>
        </div>
        <label>
          <span>Short title</span>
          <input
            autoFocus
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
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <div className="formActions">
          <button className="textButton" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="primaryButton"
            disabled={create.isPending || !title.trim() || !groupId}
            type="submit"
          >
            Create milestone
          </button>
        </div>
      </form>
    </div>
  );
}
