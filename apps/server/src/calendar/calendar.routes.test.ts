import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance, InjectOptions } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

describe("calendar routes", () => {
  let app: FastifyInstance;
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), "timemagic-calendar-"));
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

  async function createGroup(name: string, color: string) {
    const response = await inject({
      method: "POST",
      payload: { color, name },
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
    return response.json().milestone;
  }

  it("returns a six-week month with milestone and daily-note summaries", async () => {
    const thesis = await createGroup("Thesis", "#d1495b");
    const visa = await createGroup("Visa", "#3a7d44");
    await createMilestone(thesis.id, "First draft", "2026-06-16");
    await createMilestone(visa.id, "Advisor review", "2026-06-16");
    await createMilestone(thesis.id, "Submit revision", "2026-06-16");
    await createMilestone(visa.id, "July appointment", "2026-07-06");
    await inject({
      method: "PATCH",
      payload: {
        addGroupIds: [thesis.id, visa.id],
        expectedVersion: null,
        removeGroupIds: [],
      },
      url: "/api/v1/daily-notes/2026-06-16/groups",
    });

    const response = await inject({
      method: "GET",
      url: "/api/v1/calendar/2026/6?weekStart=monday",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ month: 6, year: 2026 });
    expect(body.days).toHaveLength(42);
    expect(body.days[0].date).toBe("2026-06-01");
    expect(body.days.at(-1).date).toBe("2026-07-12");
    expect(
      body.days.find((day: { date: string }) => day.date === "2026-06-16"),
    ).toEqual({
      date: "2026-06-16",
      firstMilestoneTitle: "First draft",
      groupIds: [thesis.id, visa.id],
      hasDailyNote: true,
      milestoneCount: 3,
      overflowCount: 2,
    });
    expect(
      body.days.find((day: { date: string }) => day.date === "2026-07-06"),
    ).toMatchObject({
      firstMilestoneTitle: "July appointment",
      groupIds: [visa.id],
      milestoneCount: 1,
      overflowCount: 0,
    });
  });

  it("supports Sunday-first display ranges", async () => {
    const response = await inject({
      method: "GET",
      url: "/api/v1/calendar/2026/6?weekStart=sunday",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().days[0].date).toBe("2026-05-31");
    expect(response.json().days.at(-1).date).toBe("2026-07-11");
  });

  it("filters milestone summaries by group without hiding daily notes", async () => {
    const thesis = await createGroup("Thesis", "#d1495b");
    const visa = await createGroup("Visa", "#3a7d44");
    await createMilestone(thesis.id, "First draft", "2026-06-16");
    await createMilestone(visa.id, "Advisor review", "2026-06-16");
    await inject({
      method: "PATCH",
      payload: {
        addGroupIds: [visa.id],
        expectedVersion: null,
        removeGroupIds: [],
      },
      url: "/api/v1/daily-notes/2026-06-16/groups",
    });

    const response = await inject({
      method: "GET",
      url: `/api/v1/calendar/2026/6?weekStart=monday&groupId=${thesis.id}`,
    });
    const day = response
      .json()
      .days.find(
        (candidate: { date: string }) =>
          candidate.date === "2026-06-16",
      );

    expect(day).toMatchObject({
      firstMilestoneTitle: "First draft",
      groupIds: [thesis.id],
      hasDailyNote: true,
      milestoneCount: 1,
      overflowCount: 0,
    });
  });
});
