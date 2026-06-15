import {
  createMilestoneRequestSchema,
  milestoneListQuerySchema,
  reorderMilestonesRequestSchema,
  updateMilestoneRequestSchema,
} from "@timemagic/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { AppOptions } from "../config.js";
import type { SqliteDatabase } from "../db/client.js";
import { GroupRepository } from "../groups/group.repository.js";
import { ApiError } from "../lib/api-error.js";
import { MilestoneDocumentStore } from "./milestone-document.store.js";
import { MilestoneRepository } from "./milestone.repository.js";
import { MilestoneService } from "./milestone.service.js";

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_FAILED", "validation.failed", {
      issues: result.error.issues,
    });
  }
  return result.data;
}

function booleanQuery(value: unknown): boolean {
  return value === true || value === "true";
}

export function registerMilestoneRoutes(
  app: FastifyInstance,
  database: SqliteDatabase,
  options: AppOptions,
): void {
  const service = new MilestoneService(
    new MilestoneRepository(database),
    new GroupRepository(database),
    new MilestoneDocumentStore(options.dataRoot),
    options.today,
  );

  app.get("/api/v1/milestones", async (request) => {
    const raw = request.query as Record<string, unknown>;
    const query = parse(milestoneListQuerySchema, {
      ...raw,
      includeCancelled: booleanQuery(raw.includeCancelled),
      includeCompleted: booleanQuery(raw.includeCompleted),
      includePast: booleanQuery(raw.includePast),
    });
    return {
      items: service.list(query),
      nextCursor: null,
    };
  });

  app.post("/api/v1/milestones", async (request, reply) => {
    const result = await service.create(
      parse(createMilestoneRequestSchema, request.body),
    );
    return reply.status(201).send(result);
  });

  app.put("/api/v1/milestones/day-order", async (request) => ({
    items: service.reorder(
      parse(reorderMilestonesRequestSchema, request.body),
    ),
    nextCursor: null,
  }));

  app.patch<{ Params: { milestoneId: string } }>(
    "/api/v1/milestones/:milestoneId",
    async (request) =>
      service.update(
        request.params.milestoneId,
        parse(updateMilestoneRequestSchema, request.body),
      ),
  );
}
