import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

import type { LocalDate } from "@timemagic/shared";

export interface AppOptions {
  dataRoot: string;
  startupToken: string;
  today: () => LocalDate;
}

function currentLocalDate(): LocalDate {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as LocalDate;
}

export function readProcessOptions(): AppOptions {
  return {
    dataRoot: resolve(process.env.TIMEMAGIC_DATA_ROOT ?? "data"),
    startupToken:
      process.env.TIMEMAGIC_STARTUP_TOKEN ?? randomBytes(32).toString("hex"),
    today: currentLocalDate,
  };
}
