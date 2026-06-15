import {
  milestoneStatusSchema,
  weekStartSchema,
} from "@timemagic/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { SqliteDatabase } from "../db/client.js";
import { DailyNoteRepository } from "../daily-notes/daily-note.repository.js";
import { ApiError } from "../lib/api-error.js";
import { MilestoneRepository } from "../milestones/milestone.repository.js";
import { CalendarService } from "./calendar.service.js";

const calendarParamsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1).max(9999),
});

const calendarQuerySchema = z.object({
  groupId: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional(),
  status: z
    .union([milestoneStatusSchema, z.array(milestoneStatusSchema)])
    .optional(),
  weekStart: weekStartSchema.default("monday"),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_FAILED", "validation.failed", {
      issues: result.error.issues,
    });
  }
  return result.data;
}

function arrayValue<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function registerCalendarRoutes(
  app: FastifyInstance,
  database: SqliteDatabase,
): void {
  const service = new CalendarService(
    new MilestoneRepository(database),
    new DailyNoteRepository(database),
  );

  app.get<{ Params: { month: string; year: string } }>(
    "/api/v1/calendar/:year/:month",
    async (request) => {
      const params = parse(calendarParamsSchema, request.params);
      const query = parse(calendarQuerySchema, request.query);
      return service.month(params.year, params.month, {
        groupIds: arrayValue(query.groupId),
        statuses: arrayValue(query.status),
        weekStart: query.weekStart,
      });
    },
  );
}
