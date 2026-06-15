import { useEffect, useRef, useState } from "react";
import type {
  DocumentPayload,
  LocalDate,
  NewDailyDocumentDraft,
} from "@timemagic/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useSaveDailyDocument } from "../api/queries.js";
import { SegmentedControl } from "../components/SegmentedControl.js";

interface DailyEditorProps {
  date: LocalDate;
  document: DocumentPayload | NewDailyDocumentDraft;
}

type SaveStatus = "Saved" | "Saving..." | "Unsaved" | "Save failed";

function bodyFromMarkdown(markdown: string): string {
  if (!markdown.startsWith("---\n")) {
    return markdown;
  }
  const closing = markdown.indexOf("\n---", 4);
  if (closing < 0) {
    return markdown;
  }
  return markdown.slice(closing + 4).replace(/^\n+/, "");
}

function draftKey(date: LocalDate): string {
  return `timemagic.daily-draft.${date}`;
}

function initialBody(
  date: LocalDate,
  document: DocumentPayload | NewDailyDocumentDraft,
): string {
  return (
    window.localStorage.getItem(draftKey(date)) ??
    bodyFromMarkdown(document.markdown)
  );
}

export function DailyEditor({ date, document }: DailyEditorProps) {
  const save = useSaveDailyDocument(date);
  const startingBody = initialBody(date, document);
  const [body, setBody] = useState(startingBody);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [status, setStatus] = useState<SaveStatus>(
    window.localStorage.getItem(draftKey(date)) ? "Unsaved" : "Saved",
  );
  const revision = useRef(document.revision);
  const lastSavedBody = useRef(bodyFromMarkdown(document.markdown));

  useEffect(() => {
    const nextBody = initialBody(date, document);
    setBody(nextBody);
    revision.current = document.revision;
    lastSavedBody.current = bodyFromMarkdown(document.markdown);
    setStatus(
      window.localStorage.getItem(draftKey(date)) ? "Unsaved" : "Saved",
    );
  }, [date, document.id]);

  useEffect(() => {
    revision.current = document.revision;
    const serverBody = bodyFromMarkdown(document.markdown);
    if (body === lastSavedBody.current) {
      lastSavedBody.current = serverBody;
      setBody(serverBody);
    }
  }, [document.markdown, document.revision]);

  useEffect(() => {
    if (body === lastSavedBody.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setStatus("Saving...");
      void save
        .mutateAsync({
          expectedRevision: revision.current,
          markdown: body,
        })
        .then((saved) => {
          revision.current = saved.revision;
          lastSavedBody.current = body;
          if (window.localStorage.getItem(draftKey(date)) === body) {
            window.localStorage.removeItem(draftKey(date));
          }
          setStatus("Saved");
        })
        .catch(() => {
          setStatus("Save failed");
        });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [body, date, save.mutateAsync]);

  function updateBody(markdown: string) {
    setBody(markdown);
    window.localStorage.setItem(draftKey(date), markdown);
    setStatus("Unsaved");
  }

  return (
    <section className="dailyEditor">
      <div className="dailyEditorToolbar">
        <SegmentedControl
          activeId={mode}
          label="Document mode"
          onChange={(id) => setMode(id as "edit" | "preview")}
          segments={[
            { id: "edit", label: "Edit" },
            { id: "preview", label: "Preview" },
          ]}
        />
        <span className="saveStatus" data-status={status}>
          {status}
        </span>
      </div>
      {mode === "edit" ? (
        <textarea
          aria-label="Daily Markdown"
          className="dailyMarkdownInput"
          onChange={(event) => updateBody(event.target.value)}
          placeholder="Record what moved these projects forward..."
          spellCheck
          value={body}
        />
      ) : (
        <div className="markdownPreview">
          {body.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {body}
            </ReactMarkdown>
          ) : (
            <p className="markdownEmpty">Nothing written yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
