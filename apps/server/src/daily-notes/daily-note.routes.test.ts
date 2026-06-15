import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance, InjectOptions } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

describe("daily note routes", () => {
  let app: FastifyInstance;
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), "timemagic-daily-notes-"));
    app = await buildApp({
      dataRoot,
      startupToken: "test-token",
      today: () => "2026-06-16",
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

  async function createGroup(name: string, color = "#d1495b") {
    const response = await inject({
      method: "POST",
      payload: { color, name },
      url: "/api/v1/groups",
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  it("returns an unsaved draft without creating a row or file", async () => {
    const summary = await inject({
      method: "GET",
      url: "/api/v1/daily-notes/2026-06-16",
    });
    const document = await inject({
      method: "GET",
      url: "/api/v1/daily-notes/2026-06-16/document",
    });

    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toMatchObject({
      date: "2026-06-16",
      documentId: null,
      dueMilestones: [],
      exists: false,
      groupIds: [],
      recycledGroupIds: [],
      version: null,
    });
    expect(document.json()).toMatchObject({
      conflict: null,
      id: null,
      kind: "daily",
      modifiedAt: null,
      revision: null,
    });
    expect(document.json().markdown).toContain("date: 2026-06-16");

    await expect(
      access(
        join(
          dataRoot,
          "docs",
          "daily",
          "2026",
          "06",
          "2026-06-16.md",
        ),
      ),
    ).rejects.toThrow();
  });

  it("creates on first save and advances the document revision", async () => {
    const first = await inject({
      method: "PUT",
      payload: {
        expectedRevision: null,
        markdown: "# Work log\n\nFinished the outline.",
      },
      url: "/api/v1/daily-notes/2026-06-16/document",
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      conflict: null,
      kind: "daily",
    });
    expect(first.json().id).toEqual(expect.any(String));
    expect(first.json().revision).toEqual(expect.any(String));

    const second = await inject({
      method: "PUT",
      payload: {
        expectedRevision: first.json().revision,
        markdown: "# Work log\n\nFinished and reviewed the outline.",
      },
      url: "/api/v1/daily-notes/2026-06-16/document",
    });

    expect(second.statusCode).toBe(200);
    expect(second.json().revision).not.toBe(first.json().revision);
    expect(second.json().markdown).toContain(
      "Finished and reviewed the outline.",
    );

    const stored = await readFile(
      join(
        dataRoot,
        "docs",
        "daily",
        "2026",
        "06",
        "2026-06-16.md",
      ),
      "utf8",
    );
    expect(stored).toContain("type: daily");
    expect(stored).toContain("date: 2026-06-16");
    expect(stored).toContain("Finished and reviewed the outline.");
  });

  it("rejects a stale document revision", async () => {
    const first = await inject({
      method: "PUT",
      payload: {
        expectedRevision: null,
        markdown: "Initial body",
      },
      url: "/api/v1/daily-notes/2026-06-16/document",
    });
    expect(first.statusCode).toBe(200);

    const stale = await inject({
      method: "PUT",
      payload: {
        expectedRevision: "stale-revision",
        markdown: "Overwrite somebody else's work",
      },
      url: "/api/v1/daily-notes/2026-06-16/document",
    });

    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({
      error: {
        code: "DOCUMENT_CONFLICT",
        messageKey: "documents.revision",
      },
    });
  });

  it("preserves the winning file when first saves race", async () => {
    const responses = await Promise.all([
      inject({
        method: "PUT",
        payload: {
          expectedRevision: null,
          markdown: "First competing body",
        },
        url: "/api/v1/daily-notes/2026-06-16/document",
      }),
      inject({
        method: "PUT",
        payload: {
          expectedRevision: null,
          markdown: "Second competing body",
        },
        url: "/api/v1/daily-notes/2026-06-16/document",
      }),
    ]);

    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([
      200, 409,
    ]);

    const stored = await inject({
      method: "GET",
      url: "/api/v1/daily-notes/2026-06-16/document",
    });
    expect(stored.statusCode).toBe(200);
    expect([
      "First competing body",
      "Second competing body",
    ]).toContain(
      stored.json().markdown.split("\n").at(-1),
    );
  });

  it("creates a note while associating multiple active groups", async () => {
    const thesis = await createGroup("Thesis");
    const visa = await createGroup("Visa", "#3a7d44");

    const response = await inject({
      method: "PATCH",
      payload: {
        addGroupIds: [visa.id, thesis.id],
        expectedVersion: null,
        removeGroupIds: [],
      },
      url: "/api/v1/daily-notes/2026-06-16/groups",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      date: "2026-06-16",
      exists: true,
      groupIds: [thesis.id, visa.id],
      version: 1,
    });

    const stored = await readFile(
      join(
        dataRoot,
        "docs",
        "daily",
        "2026",
        "06",
        "2026-06-16.md",
      ),
      "utf8",
    );
    expect(stored).toContain(`  - id: ${thesis.id}`);
    expect(stored).toContain("    name: Thesis");
    expect(stored).toContain(`  - id: ${visa.id}`);
    expect(stored).toContain("    name: Visa");
    expect(stored.indexOf(thesis.id)).toBeLessThan(
      stored.indexOf(visa.id),
    );
  });

  it("updates associations with optimistic concurrency", async () => {
    const thesis = await createGroup("Thesis");
    const visa = await createGroup("Visa", "#3a7d44");
    const created = await inject({
      method: "PATCH",
      payload: {
        addGroupIds: [thesis.id],
        expectedVersion: null,
        removeGroupIds: [],
      },
      url: "/api/v1/daily-notes/2026-06-16/groups",
    });
    expect(created.statusCode).toBe(200);

    const updated = await inject({
      method: "PATCH",
      payload: {
        addGroupIds: [visa.id],
        expectedVersion: created.json().version,
        removeGroupIds: [thesis.id],
      },
      url: "/api/v1/daily-notes/2026-06-16/groups",
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      groupIds: [visa.id],
      version: 2,
    });

    const stale = await inject({
      method: "PATCH",
      payload: {
        addGroupIds: [thesis.id],
        expectedVersion: 1,
        removeGroupIds: [],
      },
      url: "/api/v1/daily-notes/2026-06-16/groups",
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe("VERSION_CONFLICT");
  });

  it("clears the body while preserving frontmatter and associations", async () => {
    const thesis = await createGroup("Thesis");
    await inject({
      method: "PATCH",
      payload: {
        addGroupIds: [thesis.id],
        expectedVersion: null,
        removeGroupIds: [],
      },
      url: "/api/v1/daily-notes/2026-06-16/groups",
    });
    const saved = await inject({
      method: "PUT",
      payload: {
        expectedRevision: (
          await inject({
            method: "GET",
            url: "/api/v1/daily-notes/2026-06-16/document",
          })
        ).json().revision,
        markdown: "Something worth clearing",
      },
      url: "/api/v1/daily-notes/2026-06-16/document",
    });
    expect(saved.statusCode).toBe(200);

    const cleared = await inject({
      method: "POST",
      payload: { expectedRevision: saved.json().revision },
      url: "/api/v1/daily-notes/2026-06-16/clear",
    });

    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().markdown).toContain(`  - id: ${thesis.id}`);
    expect(cleared.json().markdown).not.toContain(
      "Something worth clearing",
    );
  });
});
