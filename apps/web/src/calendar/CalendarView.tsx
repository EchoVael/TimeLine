import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, LocalDate } from "@timemagic/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCalendar } from "../api/queries.js";
import { IconButton } from "../components/IconButton.js";
import { MilestoneForm } from "../milestones/MilestoneForm.js";
import { CalendarDayCell } from "./CalendarDayCell.js";
import {
  calendarMonths,
  calendarYearOptions,
  cursorFromDate,
  monthTitle,
  shiftMonth,
} from "./calendar-utils.js";

interface CalendarViewProps {
  groups: Group[];
  initialDate?: LocalDate;
  onSelectDate: (date: LocalDate) => void;
  selectedDate: LocalDate | null;
  today: LocalDate;
  visibleGroupIds: string[];
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({
  groups,
  initialDate,
  onSelectDate,
  selectedDate,
  today,
  visibleGroupIds,
}: CalendarViewProps) {
  const cursorDate = initialDate ?? today;
  const todayCursor = cursorFromDate(today);
  const [cursor, setCursor] = useState(() => cursorFromDate(cursorDate));
  const lastInitialDate = useRef(cursorDate);
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
  const yearOptions = calendarYearOptions(cursor.year);

  useEffect(() => {
    if (lastInitialDate.current !== cursorDate) {
      lastInitialDate.current = cursorDate;
      setCursor(cursorFromDate(cursorDate));
    }
  }, [cursorDate]);

  function handleYearChange(event: ChangeEvent<HTMLSelectElement>) {
    const year = Number(event.currentTarget.value);
    if (Number.isInteger(year) && year > 0) {
      setCursor((current) => ({ ...current, year }));
    }
  }

  function handleMonthChange(event: ChangeEvent<HTMLSelectElement>) {
    const month = Number(event.currentTarget.value);
    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      setCursor((current) => ({ ...current, month }));
    }
  }

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
        <div className="calendarPeriodControls">
          <label>
            <span>Year</span>
            <select
              aria-label="Year"
              onChange={handleYearChange}
              value={cursor.year}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Month</span>
            <select
              aria-label="Month"
              onChange={handleMonthChange}
              value={cursor.month}
            >
              {calendarMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
        </div>
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
