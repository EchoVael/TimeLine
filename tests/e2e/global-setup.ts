import { rm } from "node:fs/promises";
import { resolve } from "node:path";

export default async function globalSetup() {
  await rm(resolve("test-results/e2e-data"), {
    force: true,
    recursive: true,
  });
}
