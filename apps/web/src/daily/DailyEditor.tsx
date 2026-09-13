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

type EditorMode = "edit" | "split" | "preview";

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
  const [mode, setMode] = useState<EditorMode>("edit");
  const [expanded, setExpanded] = useState(false);
  const inlineMode = useRef<EditorMode>("edit");
  const dialog = useRef<HTMLDialogElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (expanded) {
      element.showModal();
    } else if (element.open) {
      element.close();
      expandButton.current?.focus();
    }
  }, [expanded]);

  function updateBody(markdown: string) {
    setBody(markdown);
    window.localStorage.setItem(draftKey(date), markdown);
    setStatus("Unsaved");
  }

  function closeExpanded() {
    setMode(inlineMode.current);
    setExpanded(false);
  }

  const editor = (
    <div className="dailyEditor" data-mode={mode}>
      <div className="dailyEditorToolbar">
        <SegmentedControl
          activeId={mode}
          label="Document mode"
          onChange={(id) => setMode(id as EditorMode)}
          segments={[
            { id: "edit", label: "Edit" },
            ...(expanded ? [{ id: "split", label: "Split" }] : []),
            { id: "preview", label: "Preview" },
          ]}
        />
        <span aria-live="polite" className="saveStatus" data-status={status}>
          {status}
        </span>
      </div>
      <div className="dailyEditorContent">
        {mode !== "preview" ? (
          <textarea
            aria-label="Daily Markdown"
            className="dailyMarkdownInput"
            onChange={(event) => updateBody(event.target.value)}
            placeholder="Record what moved these projects forward..."
            spellCheck
            value={body}
          />
        ) : null}
        {mode !== "edit" ? (
          <div aria-label="Markdown preview" className="markdownPreview" role="region">
            {body.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {body}
              </ReactMarkdown>
            ) : (
              <p className="markdownEmpty">Nothing written yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <section className="dailyEditorSection">
      {!expanded ? (
        <>
          <div className="dailyEditorHeading">
            <h3>Daily Markdown</h3>
            <button
              className="dailyEditorAction"
              onClick={() => {
                inlineMode.current = mode;
                if (mode === "edit") setMode("split");
                setExpanded(true);
              }}
              ref={expandButton}
              type="button"
            >
              Expand editor
            </button>
          </div>
          {editor}
        </>
      ) : null}
      <dialog
        aria-label={`Daily note for ${date}`}
        className="dailyEditorDialog"
        onCancel={(event) => {
          event.preventDefault();
          closeExpanded();
        }}
        ref={dialog}
      >
        {expanded ? (
          <>
            <header className="dailyEditorDialogHeader">
              <div>
                <span className="eyebrow">Daily note</span>
                <h2>{date}</h2>
              </div>
              <button
                className="dailyEditorAction"
                onClick={closeExpanded}
                type="button"
              >
                Close expanded editor
              </button>
            </header>
            {editor}
          </>
        ) : null}
      </dialog>
    </section>
  );
}
