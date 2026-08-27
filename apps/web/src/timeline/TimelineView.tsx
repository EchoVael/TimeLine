import { Fragment, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Group, LocalDate, Milestone } from "@timemagic/shared";
import { CalendarDays } from "lucide-react";

import {
  useMilestones,
  useReorderMilestones,
} from "../api/queries.js";
import { MilestoneForm } from "../milestones/MilestoneForm.js";
import { TimelineFilters } from "./TimelineFilters.js";
import { TimelineRow } from "./TimelineRow.js";
import { TimelineYearMarker } from "./TimelineYearMarker.js";
import {
  startsTimelineYear,
  timelineYear,
} from "./timeline-utils.js";

interface TimelineViewProps {
  groups: Group[];
  onSelect: (milestoneId: string) => void;
  today: LocalDate;
  visibleGroupIds: string[];
}

export function TimelineView({
  groups,
  onSelect,
  today,
  visibleGroupIds,
}: TimelineViewProps) {
  const milestones = useMilestones({
    includeCancelled: true,
    includeCompleted: true,
    includePast: true,
  });
  const reorder = useReorderMilestones();
  const [showPast, setShowPast] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const allItems = milestones.data?.items ?? [];
  const visibleGroups = groups.filter(({ id }) =>
    visibleGroupIds.includes(id),
  );
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const visibleItems = useMemo(
    () =>
      allItems.filter(
        (milestone) =>
          visibleGroupIds.includes(milestone.groupId) &&
          (showPast || milestone.date >= today) &&
          (showCompleted || milestone.status !== "completed") &&
          milestone.status !== "cancelled",
      ),
    [allItems, showCompleted, showPast, today, visibleGroupIds],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }
    const active = allItems.find(({ id }) => id === event.active.id);
    const over = allItems.find(({ id }) => id === event.over?.id);
    if (!active || !over || active.date !== over.date) {
      return;
    }
    const sameDay = allItems.filter(({ date }) => date === active.date);
    const oldIndex = sameDay.findIndex(({ id }) => id === active.id);
    const newIndex = sameDay.findIndex(({ id }) => id === over.id);
    const ordered = arrayMove(sameDay, oldIndex, newIndex);
    await reorder.mutateAsync({
      date: active.date,
      expectedVersions: Object.fromEntries(
        sameDay.map(({ id, version }) => [id, version]),
      ),
      orderedIds: ordered.map(({ id }) => id),
    });
  }

  return (
    <div className="timelineView">
      <TimelineFilters
        onNew={() => setCreating(true)}
        onShowCompletedChange={setShowCompleted}
        onShowPastChange={setShowPast}
        showCompleted={showCompleted}
        showPast={showPast}
      />
      <div className="timelineCanvas">
        <div className="todayMarker">
          <span>Today</span>
        </div>
        {milestones.isLoading ? (
          <div className="emptyState emptyState--large">
            <p>Loading milestones...</p>
          </div>
        ) : visibleItems.length ? (
          <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext
              items={visibleItems.map(({ id }) => id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="timelineList">
                {visibleItems.map((milestone, index) => {
                  const group = groupMap.get(milestone.groupId);
                  if (!group) {
                    return null;
                  }
                  const previousDate = visibleItems[index - 1]?.date;
                  return (
                    <Fragment key={milestone.id}>
                      {startsTimelineYear(
                        milestone.date,
                        previousDate,
                      ) ? (
                        <TimelineYearMarker
                          year={timelineYear(milestone.date)}
                        />
                      ) : null}
                      <TimelineRow
                        group={group}
                        milestone={milestone}
                        onSelect={() => onSelect(milestone.id)}
                      />
                    </Fragment>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="emptyState emptyState--large">
            <CalendarDays aria-hidden size={22} />
            <p>No milestones match the current filters.</p>
          </div>
        )}
      </div>
      {creating ? (
        <MilestoneForm
          defaultDate={today}
          groups={visibleGroups}
          onCancel={() => setCreating(false)}
        />
      ) : null}
    </div>
  );
}
