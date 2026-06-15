import { z } from "zod";

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealCalendarDate(value: string): boolean {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export const localDateSchema = z
  .string()
  .regex(LOCAL_DATE_PATTERN, "Expected YYYY-MM-DD")
  .refine(isRealCalendarDate, "Expected a real calendar date");

export type LocalDate = z.infer<typeof localDateSchema>;
