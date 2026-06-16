import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance, InjectOptions } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

describe("milestone routes", () => {
  let app: FastifyInstance;
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), "timemagic-milestones-"));
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

  async function createGroup(name = "Thesis") {
    const response = await inject({
      method: "POST",
      payload: { color: "#d1495b", name },
      url: "/api/v1/groups",
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  async function createMilestone(
    groupId: string,
    title: string,
    date: string,
  ) {
    const response = await inject({
      method: "POST",
      payload: { date, groupId, title },
      url: "/api/v1/milestones",
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  it("creates a milestone and its stable Markdown document", async () => {
    const group = await createGroup();
    const result = await createMilestone(
      group.id,
      "  First draft  ",
      "2026-06-30",
    );

    expect(result.milestone).toMatchObject({
      completedOn: null,
      date: "2026-06-30",
      dayOrder: 0,
      groupId: group.id,
      overdue: false,
      status: "not_started",
      title: "First draft",
      version: 1,
    });
    expect(result.document.id).toBe(result.milestone.documentId);

    const markdown = await readFile(
      join(dataRoot, "docs", "nodes", `${result.milestone.id}.md`),
      "utf8",
    );
    expect(markdown).toContain(`id: ${result.milestone.id}`);
    expect(markdown).toContain("title: First draft");
    expect(markdown).toContain("date: 2026-06-30");
  });

  it("rejects creation in an archived group", async () => {
    const group = await createGroup();
    await inject({
      method: "POST",
      payload: { expectedVersion: group.version },
      url: `/api/v1/groups/${group.id}/archive`,
    });

    const response = await inject({
      method: "POST",
      payload: {
        date: "2026-06-30",
        groupId: group.id,
        title: "First draft",
      },
      url: "/api/v1/milestones",
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        messageKey: "milestones.group.active",
      },
    });
  });

  it("derives overdue and hides past milestones by default", async () => {
    const group = await createGroup();
    await createMilestone(group.id, "Past draft", "2026-06-14");
    await createMilestone(group.id, "Future draft", "2026-06-30");

    const future = await inject({
      method: "GET",
      url: "/api/v1/milestones",
    });
    expect(future.json().items.map((item: { title: string }) => item.title)).toEqual([
      "Future draft",
    ]);

    const all = await inject({
      method: "GET",
      url: "/api/v1/milestones?includePast=true",
    });
    expect(all.json().items).toMatchObject([
      { overdue: true, title: "Past draft" },
      { overdue: false, title: "Future draft" },
    ]);
  });

  it("records completion date and clears it when reopened", async () => {
    const group = await createGroup();
    const { milestone } = await createMilestone(
      group.id,
      "First draft",
      "2026-06-30",
    );

    const completed = await inject({
      method: "PATCH",
      payload: {
        expectedVersion: milestone.version,
        status: "completed",
      },
      url: `/api/v1/milestones/${milestone.id}`,
    });
    expect(completed.json()).toMatchObject({
      completedOn: "2026-06-15",
      status: "completed",
      version: 2,
    });

    const reopened = await inject({
      method: "PATCH",
      payload: {
        expectedVersion: 2,
        status: "in_progress",
      },
      url: `/api/v1/milestones/${milestone.id}`,
    });
    expect(reopened.json()).toMatchObject({
      completedOn: null,
      status: "in_progress",
      version: 3,
    });
  });

  it("reorders every milestone on the same date", async () => {
    const group = await createGroup();
    const first = (
      await createMilestone(group.id, "First draft", "2026-06-30")
    ).milestone;
    const review = (
      await createMilestone(group.id, "Review", "2026-06-30")
    ).milestone;

    const response = await inject({
      method: "PUT",
      payload: {
        date: "2026-06-30",
        expectedVersions: {
          [first.id]: first.version,
          [review.id]: review.version,
        },
        orderedIds: [review.id, first.id],
      },
      url: "/api/v1/milestones/day-order",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toMatchObject([
      { id: review.id, dayOrder: 0, version: 2 },
      { id: first.id, dayOrder: 1, version: 2 },
    ]);
  });

  it("soft deletes a milestone and hides it from future lists", async () => {
    const group = await createGroup();
    const first = (
      await createMilestone(group.id, "First draft", "2026-06-30")
    ).milestone;
    const review = (
      await createMilestone(group.id, "Review", "2026-06-30")
    ).milestone;

    const response = await inject({
      method: "DELETE",
      payload: { expectedVersion: first.version },
      url: `/api/v1/milestones/${first.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ deleted: true, id: first.id });

    const list = await inject({
      method: "GET",
      url: "/api/v1/milestones?includePast=true",
    });
    expect(
      list.json().items.map((item: { id: string; title: string }) => ({
        id: item.id,
        title: item.title,
      })),
    ).toEqual([{ id: review.id, title: "Review" }]);
  });

  it("rejects stale milestone deletes", async () => {
    const group = await createGroup();
    const { milestone } = await createMilestone(
      group.id,
      "First draft",
      "2026-06-30",
    );

    const updated = await inject({
      method: "PATCH",
      payload: {
        expectedVersion: milestone.version,
        title: "Revised draft",
      },
      url: `/api/v1/milestones/${milestone.id}`,
    });
    expect(updated.statusCode).toBe(200);

    const response = await inject({
      method: "DELETE",
      payload: { expectedVersion: milestone.version },
      url: `/api/v1/milestones/${milestone.id}`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: "VERSION_CONFLICT",
        messageKey: "milestones.version",
      },
    });
  });
});
