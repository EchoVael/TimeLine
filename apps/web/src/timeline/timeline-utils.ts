import type { LocalDate } from "@timemagic/shared";

export function timelineYear(date: LocalDate): number {
  return Number(date.slice(0, 4));
}

export function startsTimelineYear(
  date: LocalDate,
  previousDate: LocalDate | undefined,
): boolean {
  return (
    previousDate === undefined ||
    timelineYear(date) !== timelineYear(previousDate)
  );
}

export function formatTimelineDate(date: LocalDate): string {
  const year = timelineYear(date);
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}
