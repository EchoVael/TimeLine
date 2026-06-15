import type {
  CalendarDay,
  Group,
  LocalDate,
} from "@timemagic/shared";
import { FileText, Plus } from "lucide-react";

interface CalendarDayCellProps {
  day: CalendarDay;
  displayMonth: number;
  groupMap: Map<string, Group>;
  onAddMilestone: (date: LocalDate) => void;
  onSelect: (date: LocalDate) => void;
  selected: boolean;
  today: LocalDate;
}

export function CalendarDayCell({
  day,
  displayMonth,
  groupMap,
  onAddMilestone,
  onSelect,
  selected,
  today,
}: CalendarDayCellProps) {
  const month = Number(day.date.slice(5, 7));
  const dayNumber = Number(day.date.slice(8, 10));

  return (
    <div
      className="calendarDay"
      data-outside={month !== displayMonth}
      data-selected={selected}
      data-today={day.date === today}
      role="gridcell"
    >
      <button
        aria-label={`Open ${day.date}`}
        className="calendarDayTarget"
        onClick={() => onSelect(day.date)}
        type="button"
      >
        <span className="calendarDayNumber">{dayNumber}</span>
        {day.firstMilestoneTitle ? (
          <span className="calendarMilestoneTitle">
            {day.firstMilestoneTitle}
          </span>
        ) : (
          <span className="calendarMilestoneTitle" aria-hidden>
            &nbsp;
          </span>
        )}
        <span className="calendarDayMeta">
          <span className="calendarGroupMarkers">
            {day.groupIds.slice(0, 3).map((groupId) => {
              const group = groupMap.get(groupId);
              return group ? (
                <span
                  aria-label={group.name}
                  className="calendarGroupMarker"
                  key={group.id}
                  style={{ backgroundColor: group.color }}
                />
              ) : null;
            })}
          </span>
          {day.overflowCount > 0 ? (
            <span className="calendarOverflow">+{day.overflowCount}</span>
          ) : null}
          {day.hasDailyNote ? (
            <FileText
              aria-label={`Daily note on ${day.date}`}
              className="calendarNoteMarker"
              size={12}
            />
          ) : null}
        </span>
      </button>
      <button
        aria-label={`Add milestone on ${day.date}`}
        className="calendarAddButton"
        onClick={() => onAddMilestone(day.date)}
        title="Add milestone"
        type="button"
      >
        <Plus aria-hidden size={14} />
      </button>
    </div>
  );
}
