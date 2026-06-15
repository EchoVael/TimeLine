import {
  localDateSchema,
  saveDailyDocumentRequestSchema,
  updateDailyNoteGroupsRequestSchema,
} from "@timemagic/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { AppOptions } from "../config.js";
import type { SqliteDatabase } from "../db/client.js";
import { GroupRepository } from "../groups/group.repository.js";
import { ApiError } from "../lib/api-error.js";
import { MilestoneRepository } from "../milestones/milestone.repository.js";
import { DailyNoteDocumentStore } from "./daily-note-document.store.js";
import { DailyNoteRepository } from "./daily-note.repository.js";
import { DailyNoteService } from "./daily-note.service.js";

const clearDailyNoteRequestSchema = z.object({
  expectedRevision: z.string().min(1),
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

export function registerDailyNoteRoutes(
  app: FastifyInstance,
  database: SqliteDatabase,
  options: AppOptions,
): void {
  const service = new DailyNoteService(
    new DailyNoteRepository(database),
    new GroupRepository(database),
    new MilestoneRepository(database),
    new DailyNoteDocumentStore(options.dataRoot),
    options.today,
  );

  app.get<{ Params: { date: string } }>(
    "/api/v1/daily-notes/:date",
    async (request) =>
      service.summary(parse(localDateSchema, request.params.date)),
  );

  app.get<{ Params: { date: string } }>(
    "/api/v1/daily-notes/:date/document",
    async (request) =>
      service.document(parse(localDateSchema, request.params.date)),
  );

  app.put<{ Params: { date: string } }>(
    "/api/v1/daily-notes/:date/document",
    async (request) =>
      service.save(
        parse(localDateSchema, request.params.date),
        parse(saveDailyDocumentRequestSchema, request.body),
      ),
  );

  app.patch<{ Params: { date: string } }>(
    "/api/v1/daily-notes/:date/groups",
    async (request) =>
      service.updateGroups(
        parse(localDateSchema, request.params.date),
        parse(updateDailyNoteGroupsRequestSchema, request.body),
      ),
  );

  app.post<{ Params: { date: string } }>(
    "/api/v1/daily-notes/:date/clear",
    async (request) => {
      const input = parse(clearDailyNoteRequestSchema, request.body);
      return service.clear(
        parse(localDateSchema, request.params.date),
        input.expectedRevision,
      );
    },
  );
}
