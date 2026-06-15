import { useState } from "react";
import type { Group, LocalDate } from "@timemagic/shared";

import {
  useDailyDocument,
  useDailyNote,
  useUpdateDailyNoteGroups,
} from "../api/queries.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { DailyEditor } from "./DailyEditor.js";

interface DailyDetailsProps {
  date: LocalDate;
  groups: Group[];
}

function dateTitle(date: LocalDate): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function DailyDetails({ date, groups }: DailyDetailsProps) {
  const summary = useDailyNote(date);
  const document = useDailyDocument(date);
  const updateGroups = useUpdateDailyNoteGroups(date);
  const [groupError, setGroupError] = useState<string | null>(null);
  const selectedGroupIds = new Set(summary.data?.groupIds ?? []);

  async function toggleGroup(groupId: string, selected: boolean) {
    if (!summary.data) {
      return;
    }
    try {
      await updateGroups.mutateAsync({
        addGroupIds: selected ? [] : [groupId],
        expectedVersion: summary.data.version,
        removeGroupIds: selected ? [groupId] : [],
      });
      setGroupError(null);
    } catch {
      setGroupError("Could not update projects.");
    }
  }

  return (
    <div className="dailyDetails">
      <div className="dailyDetailsHeader">
        <span className="eyebrow">Daily note</span>
        <h2>{dateTitle(date)}</h2>
      </div>

      <section className="dailySection">
        <h3>Projects</h3>
        <div className="dailyGroupList">
          {groups.map((group) => {
            const selected = selectedGroupIds.has(group.id);
            return (
              <label className="dailyGroupOption" key={group.id}>
                <input
                  checked={selected}
                  disabled={updateGroups.isPending}
                  onChange={() => void toggleGroup(group.id, selected)}
                  type="checkbox"
                />
                <span
                  className="groupSwatch"
                  style={{ backgroundColor: group.color }}
                />
                <span>{group.name}</span>
              </label>
            );
          })}
        </div>
        {groupError ? (
          <p className="dailyInlineError" role="alert">
            {groupError}
          </p>
        ) : null}
      </section>

      <section className="dailySection">
        <h3>Due this day</h3>
        {summary.data?.dueMilestones.length ? (
          <div className="dailyMilestoneList">
            {summary.data.dueMilestones.map((milestone) => (
              <div className="dailyMilestone" key={milestone.id}>
                <span>{milestone.title}</span>
                <StatusBadge status={milestone.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="dailySectionEmpty">No milestones due.</p>
        )}
      </section>

      {document.data ? (
        <DailyEditor date={date} document={document.data} />
      ) : (
        <div className="emptyState">
          <p>Loading daily note...</p>
        </div>
      )}
    </div>
  );
}
