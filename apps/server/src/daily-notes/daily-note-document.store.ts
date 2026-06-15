import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";

import type { LocalDate } from "@timemagic/shared";

export interface DailyNoteGroup {
  id: string;
  name: string;
}

export interface StoredDailyDocument {
  fileMtimeMs: number;
  markdown: string;
  relativePath: string;
  revision: string;
}

function yamlScalar(value: string): string {
  return /^[A-Za-z0-9 _-]+$/.test(value) ? value : JSON.stringify(value);
}

function frontmatter(date: LocalDate, groups: DailyNoteGroup[]): string {
  const groupLines =
    groups.length === 0
      ? ["groups: []"]
      : [
          "groups:",
          ...groups.flatMap((group) => [
            `  - id: ${group.id}`,
            `    name: ${yamlScalar(group.name)}`,
          ]),
        ];

  return [
    "---",
    "type: daily",
    `date: ${date}`,
    ...groupLines,
    "---",
  ].join("\n");
}

function bodyFromMarkdown(markdown: string): string {
  if (!markdown.startsWith("---\n")) {
    return markdown.replace(/^\n+/, "");
  }

  const closing = markdown.indexOf("\n---", 4);
  if (closing < 0) {
    return markdown;
  }
  return markdown.slice(closing + 4).replace(/^\n+/, "");
}

function revision(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex");
}

export class DailyNoteDocumentStore {
  constructor(private readonly dataRoot: string) {}

  draft(date: LocalDate, groups: DailyNoteGroup[] = []): string {
    return `${frontmatter(date, groups)}\n\n`;
  }

  async create(
    date: LocalDate,
    groups: DailyNoteGroup[],
    submittedMarkdown = "",
  ): Promise<StoredDailyDocument> {
    return this.write(
      this.relativePath(date),
      this.canonicalMarkdown(date, groups, submittedMarkdown),
    );
  }

  async read(relativePath: string): Promise<StoredDailyDocument> {
    const absolutePath = join(this.dataRoot, relativePath);
    const markdown = await readFile(absolutePath, "utf8");
    const metadata = await stat(absolutePath);
    return {
      fileMtimeMs: metadata.mtimeMs,
      markdown,
      relativePath,
      revision: revision(markdown),
    };
  }

  async rewrite(
    relativePath: string,
    date: LocalDate,
    groups: DailyNoteGroup[],
    submittedMarkdown: string,
  ): Promise<{
    previousMarkdown: string;
    stored: StoredDailyDocument;
  }> {
    const previousMarkdown = (
      await this.read(relativePath)
    ).markdown;
    return {
      previousMarkdown,
      stored: await this.write(
        relativePath,
        this.canonicalMarkdown(date, groups, submittedMarkdown),
      ),
    };
  }

  async restore(relativePath: string, markdown: string): Promise<void> {
    await this.write(relativePath, markdown);
  }

  async remove(relativePath: string): Promise<void> {
    await unlink(join(this.dataRoot, relativePath)).catch(() => undefined);
  }

  private canonicalMarkdown(
    date: LocalDate,
    groups: DailyNoteGroup[],
    submittedMarkdown: string,
  ): string {
    const body = bodyFromMarkdown(submittedMarkdown);
    return `${frontmatter(date, groups)}\n\n${body}`;
  }

  private relativePath(date: LocalDate): string {
    const [year, month] = date.split("-");
    return join("docs", "daily", year ?? "", month ?? "", `${date}.md`);
  }

  private async write(
    relativePath: string,
    markdown: string,
  ): Promise<StoredDailyDocument> {
    const absolutePath = join(this.dataRoot, relativePath);
    const temporaryPath = `${absolutePath}.tmp`;
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(temporaryPath, markdown, "utf8");
    await rename(temporaryPath, absolutePath);
    const metadata = await stat(absolutePath);
    return {
      fileMtimeMs: metadata.mtimeMs,
      markdown,
      relativePath,
      revision: revision(markdown),
    };
  }
}
