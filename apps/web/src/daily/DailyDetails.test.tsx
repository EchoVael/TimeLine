import type {
  DailyNoteSummary,
  DocumentPayload,
  Group,
} from "@timemagic/shared";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { DailyDetails } from "./DailyDetails.js";
import { DailyEditor } from "./DailyEditor.js";

const updateGroups = vi.fn();
const saveDocument = vi.fn();

const groups: Group[] = [
  {
    archivedAt: null,
    color: "#d1495b",
    description: "",
    id: "group-thesis",
    name: "Thesis",
    sortOrder: 0,
    version: 1,
  },
  {
    archivedAt: null,
    color: "#3a7d44",
    description: "",
    id: "group-visa",
    name: "Visa",
    sortOrder: 1,
    version: 1,
  },
];

const summary: DailyNoteSummary = {
  date: "2026-06-16",
  documentId: "doc-daily",
  dueMilestones: [
    {
      completedOn: null,
      date: "2026-06-16",
      dayOrder: 0,
      documentId: "doc-milestone",
      groupId: "group-thesis",
      id: "milestone-draft",
      overdue: false,
      status: "in_progress",
      title: "First draft",
      version: 1,
    },
  ],
  exists: true,
  groupIds: ["group-thesis"],
  recycledGroupIds: [],
  version: 2,
};

const document: DocumentPayload = {
  conflict: null,
  id: "doc-daily",
  kind: "daily",
  markdown: [
    "---",
    "type: daily",
    "date: 2026-06-16",
    "groups: []",
    "---",
    "",
    "# Work log",
  ].join("\n"),
  modifiedAt: "2026-06-16T01:00:00.000Z",
  revision: "revision-1",
};

vi.mock("../api/queries.js", () => ({
  useDailyDocument: () => ({
    data: document,
    isLoading: false,
  }),
  useDailyNote: () => ({
    data: summary,
    isLoading: false,
  }),
  useSaveDailyDocument: () => ({
    isPending: false,
    mutateAsync: saveDocument,
  }),
  useUpdateDailyNoteGroups: () => ({
    isPending: false,
    mutateAsync: updateGroups,
  }),
}));

describe("DailyDetails", () => {
  beforeEach(() => {
    updateGroups.mockReset();
  });

  it("shows due milestones and updates multiple project associations", async () => {
    const user = userEvent.setup();
    render(<DailyDetails date="2026-06-16" groups={groups} />);

    expect(
      screen.getByRole("heading", { name: "June 16, 2026" }),
    ).toBeTruthy();
    expect(screen.getByText("First draft")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Thesis" })).toHaveProperty(
      "checked",
      true,
    );

    await user.click(screen.getByRole("checkbox", { name: "Visa" }));
    expect(updateGroups).toHaveBeenCalledWith({
      addGroupIds: ["group-visa"],
      expectedVersion: 2,
      removeGroupIds: [],
    });
  });

  it("reports a failed project association update", async () => {
    const user = userEvent.setup();
    updateGroups.mockRejectedValueOnce(new Error("version conflict"));
    render(<DailyDetails date="2026-06-16" groups={groups} />);

    await user.click(screen.getByRole("checkbox", { name: "Visa" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Could not update projects.",
    );
  });
});

describe("DailyEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    saveDocument.mockReset();
    saveDocument.mockResolvedValue({
      ...document,
      markdown: `${document.markdown}\n\nReviewed outline.`,
      revision: "revision-2",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a local draft, autosaves, and renders Markdown preview", async () => {
    render(<DailyEditor date="2026-06-16" document={document} />);

    const editor = screen.getByRole("textbox", { name: "Daily Markdown" });
    fireEvent.change(editor, {
      target: { value: "# Work log\n\nReviewed outline." },
    });
    expect(screen.getByText("Unsaved")).toBeTruthy();
    expect(
      window.localStorage.getItem("timemagic.daily-draft.2026-06-16"),
    ).toBe("# Work log\n\nReviewed outline.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(saveDocument).toHaveBeenCalledWith({
      expectedRevision: "revision-1",
      markdown: "# Work log\n\nReviewed outline.",
    });
    expect(screen.getByText("Saved")).toBeTruthy();
    expect(
      window.localStorage.getItem("timemagic.daily-draft.2026-06-16"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      screen.getByRole("heading", { name: "Work log" }),
    ).toBeTruthy();
    expect(screen.getByText("Reviewed outline.")).toBeTruthy();
  });

  it("uses a refreshed revision after group frontmatter changes", async () => {
    const view = render(
      <DailyEditor date="2026-06-16" document={document} />,
    );
    view.rerender(
      <DailyEditor
        date="2026-06-16"
        document={{
          ...document,
          markdown: document.markdown.replace(
            "groups: []",
            "groups:\n  - id: group-thesis\n    name: Thesis",
          ),
          revision: "revision-from-group-change",
        }}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Daily Markdown" }),
      {
        target: { value: "# Work log\n\nAdded after tagging." },
      },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(saveDocument).toHaveBeenCalledWith({
      expectedRevision: "revision-from-group-change",
      markdown: "# Work log\n\nAdded after tagging.",
    });
  });
});
