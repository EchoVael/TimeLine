import { useMemo, useState } from "react";
import type { Group, LocalDate } from "@timemagic/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCalendar } from "../api/queries.js";
import { IconButton } from "../components/IconButton.js";
import { MilestoneForm } from "../milestones/MilestoneForm.js";
import { CalendarDayCell } from "./CalendarDayCell.js";
import {
  cursorFromDate,
  monthTitle,
  shiftMonth,
} from "./calendar-utils.js";

interface CalendarViewProps {
  groups: Group[];
  onSelectDate: (date: LocalDate) => void;
  selectedDate: LocalDate | null;
  today: LocalDate;
  visibleGroupIds: string[];
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({
  groups,
  onSelectDate,
  selectedDate,
  today,
  visibleGroupIds,
}: CalendarViewProps) {
  const todayCursor = cursorFromDate(today);
  const [cursor, setCursor] = useState(todayCursor);
  const [creatingDate, setCreatingDate] = useState<LocalDate | null>(null);
  const calendar = useCalendar(
    cursor.year,
    cursor.month,
    "monday",
    visibleGroupIds,
  );
  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  );
  const visibleGroups = groups.filter(({ id }) =>
    visibleGroupIds.includes(id),
  );

  return (
    <div className="calendarView">
      <div className="calendarToolbar">
        <div className="calendarNavigation">
          <IconButton
            icon={ChevronLeft}
            label="Previous month"
            onClick={() => setCursor((current) => shiftMonth(current, -1))}
          />
          <IconButton
            icon={ChevronRight}
            label="Next month"
            onClick={() => setCursor((current) => shiftMonth(current, 1))}
          />
          <button
            className="textButton calendarTodayButton"
            onClick={() => setCursor(todayCursor)}
            type="button"
          >
            Today
          </button>
        </div>
        <h2>{monthTitle(cursor)}</h2>
        <span className="calendarToolbarSpacer" />
      </div>

      <div aria-label={monthTitle(cursor)} className="calendarGrid" role="grid">
        {weekdays.map((weekday) => (
          <div className="calendarWeekday" key={weekday} role="columnheader">
            {weekday}
          </div>
        ))}
        {calendar.isLoading
          ? null
          : calendar.data?.days.map((day) => (
              <CalendarDayCell
                day={day}
                displayMonth={cursor.month}
                groupMap={groupMap}
                key={day.date}
                onAddMilestone={setCreatingDate}
                onSelect={onSelectDate}
                selected={day.date === selectedDate}
                today={today}
              />
            ))}
      </div>

      {creatingDate ? (
        <MilestoneForm
          defaultDate={creatingDate}
          groups={visibleGroups}
          onCancel={() => setCreatingDate(null)}
        />
      ) : null}
    </div>
  );
}
