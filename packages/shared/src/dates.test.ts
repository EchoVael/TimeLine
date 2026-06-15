import { describe, expect, it } from "vitest";

import { localDateSchema } from "./dates.js";

describe("localDateSchema", () => {
  it("accepts a real local calendar date", () => {
    expect(localDateSchema.safeParse("2026-06-15").success).toBe(true);
  });

  it("rejects an impossible calendar date", () => {
    expect(localDateSchema.safeParse("2026-02-30").success).toBe(false);
  });

  it("rejects a datetime", () => {
    expect(localDateSchema.safeParse("2026-06-15T08:00:00Z").success).toBe(false);
  });
});
