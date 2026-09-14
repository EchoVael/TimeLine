import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
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
          milestone.status !== "cancelled",
      ),
    [allItems, visibleGroupIds],
  );
  const entries: { date: LocalDate; milestone?: Milestone }[] = [
    ...visibleItems
      .filter((item) => item.date < today)
      .map((milestone) => ({ date: milestone.date, milestone })),
    { date: today },
    ...visibleItems
      .filter((item) => item.date >= today)
      .map((milestone) => ({ date: milestone.date, milestone })),
  ];

  function positionToday() {
    const canvas = canvasRef.current;
    const marker = todayRef.current;
    if (!canvas || !marker || !canvas.clientHeight) return;
    const markerTop = marker.getBoundingClientRect().top
      - canvas.getBoundingClientRect().top + canvas.scrollTop;
    // Spare space below today is filled by recent history above it.
    canvas.scrollTop = Math.max(
      0,
      Math.min(markerTop - 20, canvas.scrollHeight - canvas.clientHeight),
    );
  }

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const list = listRef.current;
    if (!canvas || !list) return;
    positionToday();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(positionToday);
    observer.observe(canvas);
    observer.observe(list);
    return () => observer.disconnect();
  }, [visibleItems, today, milestones.isLoading]);

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
        onToday={positionToday}
      />
      <div className="timelineCanvas" ref={canvasRef}>
        {milestones.isLoading ? (
          <div className="emptyState emptyState--large">
            <p>Loading milestones...</p>
          </div>
        ) : (
          <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext
              items={visibleItems.map(({ id }) => id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="timelineList" ref={listRef}>
                {entries.map(({ date, milestone }, index) => {
                  const group = milestone
                    ? groupMap.get(milestone.groupId)
                    : undefined;
                  const previousDate = entries[index - 1]?.date;
                  return (
                    <Fragment key={milestone?.id ?? "today"}>
                      {startsTimelineYear(date, previousDate) ? (
                        <TimelineYearMarker year={timelineYear(date)} />
                      ) : null}
                      {!milestone ? (
                        <div className="todayMarker" ref={todayRef}>
                          <span>Today</span>
                        </div>
                      ) : group ? (
                        <TimelineRow
                          group={group}
                          milestone={milestone}
                          onSelect={() => onSelect(milestone.id)}
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
                {!visibleItems.length ? (
                  <div className="emptyState emptyState--large">
                    <CalendarDays aria-hidden size={22} />
                    <p>No milestones in the selected projects.</p>
                  </div>
                ) : null}
              </div>
            </SortableContext>
          </DndContext>
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
