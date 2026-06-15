import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { LocalDate, MilestoneStatus } from "@timemagic/shared";

interface MilestoneFrontmatter {
  completedOn: LocalDate | null;
  date: LocalDate;
  group: {
    id: string;
    name: string;
  };
  id: string;
  status: MilestoneStatus;
  title: string;
}

function yamlScalar(value: string): string {
  return /^[A-Za-z0-9 _-]+$/.test(value) ? value : JSON.stringify(value);
}

function frontmatter(input: MilestoneFrontmatter): string {
  return [
    "---",
    `id: ${input.id}`,
    "type: milestone",
    `title: ${yamlScalar(input.title)}`,
    `date: ${input.date}`,
    "group:",
    `  id: ${input.group.id}`,
    `  name: ${yamlScalar(input.group.name)}`,
    `status: ${input.status}`,
    `completedOn: ${input.completedOn ?? "null"}`,
    "---",
  ].join("\n");
}

function bodyFromMarkdown(markdown: string): string {
  const closing = markdown.indexOf("\n---", 4);
  if (closing < 0) {
    return "";
  }
  return markdown.slice(closing + 4).replace(/^\n+/, "");
}

function revision(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex");
}

export interface StoredDocument {
  fileMtimeMs: number;
  markdown: string;
  relativePath: string;
  revision: string;
}

export class MilestoneDocumentStore {
  constructor(private readonly dataRoot: string) {}

  async create(input: MilestoneFrontmatter): Promise<StoredDocument> {
    const relativePath = join("docs", "nodes", `${input.id}.md`);
    const markdown = `${frontmatter(input)}\n\n`;
    return this.write(relativePath, markdown);
  }

  async rewrite(
    relativePath: string,
    input: MilestoneFrontmatter,
  ): Promise<{ previousMarkdown: string; stored: StoredDocument }> {
    const absolutePath = join(this.dataRoot, relativePath);
    const previousMarkdown = await readFile(absolutePath, "utf8");
    const body = bodyFromMarkdown(previousMarkdown);
    const markdown = `${frontmatter(input)}\n\n${body}`;

    return {
      previousMarkdown,
      stored: await this.write(relativePath, markdown),
    };
  }

  async restore(relativePath: string, markdown: string): Promise<void> {
    await this.write(relativePath, markdown);
  }

  async remove(relativePath: string): Promise<void> {
    await unlink(join(this.dataRoot, relativePath)).catch(() => undefined);
  }

  private async write(
    relativePath: string,
    markdown: string,
  ): Promise<StoredDocument> {
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
