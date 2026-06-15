# TimeMagic Domain and Storage Model

This document defines the v1 domain model, SQLite schema shape, filesystem layout, and lifecycle invariants. The product behavior is specified in [the main design](../superpowers/specs/2026-06-15-time-magic-design.md).

## 1. Domain Invariants

1. A milestone belongs to exactly one group. Creation and reassignment require an active group; archiving does not sever existing ownership.
2. A non-recycled milestone has exactly one Markdown document with a stable ID.
3. A date has at most one daily note.
4. A daily note may relate to any number of groups. New associations require active groups; archived or recycled associations may remain for history and recovery.
5. Dates are local calendar dates stored as `YYYY-MM-DD`; no time zone conversion is applied.
6. Different dates sort chronologically; milestones on the same date sort by `dayOrder`.
7. `overdue` is derived, never persisted.
8. A completed milestone has `completedOn`; other statuses do not.
9. SQLite is authoritative for reserved structured fields.
10. Daily notes are never soft-deleted in v1.
11. Recycled groups and milestones remain restorable for 30 days.
12. Stable IDs and document paths do not change when titles or dates change.

## 2. IDs and Revisions

Application records use ULIDs represented as strings. ULIDs are stable, sortable for diagnostics, and safe in filenames.

Each mutable structured record has:

- `version`: integer incremented on each successful mutation
- `createdAt`: UTC timestamp for audit purposes
- `updatedAt`: UTC timestamp for audit purposes

These timestamps do not affect milestone dates.

Each Markdown document has:

- `contentRevision`: SHA-256 of the complete canonical file bytes
- `fileMtimeMs`: observed filesystem modification time

The hash is the conflict authority. Modification time is an optimization only.

## 3. SQLite Tables

The following is the logical schema. Drizzle migrations define the exact SQL.

### 3.1 `groups`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | text | primary key |
| `name` | text | non-empty |
| `color` | text | valid CSS hex color |
| `description` | text | default empty |
| `sortOrder` | integer | non-negative |
| `archivedAt` | text nullable | UTC timestamp |
| `deletedAt` | text nullable | UTC timestamp |
| `trashBatchId` | text nullable | references `trash_batches.id` |
| `version` | integer | starts at 1 |
| `createdAt` | text | UTC timestamp |
| `updatedAt` | text | UTC timestamp |

Active group names are not required to be unique. UI always includes color and stable identity.

Indexes:

- `(deletedAt, archivedAt, sortOrder)`
- `(name)`

### 3.2 `milestones`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | text | primary key |
| `groupId` | text | references `groups.id` |
| `title` | text | non-empty short title |
| `date` | text | valid `YYYY-MM-DD` |
| `status` | text | four allowed values |
| `completedOn` | text nullable | valid `YYYY-MM-DD` |
| `dayOrder` | integer | non-negative |
| `documentId` | text | unique, references `documents.id` |
| `deletedAt` | text nullable | UTC timestamp |
| `trashBatchId` | text nullable | references `trash_batches.id` |
| `version` | integer | starts at 1 |
| `createdAt` | text | UTC timestamp |
| `updatedAt` | text | UTC timestamp |

Checks:

- `completedOn` is non-null only when status is `completed`.
- Creating a milestone or changing its group requires an active group. Existing milestones may remain attached to an archived group, but never to a permanently deleted group.
- Within an active date, `dayOrder` values are normalized to contiguous integers after reorder or deletion.

Indexes:

- `(deletedAt, date, dayOrder)`
- `(groupId, deletedAt, date)`
- `(status, deletedAt, date)`

### 3.3 `daily_notes`

| Column | Type | Constraint |
| --- | --- | --- |
| `date` | text | primary key, valid `YYYY-MM-DD` |
| `documentId` | text | unique, references `documents.id` |
| `version` | integer | starts at 1 |
| `createdAt` | text | UTC timestamp |
| `updatedAt` | text | UTC timestamp |

The row is created on the first successful body or group-association save.

### 3.4 `daily_note_groups`

| Column | Type | Constraint |
| --- | --- | --- |
| `date` | text | references `daily_notes.date` |
| `groupId` | text | references `groups.id` |
| `createdAt` | text | UTC timestamp |

Primary key: `(date, groupId)`.

Rows remain present but are hidden while a related group is in the recycle bin. Permanent group deletion removes them.

### 3.5 `documents`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | text | primary key |
| `kind` | text | `milestone` or `daily` |
| `relativePath` | text | unique |
| `contentRevision` | text | SHA-256 |
| `fileMtimeMs` | integer | non-negative |
| `lastIndexedRevision` | text nullable | SHA-256 |
| `deletedAt` | text nullable | UTC timestamp |
| `trashBatchId` | text nullable | references `trash_batches.id` |
| `createdAt` | text | UTC timestamp |
| `updatedAt` | text | UTC timestamp |

The body is not duplicated as canonical content in SQLite. Search indexing stores extracted text separately.

### 3.6 `assets`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | text | primary key |
| `documentId` | text nullable | references `documents.id`, `ON DELETE SET NULL` |
| `relativePath` | text | unique |
| `thumbnailPath` | text nullable | path under cache |
| `mediaType` | text | supported image MIME type |
| `byteSize` | integer | `1..20 MB` |
| `sha256` | text | file digest |
| `referenceState` | text | `referenced`, `candidate`, `recycled` |
| `deletedAt` | text nullable | UTC timestamp |
| `createdAt` | text | UTC timestamp |
| `updatedAt` | text | UTC timestamp |

The owner controls the initial storage location, not exclusive reference semantics. Cleanup scans all Markdown documents before moving a candidate to the recycle bin. If an owning document is permanently deleted while another document still references its image, `documentId` becomes null and the file remains at its stable path.

### 3.7 `trash_batches`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | text | primary key |
| `kind` | text | `milestone`, `group`, `group_milestones`, `asset_cleanup` |
| `rootEntityId` | text nullable | initiating entity |
| `restorePayload` | text | validated JSON |
| `deletedAt` | text | UTC timestamp |
| `purgeAfter` | text | exactly 30 days after deletion |
| `operationState` | text | `staging`, `ready`, `restoring`, `purging` |
| `createdAt` | text | UTC timestamp |
| `updatedAt` | text | UTC timestamp |

`restorePayload` records relationship changes not represented by soft-delete columns, particularly daily-note group associations detached by "remove all milestones."

### 3.8 `file_operations`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | text | primary key |
| `kind` | text | `write`, `move_to_trash`, `restore`, `migrate_root` |
| `state` | text | `prepared`, `files_applied`, `committed` |
| `payload` | text | validated JSON paths and revisions |
| `createdAt` | text | UTC timestamp |
| `updatedAt` | text | UTC timestamp |

This journal allows startup to complete or reverse filesystem operations interrupted between file and database commits.

### 3.9 `settings`

| Column | Type | Constraint |
| --- | --- | --- |
| `key` | text | primary key |
| `value` | text | validated JSON |
| `updatedAt` | text | UTC timestamp |

Server-owned settings:

- Node and daily templates
- Snapshot retention metadata

The active data-root pointer cannot live inside the data root. The launcher stores only this pointer and launcher preferences in:

```text
~/Library/Application Support/TimeMagic/config.json
```

Changing roots updates this pointer only after the staged destination passes verification.

Browser-specific workspace state remains in local storage:

- Language override
- Theme
- Week-start override
- Selected view
- Pane collapse state
- Group visibility filter
- Last opened object
- Per-document Edit or Preview mode

### 3.10 Search Tables

`search_documents` is an FTS5 virtual table using the trigram tokenizer:

- `documentId` unindexed
- `kind` unindexed
- `title`
- `body`
- `imageText`

`search_groups` indexes group names and descriptions separately through ordinary indexed SQL because the dataset is small.

Queries of three or more characters use FTS5 trigram matching. One- and two-character queries use escaped `LIKE` queries against bounded columns and extracted document text.

## 4. Canonical Frontmatter

### 4.1 Milestone

```yaml
---
id: 01JX...
type: milestone
title: Thesis first draft
date: 2026-06-30
group:
  id: 01JX...
  name: Thesis
status: in_progress
completedOn: null
---
```

Reserved keys are canonicalized in this order. Unknown user keys are preserved below reserved keys. The body may contain an independent H1; it does not replace the milestone short title. `group.id` is importable; `group.name` is a denormalized display value refreshed from SQLite.

### 4.2 Daily Note

```yaml
---
type: daily
date: 2026-06-15
groups:
  - id: 01JX...
    name: Thesis
  - id: 01JY...
    name: Visa
---
```

Group entries are written in the group's manual order. IDs define identity; names keep files understandable outside the app and are refreshed from SQLite. Recycled groups remain in frontmatter until permanent deletion but are hidden in the UI.

### 4.3 Import Rules

On open or manual refresh:

1. Parse frontmatter with a YAML parser.
2. Separate reserved and unknown keys.
3. Validate reserved keys against shared schemas.
4. Compare values with SQLite.
5. If valid and changed, import them through the same domain service used by the API.
6. Rewrite canonical frontmatter while preserving unknown keys and body.
7. If invalid, return a structured conflict and leave both database and file untouched.

An externally changed milestone `id` or `type` is never imported. It is reported as an identity conflict.
An external daily-note edit cannot remove or add an association to a recycled group. Those hidden associations remain protected until restore or permanent purge.

## 5. Filesystem Layout

```text
data/
  app.db
  app.db-wal
  app.db-shm
  docs/
    nodes/
      {milestoneId}.md
    daily/
      2026/
        06/
          2026-06-15.md
  assets/
    nodes/
      {milestoneId}/
        {assetId}.{ext}
    daily/
      2026-06-15/
        {assetId}.{ext}
  templates/
    milestone.md
    daily.md
  .trash/
    batches/
      {batchId}/
  cache/
    thumbnails/
      {assetId}.webp
  backups/
    manual/
    automatic/
  logs/
```

`app.db-wal` and `app.db-shm` are runtime files and are checkpointed before backup. Existing backups, cache, and logs are excluded from backup archives.

## 6. Lifecycle Rules

### 6.1 Group Archive

- Set `archivedAt`.
- Hide from the active list and default filters.
- Hide its milestones and daily-note markers by default.
- Preserve all records and files.
- "Show archived groups" reveals them.

Unarchiving clears `archivedAt`.

### 6.2 Single Milestone Recycle

1. Create a milestone trash batch.
2. Scan all Markdown files for references to the milestone's managed assets.
3. Move the Markdown file and exclusively referenced assets under the batch directory.
4. Leave externally shared assets at their stable paths.
5. Set `deletedAt` and `trashBatchId` on the milestone, document, and moved assets.
6. Normalize remaining same-day order.
7. Restore reverses paths, fields, and order.

When the milestone is permanently purged, shared assets remain and their `documentId` becomes null.

Daily-note group associations are unchanged.

### 6.3 Remove All Milestones in a Group

1. Create one `group_milestones` batch.
2. Snapshot all daily-note associations for the group into `restorePayload`.
3. Move all milestone documents and owned asset directories into the batch.
4. Soft-delete all group milestones and their documents/assets.
5. Delete the group's `daily_note_groups` rows.
6. Keep the group active and empty.

Restoring the batch restores milestones, files, and the captured daily-note associations unless a daily note or group no longer exists.

### 6.4 Group Recycle

1. Create one group batch.
2. Move all group milestone documents and exclusively referenced assets into the batch.
3. Soft-delete the group and all its milestones/documents/assets.
4. Keep `daily_note_groups` rows intact but hidden through the recycled group.

Restore returns the complete group batch. Purge deletes the soft-deleted records and files, sets the owner of still-shared assets to null, deletes daily-note associations, and rewrites affected daily frontmatter.

### 6.5 Daily Note Clear

Clearing a daily note:

- Replaces the body with empty content.
- Keeps the file and frontmatter if the note has group associations.
- Keeps the `daily_notes` row.
- Does not delete images automatically; they become cleanup candidates.

### 6.6 Asset Cleanup

1. Parse all Markdown image destinations.
2. Resolve local paths within the data root only.
3. Mark unreferenced managed assets as candidates.
4. Present candidates with size and owning document.
5. Confirmed assets move into an `asset_cleanup` trash batch.
6. Restore puts them back at their original paths.

## 7. Date and Ordering Rules

- Date parsing rejects impossible dates such as `2026-02-30`.
- Today's date is calculated in the Mac's current local calendar at request time.
- Changing system time zone may change which date is "today" but never rewrites stored dates.
- Creating from timeline defaults to today.
- Creating from a calendar cell defaults to that date.
- New milestones are inserted by current group order, then creation order within the group, until the date is manually reordered.
- Reordering is accepted only when all IDs share the same date.
- Moving a milestone to another date appends it to that date and normalizes the old date.

## 8. Consistency Checks

Startup reports and repairs:

- Active milestone missing document: regenerate from current SQLite fields and empty template body only if no recoverable file exists.
- Document with stale reserved frontmatter: rewrite from SQLite.
- File with valid newer external frontmatter: import through domain validation.
- Missing managed asset: keep link, mark asset missing, report it.
- Unknown file under managed assets: register as an orphan candidate, never delete automatically.
- Stale FTS revision: re-index.
- Interrupted file operation: replay or roll back using `file_operations`.

Repairs that would discard an existing body or file stop startup and require explicit recovery.
