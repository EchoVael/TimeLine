import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

describe("buildApp", () => {
  let app: FastifyInstance;
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), "timemagic-server-"));
    app = await buildApp({
      dataRoot,
      startupToken: "test-token",
      today: () => "2026-06-15",
    });
  });

  afterEach(async () => {
    await app.close();
    await rm(dataRoot, { force: true, recursive: true });
  });

  it("exposes a public health endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      version: "0.1.0",
    });
  });

  it("rejects protected routes without the startup token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/bootstrap",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        messageKey: "auth.required",
      },
    });
  });

  it("accepts the startup token and returns the local date", async () => {
    const response = await app.inject({
      headers: {
        authorization: "Bearer test-token",
      },
      method: "GET",
      url: "/api/v1/bootstrap",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      today: "2026-06-15",
    });
  });
});
