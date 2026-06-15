import type {
  CalendarMonthResponse,
  MilestoneStatus,
  WeekStart,
} from "@timemagic/shared";
import {
  calendarDates,
  calendarDisplayRange,
} from "@timemagic/shared";

import { DailyNoteRepository } from "../daily-notes/daily-note.repository.js";
import { MilestoneRepository } from "../milestones/milestone.repository.js";

export interface CalendarQuery {
  groupIds: string[];
  statuses: MilestoneStatus[];
  weekStart: WeekStart;
}

export class CalendarService {
  constructor(
    private readonly milestones: MilestoneRepository,
    private readonly dailyNotes: DailyNoteRepository,
  ) {}

  month(
    year: number,
    month: number,
    query: CalendarQuery,
  ): CalendarMonthResponse {
    const dates = calendarDates(year, month, query.weekStart);
    const range = calendarDisplayRange(year, month, query.weekStart);
    const dailyDates = new Set(
      this.dailyNotes.listRange(range.from, range.to).map(({ date }) => date),
    );
    const milestonesByDate = new Map<
      string,
      ReturnType<MilestoneRepository["listRange"]>
    >();

    for (const milestone of this.milestones
      .listRange(range.from, range.to)
      .filter(
        ({ groupId }) =>
          query.groupIds.length === 0 ||
          query.groupIds.includes(groupId),
      )
      .filter(
        ({ status }) =>
          query.statuses.length === 0 ||
          query.statuses.includes(status),
      )) {
      const current = milestonesByDate.get(milestone.date) ?? [];
      current.push(milestone);
      milestonesByDate.set(milestone.date, current);
    }

    return {
      days: dates.map((date) => {
        const milestones = milestonesByDate.get(date) ?? [];
        return {
          date,
          firstMilestoneTitle: milestones[0]?.title ?? null,
          groupIds: [
            ...new Set(milestones.map(({ groupId }) => groupId)),
          ],
          hasDailyNote: dailyDates.has(date),
          milestoneCount: milestones.length,
          overflowCount: Math.max(0, milestones.length - 1),
        };
      }),
      month,
      year,
    };
  }
}
