import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance, InjectOptions } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

describe("group routes", () => {
  let app: FastifyInstance;
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), "timemagic-groups-"));
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

  function inject(options: InjectOptions) {
    return app.inject({
      ...options,
      headers: {
        authorization: "Bearer test-token",
        ...options.headers,
      },
    });
  }

  async function createGroup(name: string, color: string) {
    const response = await inject({
      method: "POST",
      payload: { color, name },
      url: "/api/v1/groups",
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  it("creates groups and lists them in manual order", async () => {
    const thesis = await createGroup("  Thesis  ", "#d1495b");
    const visa = await createGroup("Visa", "#2a9d8f");

    expect(thesis).toMatchObject({
      name: "Thesis",
      sortOrder: 0,
      version: 1,
    });
    expect(visa).toMatchObject({
      name: "Visa",
      sortOrder: 1,
      version: 1,
    });

    const response = await inject({
      method: "GET",
      url: "/api/v1/groups",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items.map((group: { name: string }) => group.name)).toEqual([
      "Thesis",
      "Visa",
    ]);
  });

  it("rejects stale updates with the current record", async () => {
    const group = await createGroup("Thesis", "#d1495b");

    const first = await inject({
      method: "PATCH",
      payload: {
        description: "Finish the paper",
        expectedVersion: group.version,
      },
      url: `/api/v1/groups/${group.id}`,
    });
    expect(first.statusCode).toBe(200);

    const stale = await inject({
      method: "PATCH",
      payload: {
        description: "Stale write",
        expectedVersion: group.version,
      },
      url: `/api/v1/groups/${group.id}`,
    });

    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({
      error: {
        code: "VERSION_CONFLICT",
        details: {
          current: {
            description: "Finish the paper",
            version: 2,
          },
        },
      },
    });
  });

  it("reorders every active group atomically", async () => {
    const thesis = await createGroup("Thesis", "#d1495b");
    const visa = await createGroup("Visa", "#2a9d8f");

    const response = await inject({
      method: "PUT",
      payload: {
        expectedVersions: {
          [thesis.id]: thesis.version,
          [visa.id]: visa.version,
        },
        orderedIds: [visa.id, thesis.id],
      },
      url: "/api/v1/groups/order",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toMatchObject([
      { id: visa.id, sortOrder: 0, version: 2 },
      { id: thesis.id, sortOrder: 1, version: 2 },
    ]);
  });

  it("hides archived groups unless explicitly requested", async () => {
    const group = await createGroup("Thesis", "#d1495b");

    const archive = await inject({
      method: "POST",
      payload: { expectedVersion: group.version },
      url: `/api/v1/groups/${group.id}/archive`,
    });
    expect(archive.statusCode).toBe(200);

    const active = await inject({
      method: "GET",
      url: "/api/v1/groups",
    });
    expect(active.json().items).toEqual([]);

    const all = await inject({
      method: "GET",
      url: "/api/v1/groups?includeArchived=true",
    });
    expect(all.json().items).toHaveLength(1);
  });
});
