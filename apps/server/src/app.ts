import Fastify, { type FastifyInstance } from "fastify";

import { registerCalendarRoutes } from "./calendar/calendar.routes.js";
import type { AppOptions } from "./config.js";
import { registerDailyNoteRoutes } from "./daily-notes/daily-note.routes.js";
import { createDatabase } from "./db/client.js";
import { migrateDatabase } from "./db/migrate.js";
import { registerGroupRoutes } from "./groups/group.routes.js";
import { ApiError } from "./lib/api-error.js";
import { registerMilestoneRoutes } from "./milestones/milestone.routes.js";

function isFilesystemError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return (
    typeof code === "string" &&
    /^[A-Z][A-Z0-9_]+$/.test(code) &&
    !code.startsWith("SQLITE")
  );
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: "error" },
    requestIdHeader: "x-request-id",
  });
  const database = createDatabase(options.dataRoot);
  migrateDatabase(database);

  app.addHook("onClose", async () => {
    database.close();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          messageKey: error.messageKey,
          details: error.details,
          requestId: request.id,
        },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: {
        code: isFilesystemError(error) ? "FILESYSTEM_FAILED" : "DATABASE_FAILED",
        messageKey: "server.unexpected",
        requestId: request.id,
      },
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    version: "0.1.0",
  }));

  app.addHook("onRequest", async (request) => {
    if (!request.url.startsWith("/api/v1/")) {
      return;
    }

    if (request.headers.authorization !== `Bearer ${options.startupToken}`) {
      throw new ApiError(401, "AUTH_REQUIRED", "auth.required");
    }
  });

  app.get("/api/v1/bootstrap", async () => ({
    today: options.today(),
    localeDefault: "en",
    weekStartDefault: "monday",
    dataRootLabel: "data",
    overview: {
      dueToday: 0,
      dueWithinSevenDays: 0,
      overdue: 0,
      inProgress: 0,
    },
  }));

  registerGroupRoutes(app, database);
  registerMilestoneRoutes(app, database, options);
  registerDailyNoteRoutes(app, database, options);
  registerCalendarRoutes(app, database);

  return app;
}
