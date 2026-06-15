import {
  createGroupRequestSchema,
  reorderGroupsRequestSchema,
  updateGroupRequestSchema,
} from "@timemagic/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { SqliteDatabase } from "../db/client.js";
import { ApiError } from "../lib/api-error.js";
import { GroupRepository } from "./group.repository.js";
import { GroupService } from "./group.service.js";

const versionRequestSchema = z.object({
  expectedVersion: z.number().int().positive(),
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

export function registerGroupRoutes(
  app: FastifyInstance,
  database: SqliteDatabase,
): void {
  const service = new GroupService(new GroupRepository(database));

  app.get("/api/v1/groups", async (request) => {
    const query = request.query as { includeArchived?: string };
    return {
      items: service.list(query.includeArchived === "true"),
      nextCursor: null,
    };
  });

  app.post("/api/v1/groups", async (request, reply) => {
    const group = service.create(
      parse(createGroupRequestSchema, request.body),
    );
    return reply.status(201).send(group);
  });

  app.put("/api/v1/groups/order", async (request) => ({
    items: service.reorder(
      parse(reorderGroupsRequestSchema, request.body),
    ),
    nextCursor: null,
  }));

  app.patch<{ Params: { groupId: string } }>(
    "/api/v1/groups/:groupId",
    async (request) =>
      service.update(
        request.params.groupId,
        parse(updateGroupRequestSchema, request.body),
      ),
  );

  app.post<{ Params: { groupId: string } }>(
    "/api/v1/groups/:groupId/archive",
    async (request) => {
      const input = parse(versionRequestSchema, request.body);
      return service.setArchived(
        request.params.groupId,
        input.expectedVersion,
        true,
      );
    },
  );

  app.post<{ Params: { groupId: string } }>(
    "/api/v1/groups/:groupId/unarchive",
    async (request) => {
      const input = parse(versionRequestSchema, request.body);
      return service.setArchived(
        request.params.groupId,
        input.expectedVersion,
        false,
      );
    },
  );
}
