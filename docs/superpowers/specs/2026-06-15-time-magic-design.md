# TimeMagic Product and System Design

**Status:** Scope frozen for v1  
**Date:** 2026-06-15  
**Audience:** Product owner and implementation engineers

## 1. Product Summary

TimeMagic is a local-first personal planning application centered on two connected views:

- A compact vertical timeline for future milestones.
- A monthly calendar for daily execution notes.

A milestone belongs to exactly one project group and owns one Markdown document. A daily note may relate to multiple groups and records what was done toward those projects. Both document types support pasted or dropped images.

The application is a private, single-user tool. It runs locally on macOS, opens in the browser, stores data in a user-controlled folder, and requires no account or cloud service.

## 2. Product Goals

1. Make upcoming milestones easy to scan from today forward.
2. Connect each milestone to the context needed to complete it.
3. Connect daily work notes to one or more long-term projects.
4. Preserve data as readable Markdown and ordinary image files.
5. Remain fast and understandable over roughly ten years of personal use.
6. Protect personal data through local-only access, recovery, backups, and conflict detection.

## 3. Non-Goals for v1

- Task dependencies, critical paths, or automatic date shifting.
- Date ranges, hourly scheduling, or time-zone-aware events.
- System, browser, or desktop notifications.
- Accounts, collaboration, built-in cloud synchronization, or LAN access.
- Free-form tags separate from groups.
- OCR, arbitrary attachments, PDF preview, or image annotation.
- Recurring or duplicated milestones.
- Custom keyboard shortcuts or command palette.
- Advanced analytics, gamification, or a standalone statistics dashboard.
- Native mobile access. The UI is responsive, but the server remains local to the Mac.
- A packaged `.app`; v1 starts through a macOS script.

## 4. Core Concepts

### 4.1 Group

A group represents a project or long-term goal, such as a thesis, visa process, or product release.

Required properties:

- Name
- Color
- Description
- Manual display order
- Active or archived state

Groups can be archived to reduce noise without losing history. A group can be moved to the recycle bin together with all its milestones.

### 4.2 Milestone

A milestone is a dated project checkpoint. It may represent a deadline or an intermediate outcome.

Required properties:

- Short title
- Date in local `YYYY-MM-DD` form
- Exactly one group; creation and reassignment require that group to be active
- Status: `not_started`, `in_progress`, `completed`, or `cancelled`
- Manual order among milestones on the same date
- Stable Markdown document ID

The system derives `overdue`; it is true when the date is before today and status is neither completed nor cancelled. Completing a milestone records an actual completion date, which the user may correct.

Milestones do not have priority, dependencies, date ranges, specific times, or multiple groups.

### 4.3 Daily Note

There is at most one daily note per date. It is created only when first saved, not when merely viewed.

A daily note has:

- A date in local `YYYY-MM-DD` form
- Zero or more group associations; new associations require active groups
- One Markdown document

Group associations are selected manually. Groups with milestones on that date are suggested first but are not added automatically.

### 4.4 Markdown Document

Every milestone automatically receives a Markdown document. Daily Markdown files are created lazily on first save. The editor has separate Edit and Preview modes, remembered per document.

The application manages reserved frontmatter fields. Users may edit files externally. Valid external frontmatter changes are validated and imported into SQLite; invalid changes produce a conflict instead of being overwritten.

## 5. Primary User Experience

### 5.1 Workspace Layout

Desktop uses a three-pane workspace:

- Left: group list and filtering controls.
- Center: timeline or calendar.
- Right: selected milestone, date, or group details.

The left and right panes can be collapsed independently. The center view switches between Timeline and Calendar through a segmented control. The right pane shows one selected object at a time and offers a one-step Back action.

The visual style is a quiet, compact productivity tool: restrained surfaces, clear boundaries, dense but readable spacing, and group color used for labels and markers rather than large backgrounds.

On narrow screens, the application uses a single-pane flow between the center view and details. This provides basic responsive use on the same Mac. v1 does not expose the server to a physical phone.

### 5.2 Timeline

The timeline is vertical, compact, and ordered by date ascending. It opens at today and extends into the future.

Each row contains:

- Date on the left
- Timeline line and point in the center
- Short title and group label on the right
- Lightweight status and overdue treatment

Rows never overlap. Multiple milestones on the same date appear as separate compact rows and can be reordered by drag and drop. Moving between dates is done by editing the date, not by cross-date dragging.

Before a date is manually reordered, newly created milestones are inserted by group display order and then by creation order within a group. Dragging establishes explicit same-day order. Changing an existing milestone's date appends it to the destination date.

Default visibility:

- Today and future dates are shown.
- Past milestones are hidden behind a toggle.
- Completed milestones are hidden behind a toggle.
- Cancelled milestones are hidden behind a toggle.

Changing visibility never deletes data. Milestones remain sorted by date regardless of status.

### 5.3 Calendar

The calendar is a month view. Week start follows the active locale unless manually overridden to Monday or Sunday.

Each day cell shows at most three compact signals:

- Milestone count
- The first milestone short title
- Group color markers

Overflow is represented by `+N`. Selecting a day opens its summary and Markdown note in the right pane. On desktop, hovering a date cell reveals a small add button for creating a milestone prefilled with that date. In the narrow layout, creation is available from the selected-day detail.

### 5.4 Details Pane

Milestone details contain:

- Short title
- Date
- Group
- Status
- Actual completion date when completed
- Edit or Preview mode
- Markdown content

Daily details contain:

- Date
- Milestones due that day
- Multi-select group associations
- Edit or Preview mode
- Markdown content

Group details contain:

- Name
- Color
- Description
- Archive action
- Recycle action

Selecting a group opens its details. A separate control toggles group visibility so selection and filtering are not conflated.

## 6. Main Workflows

### 6.1 First Use

1. Start the app through the macOS launcher.
2. The app selects a default `data/` directory.
3. The interface language follows the operating system.
4. Create the first group.
5. Create a milestone from the timeline.
6. The milestone document is generated from the editable milestone template and opens in the right pane.

### 6.2 Plan and Document a Milestone

1. Create a milestone with title, date, and group; status defaults to Not Started.
2. Paste or drag images into Edit mode.
3. The server stores images under the document's asset directory and inserts Markdown links at the cursor.
4. The body is saved automatically after 500-1000 ms of inactivity.
5. Preview renders GitHub-flavored Markdown.

### 6.3 Record Daily Progress

1. Select a date in the calendar.
2. Review milestones due that day.
3. Select one or more related groups.
4. Write the daily note.
5. The file is created on first successful save using the editable daily template.

### 6.4 Find Existing Information

1. Enter a query in global search.
2. Results are grouped into milestones, daily notes, and groups.
3. Selecting a milestone switches to Timeline, reveals and focuses it, then opens its document.
4. Selecting a daily note switches to its calendar month, selects the date, and opens the document.
5. Selecting a group applies "only this group."
6. The first matching text in an opened document is highlighted.

### 6.5 Complete a Milestone

1. Change status to Completed.
2. The app records today's local date as `completedOn`.
3. The date can be corrected manually.
4. The milestone remains at its planned date but is hidden by the default timeline filter.

### 6.6 Delete and Recover

Deleting a milestone moves its record, document, and assets referenced only by that document into the recycle bin for 30 days. Managed images still referenced by another document remain in active storage.

The "remove all milestones in this group" operation:

- Moves all group milestones into the recycle bin.
- Keeps the empty group active.
- Detaches that group from daily notes.
- Records enough operation metadata to restore those detached associations if the batch is restored.

Deleting a group:

- Moves the group and all its milestones into the recycle bin as one batch.
- Keeps daily-note associations in storage but hides them while the group is recycled.
- Restores the whole batch together.
- Removes daily-note associations only when the group is permanently deleted.

Daily notes cannot be deleted in v1. Their body can be cleared.

## 7. Filtering, Overview, and Search

The group filter is multi-select and defaults to all active groups. Each group supports:

- Show or hide
- Only this group

The same filter applies to timeline, calendar, and search results.

The workspace includes a lightweight overview:

- Due today
- Due within seven days
- Overdue
- In progress

Selecting a count applies a corresponding timeline filter.

Search covers:

- Milestone short titles
- Group names
- Markdown body text
- Image filenames and alt text

Images are not OCR-indexed in v1.

## 8. Editing, Saving, and Conflicts

### 8.1 Autosave

Markdown body editing is optimistic:

1. Each edit immediately updates an in-browser draft.
2. After 500-1000 ms idle, the client submits the body.
3. A successful file write clears the draft.
4. The UI shows Saving, Saved, or Save Failed.
5. Switching documents flushes pending changes first.

If the browser or server exits before save, a newer draft is offered for recovery on the next open.

### 8.2 External Changes

The server reads a document when it is opened, when the user requests Refresh, and before saving. v1 does not run a continuous file watcher.

Each save includes the revision originally read by the client. If the file changed externally, saving stops and offers:

- Reload external version
- Overwrite with the app version
- Save the app version as a conflict copy

The application never silently overwrites a detected external change.

### 8.3 Structured Changes

Group and milestone properties are updated only after a successful server transaction. The client does not pretend a structured mutation succeeded.

SQLite is authoritative for structured fields. Valid externally edited reserved frontmatter is treated as an import request: validate it, commit it to SQLite, then regenerate canonical frontmatter. Invalid reserved fields produce a conflict report.

## 9. Images

Supported managed formats are PNG, JPEG, WebP, and GIF. Each image is limited to 20 MB.

- Paste, drop, and file selection are supported in Edit mode.
- Originals retain their original format and quality.
- A lightweight thumbnail is generated for lazy preview.
- Images are stored by owning document.
- Removing a Markdown reference does not immediately delete the file.
- Unreferenced images are identified by a cleanup scan and moved to the recycle bin only after confirmation.
- Shared manual references are detected before cleanup.

Arbitrary file attachments and PDFs are outside v1.

## 10. Data Portability and Backup

The default data location is the repository-local `data/` directory. Settings can migrate the complete data root to another user-selected directory. Migration copies into a staging directory, verifies the database and required files, then switches the active path. Failure leaves the original location active.

The app provides:

- Open Data Folder
- Export Backup ZIP
- Restore by replacing the full data directory while the app is stopped
- Five rotating automatic snapshots after a clean shutdown when data changed

Backups include SQLite, Markdown, templates, and original assets. Existing backup archives, regenerable thumbnails, logs, and transient drafts are excluded.

The folder layout is compatible with user-managed iCloud, Dropbox, OneDrive, or Git backup, but v1 does not resolve synchronization conflicts. Cloud folders are a backup mechanism, not live multi-device access: TimeMagic must be stopped before another machine reads or changes the same data root.

## 11. Localization, Theme, and Accessibility

- Interface languages: Simplified Chinese and English.
- First launch follows the operating-system language.
- A manual choice is remembered and applies immediately.
- User-authored content is never translated.
- Light and dark themes are supported.
- Group colors come from an accessible preset palette with optional custom colors.
- Text and borders are adjusted so custom colors remain legible in both themes.
- Group names and status labels remain visible; color is never the only signal.
- Interactive controls are reachable by Tab and have visible focus.
- Text contrast targets WCAG AA.
- Reduced-motion system preference is honored.
- v1 has no product-specific keyboard shortcuts.

## 12. Architecture

### 12.1 Repository

TimeMagic uses a pnpm workspace:

```text
apps/
  web/       React, TypeScript, Vite
  server/    Fastify, TypeScript
packages/
  shared/    Domain types, API schemas, date rules, shared constants
data/        Default runtime data, ignored by Git
docs/        Product and engineering documentation
```

### 12.2 Technology Choices

- React, TypeScript, and Vite for the client.
- CodeMirror 6 for Edit mode.
- `react-markdown` with `remark-gfm` for Preview mode.
- A custom month calendar; v1 does not need a scheduling library.
- Fastify and TypeScript for the local server.
- SQLite through `better-sqlite3`.
- Drizzle for schema definitions and migrations, with raw SQL for FTS5.
- Vitest for unit and API integration tests.
- Playwright for end-to-end and responsive screenshot tests.

### 12.3 Runtime

- The server listens only on `127.0.0.1`.
- The launcher reads the active data-root path from `~/Library/Application Support/TimeMagic/config.json`; the user data root cannot locate itself.
- A startup script chooses an available port, runs migrations, starts Fastify, and opens the browser.
- Production-like local use serves the built web application from Fastify.
- The launcher opens a URL fragment containing a one-time bootstrap token.
- The web app moves the token into `sessionStorage`, removes it from the URL, and sends it as a bearer token.
- The token changes at every server start and is never written into the data directory.
- Logs are written outside user documents and redact tokens and document bodies.

During development, Vite proxies `/api` to Fastify and obtains the token from the local development launcher.

### 12.4 Major Server Modules

- `groups`: lifecycle, ordering, archive, visibility metadata
- `milestones`: lifecycle, status, date ordering, derived overdue state
- `daily-notes`: group associations and lazy document creation
- `documents`: canonical frontmatter, body reads/writes, revisions, conflicts
- `assets`: validation, storage, thumbnails, reference scanning
- `search`: SQLite FTS5 indexing and result routing metadata
- `trash`: soft deletion, batches, recovery, retention cleanup
- `backups`: export, rotating snapshots, integrity checks
- `settings`: templates, server-owned preferences, and data-root migration
- `startup`: migrations, consistency checks, token, graceful shutdown

Modules expose service interfaces to routes. Database and filesystem operations stay behind repositories so domain behavior can be tested against temporary directories.

## 13. Consistency and Recovery

Database transactions cannot atomically include filesystem writes, so file mutations use staged files, same-volume atomic renames, and a persisted operation journal.

For a structured document update:

1. Validate the requested mutation.
2. Write the complete Markdown file to a temporary sibling.
3. Begin the SQLite transaction.
4. Atomically replace the Markdown file.
5. Commit SQLite.
6. If commit fails, restore the previous file from the staged copy.

Startup recovery completes or reverses interrupted file operations before serving requests.

Startup consistency checks:

- Apply database migrations.
- Run SQLite integrity check.
- Reconcile interrupted file operations.
- Ensure every active milestone has a document.
- Verify canonical reserved frontmatter.
- Mark missing assets and orphan candidates.
- Repair stale search index entries.
- Purge recycle entries older than 30 days.

Startup stops with a recovery message if integrity cannot be restored without losing user data.

## 14. Performance Targets

The design targets:

- 10,000 milestones
- 4,000 daily notes
- Tens of thousands of images

Required techniques:

- Virtualized timeline rows
- Date-range queries for calendar months
- Indexed group, date, status, and deletion columns
- FTS5 trigram index for body substring search, including Chinese text
- `LIKE` fallback for one- and two-character queries
- Lazy image and thumbnail loading
- Debounced indexing after successful document saves

Normal timeline and calendar interactions should feel immediate on a contemporary Mac with the target dataset.

## 15. Error Handling

API errors use a stable machine-readable code and localized client message. Expected categories are:

- Validation failure
- Authentication failure
- Not found
- Revision conflict
- Filesystem failure
- Database failure
- Data-root migration failure
- Backup failure
- Integrity failure

Failed structured operations leave the UI unchanged and offer Retry where safe. Failed Markdown saves retain the local draft. Destructive actions require explicit confirmation, and permanent deletion requires a second confirmation.

## 16. Testing Strategy

### Unit Tests

- Local-date parsing and comparison
- Overdue derivation
- Same-date ordering
- Frontmatter normalization and validation
- Group-color contrast
- Search query selection between FTS and fallback

### API Integration Tests

- Group and milestone CRUD
- Lazy daily-note creation
- Database and Markdown synchronization
- External revision conflict choices
- Image upload and reference scan
- Batch recycle, restore, and retention purge
- Data-root migration rollback
- Backup creation and integrity verification
- Startup reconciliation after interrupted operations

Tests use temporary SQLite databases and temporary data roots.

### End-to-End Test

One Playwright scenario covers the accepted v1 loop:

1. Create a group.
2. Create a future milestone.
3. Edit its Markdown and paste an image.
4. Find it on the timeline and calendar.
5. Create a daily note linked to multiple groups.
6. Search and navigate to matching content.
7. Complete the milestone.
8. Recycle and restore it.
9. Export a backup.

Desktop and narrow viewport screenshots verify non-overlap, collapsible panes, readable calendar cells, and theme contrast.

## 17. v1 Acceptance Criteria

v1 is complete when:

1. The full end-to-end workflow above passes.
2. Data remains readable in SQLite, Markdown, and ordinary image files.
3. Restart preserves content, filters, pane state, view, language, theme, and last opened document.
4. External edits are refreshed or surfaced as conflicts without silent data loss.
5. Recycle and restore preserve the documented relationships.
6. Manual ZIP export and five-snapshot rotation work against a nontrivial fixture dataset.
7. Timeline and calendar remain usable at the target scale.
8. The server is unreachable through non-loopback interfaces.
9. Chinese and English UI smoke tests pass.
10. macOS launcher starts the app, runs migrations, opens the browser, and writes redacted logs.

## 18. Delivery Slices

Implementation should produce working software in these vertical slices:

1. Workspace foundation, local security, data root, migrations, and shared schemas.
2. Groups and compact timeline with milestone documents.
3. Markdown edit/preview, autosave, external conflicts, and images.
4. Monthly calendar and multi-group daily notes.
5. Search, overview filters, and navigation.
6. Recycle bin, restore, cleanup, backups, and migration.
7. Localization, themes, accessibility, responsive behavior, scale work, and launcher.

The detailed implementation plan is written only after this design is reviewed and approved.
