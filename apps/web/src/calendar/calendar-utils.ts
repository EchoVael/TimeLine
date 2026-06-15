import type { LocalDate } from "@timemagic/shared";

export interface CalendarCursor {
  month: number;
  year: number;
}

export const calendarMonths = Array.from({ length: 12 }, (_, index) => ({
  label: new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, index, 1))),
  value: index + 1,
}));

export function cursorFromDate(date: LocalDate): CalendarCursor {
  return {
    month: Number(date.slice(5, 7)),
    year: Number(date.slice(0, 4)),
  };
}

export function shiftMonth(
  cursor: CalendarCursor,
  offset: number,
): CalendarCursor {
  const date = new Date(
    Date.UTC(cursor.year, cursor.month - 1 + offset, 1),
  );
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

export function monthTitle(cursor: CalendarCursor): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(cursor.year, cursor.month - 1, 1)));
}

export function calendarYearOptions(
  cursorYear: number,
  radius = 10,
): number[] {
  return Array.from(
    { length: radius * 2 + 1 },
    (_, index) => cursorYear - radius + index,
  );
}
