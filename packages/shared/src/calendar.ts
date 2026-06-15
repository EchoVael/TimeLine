import { z } from "zod";

import { localDateSchema, type LocalDate } from "./dates.js";
import { idSchema } from "./groups.js";

export const weekStartSchema = z.enum(["monday", "sunday"]);
export type WeekStart = z.infer<typeof weekStartSchema>;

function formatUtcDate(date: Date): LocalDate {
  return date.toISOString().slice(0, 10) as LocalDate;
}

export function calendarDates(
  year: number,
  month: number,
  weekStart: WeekStart,
): LocalDate[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = firstOfMonth.getUTCDay();
  const startOffset =
    weekStart === "monday"
      ? (firstWeekday + 6) % 7
      : firstWeekday;
  const firstDisplayed = new Date(firstOfMonth);
  firstDisplayed.setUTCDate(firstDisplayed.getUTCDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstDisplayed);
    date.setUTCDate(firstDisplayed.getUTCDate() + index);
    return formatUtcDate(date);
  });
}

export function calendarDisplayRange(
  year: number,
  month: number,
  weekStart: WeekStart,
): { from: LocalDate; to: LocalDate } {
  const dates = calendarDates(year, month, weekStart);
  return {
    from: dates[0] as LocalDate,
    to: dates[41] as LocalDate,
  };
}

export const calendarDaySchema = z.object({
  date: localDateSchema,
  milestoneCount: z.number().int().nonnegative(),
  firstMilestoneTitle: z.string().nullable(),
  groupIds: z.array(idSchema),
  overflowCount: z.number().int().nonnegative(),
  hasDailyNote: z.boolean(),
});

export const calendarMonthResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  days: z.array(calendarDaySchema).length(42),
});

export type CalendarDay = z.infer<typeof calendarDaySchema>;
export type CalendarMonthResponse = z.infer<
  typeof calendarMonthResponseSchema
>;
