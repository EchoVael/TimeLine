# TimeMagic Local API Contract

This document defines the v1 HTTP boundary between the React client and the local Fastify server.

## 1. Transport and Authentication

- Base URL: `http://127.0.0.1:{port}/api/v1`
- JSON uses UTF-8.
- All API routes require `Authorization: Bearer {startupToken}`.
- Asset binary responses require the same token.
- Requests from non-loopback interfaces are not accepted because the server binds only to `127.0.0.1`.
- Mutation requests use `Content-Type: application/json` except image upload.

The launcher opens `/#token={startupToken}`. The web client stores the token in `sessionStorage`, immediately removes the fragment with `history.replaceState`, and never persists the token to disk.

## 2. Shared Shapes

```ts
type LocalDate = string; // validated YYYY-MM-DD
type Id = string; // ULID

type MilestoneStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "cancelled";

interface ApiError {
  error: {
    code:
      | "AUTH_REQUIRED"
      | "VALIDATION_FAILED"
      | "NOT_FOUND"
      | "VERSION_CONFLICT"
      | "DOCUMENT_CONFLICT"
      | "FILESYSTEM_FAILED"
      | "DATABASE_FAILED"
      | "INTEGRITY_FAILED"
      | "MIGRATION_FAILED"
      | "BACKUP_FAILED";
    messageKey: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

interface Group {
  id: Id;
  name: string;
  color: string;
  description: string;
  sortOrder: number;
  archivedAt: string | null;
  version: number;
}

interface Milestone {
  id: Id;
  groupId: Id;
  title: string;
  date: LocalDate;
  status: MilestoneStatus;
  completedOn: LocalDate | null;
  dayOrder: number;
  documentId: Id;
  overdue: boolean;
  version: number;
}

interface DailyNoteSummary {
  date: LocalDate;
  exists: boolean;
  documentId: Id | null;
  groupIds: Id[];
  recycledGroupIds: Id[];
  dueMilestones: Milestone[];
  version: number | null;
}

interface FrontmatterConflict {
  code: "INVALID_RESERVED_FIELD" | "IDENTITY_MISMATCH";
  messageKey: string;
  fields: Array<{
    name: string;
    reason: string;
    fileValue: unknown;
    databaseValue: unknown;
  }>;
}

interface DocumentPayload {
  id: Id;
  kind: "milestone" | "daily";
  markdown: string;
  revision: string;
  modifiedAt: string;
  conflict: FrontmatterConflict | null;
}
```

`DailyNoteSummary.groupIds` contains active and archived associations. `recycledGroupIds` contains protected hidden associations retained for restore.

All list responses use:

```ts
interface ListResponse<T> {
  items: T[];
  nextCursor: string | null;
}
```

## 3. Health and Bootstrap

### `GET /health`

Unauthenticated loopback-only health endpoint.

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

It exposes no paths, token, user content, or database metadata.

### `GET /bootstrap`

Returns initial settings and overview after authentication.

```ts
interface BootstrapResponse {
  today: LocalDate;
  localeDefault: "zh-CN" | "en";
  weekStartDefault: "monday" | "sunday";
  dataRootLabel: string;
  overview: {
    dueToday: number;
    dueWithinSevenDays: number;
    overdue: number;
    inProgress: number;
  };
}
```

## 4. Groups

### `GET /groups`

Query:

- `includeArchived=boolean`, default false
- `includeTrashed=boolean`, default false

Response: `ListResponse<Group>`.

### `POST /groups`

```ts
interface CreateGroupRequest {
  name: string;
  color: string;
  description?: string;
}
```

Creates at the end of active group order. Response: `201 Group`.

### `PATCH /groups/:groupId`

```ts
interface UpdateGroupRequest {
  expectedVersion: number;
  name?: string;
  color?: string;
  description?: string;
}
```

Response: `200 Group`. A stale version returns `409 VERSION_CONFLICT` with the current group.

### `PUT /groups/order`

```ts
interface ReorderGroupsRequest {
  orderedIds: Id[];
  expectedVersions: Record<Id, number>;
}
```

The list must contain every active, non-recycled group exactly once. Response: `200 ListResponse<Group>` with updated versions.

### `POST /groups/:groupId/archive`

Body: `{ "expectedVersion": 3 }`. Response: updated `Group`.

### `POST /groups/:groupId/unarchive`

Body: `{ "expectedVersion": 4 }`. Response: updated `Group`.

### `DELETE /groups/:groupId`

```ts
interface RecycleGroupRequest {
  expectedVersion: number;
  confirmation: "RECYCLE_GROUP";
}
```

Response:

```json
{
  "trashBatchId": "01JX...",
  "purgeAfter": "2026-07-15T10:00:00.000Z"
}
```

### `POST /groups/:groupId/recycle-milestones`

Moves all milestones in the group to one recycle batch, retains the group, and detaches the group from daily notes.

```ts
interface RecycleGroupMilestonesRequest {
  expectedGroupVersion: number;
  confirmation: "RECYCLE_GROUP_MILESTONES";
}
```

Response: trash batch summary.

## 5. Milestones

### `GET /milestones`

Query:

- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `groupId` repeatable
- `status` repeatable
- `includePast=boolean`
- `includeCompleted=boolean`
- `includeCancelled=boolean`
- `cursor`
- `limit`, maximum 200

The server always returns date and same-day order. Response: `ListResponse<Milestone>`.

### `POST /milestones`

```ts
interface CreateMilestoneRequest {
  title: string;
  date: LocalDate;
  groupId: Id;
}
```

Status defaults to `not_started`. The server creates the milestone document from the current template in the same operation. The new row is inserted according to group order unless the date already has an explicit manual order, in which case it appends.

Response:

```ts
interface CreateMilestoneResponse {
  milestone: Milestone;
  document: DocumentPayload;
}
```

### `GET /milestones/:milestoneId`

Response: `Milestone`.

### `PATCH /milestones/:milestoneId`

```ts
interface UpdateMilestoneRequest {
  expectedVersion: number;
  title?: string;
  date?: LocalDate;
  groupId?: Id;
  status?: MilestoneStatus;
  completedOn?: LocalDate | null;
}
```

Rules:

- Setting status to completed without `completedOn` records today.
- Leaving completed status clears `completedOn`.
- Setting `completedOn` while not completed is rejected.
- Changing date appends to the destination date.
- The target group must be active.

Response: updated `Milestone`.

### `PUT /milestones/day-order`

```ts
interface ReorderMilestonesRequest {
  date: LocalDate;
  orderedIds: Id[];
  expectedVersions: Record<Id, number>;
}
```

The list must contain every visible and hidden active milestone on that date, not only the currently filtered subset. The client obtains this complete ordering from the date endpoint before submitting.

Response: `200 ListResponse<Milestone>` with updated versions.

### `DELETE /milestones/:milestoneId`

```ts
interface RecycleMilestoneRequest {
  expectedVersion: number;
  confirmation: "RECYCLE_MILESTONE";
}
```

Response: trash batch summary.

## 6. Calendar and Daily Notes

### `GET /calendar/:year/:month`

Returns only data needed to render one month, including leading and trailing displayed dates.

```ts
interface CalendarDay {
  date: LocalDate;
  milestoneCount: number;
  firstMilestoneTitle: string | null;
  groupIds: Id[];
  overflowCount: number;
  hasDailyNote: boolean;
}

interface CalendarMonthResponse {
  year: number;
  month: number;
  days: CalendarDay[];
}
```

Group and status filters use the same repeatable query parameters as milestones.

### `GET /daily-notes/:date`

Returns `DailyNoteSummary`. If no row or file exists, `exists` is false and no file is created.

### `GET /daily-notes/:date/document`

Returns the existing `DocumentPayload`. For a date without a daily note, it returns an unsaved draft without creating a row or file:

```ts
interface NewDailyDocumentDraft {
  id: null;
  kind: "daily";
  markdown: string;
  revision: null;
  modifiedAt: null;
  conflict: null;
}
```

### `PUT /daily-notes/:date/document`

```ts
interface SaveDailyDocumentRequest {
  markdown: string;
  expectedRevision: string | null;
  conflictStrategy?: "overwrite" | "save_copy";
}
```

When `expectedRevision` is null and the date does not exist, this creates the daily-note row and file from canonical frontmatter plus the submitted body. If another request created it first, the server returns `409 DOCUMENT_CONFLICT`.

Response: `DocumentPayload`.

### `PATCH /daily-notes/:date/groups`

```ts
interface UpdateDailyNoteGroupsRequest {
  expectedVersion: number | null;
  addGroupIds: Id[];
  removeGroupIds: Id[];
}
```

Added groups must be active. Removed groups may be active or archived, but not recycled. Hidden `recycledGroupIds` are preserved and cannot be changed through this endpoint.

If no daily note exists and `addGroupIds` is non-empty, this creates its row and document from the daily template. Empty changes do not create a note.

Response: updated `DailyNoteSummary`.

### `POST /daily-notes/:date/clear`

Body: `{ "expectedRevision": "sha256..." }`.

Clears the body but preserves canonical frontmatter and associations. Response: updated `DocumentPayload`.

## 7. Documents

### `GET /documents/:documentId`

Before returning:

1. Read the file.
2. Detect external changes.
3. Validate and import valid reserved frontmatter changes.
4. Return invalid frontmatter as `conflict`.

Response: `DocumentPayload`.

### `POST /documents/:documentId/refresh`

Performs the same read and import behavior without relying on cached metadata. Response: `DocumentPayload`.

### `PUT /documents/:documentId`

```ts
interface SaveDocumentRequest {
  markdown: string;
  expectedRevision: string;
  conflictStrategy?: "overwrite" | "save_copy";
}
```

Normal response: updated `DocumentPayload`.

If the disk revision differs and no strategy is supplied:

```ts
interface DocumentConflictResponse {
  error: {
    code: "DOCUMENT_CONFLICT";
    messageKey: "document.conflict";
    requestId: string;
    details: {
      expectedRevision: string;
      actualRevision: string;
      externalMarkdown: string;
      appMarkdown: string;
    };
  };
}
```

`overwrite` writes the app version against the current disk revision. `save_copy` writes a sibling conflict file that is not indexed as a managed document and returns its relative path.

The server replaces reserved frontmatter with canonical values before writing. Unknown frontmatter keys and the submitted body are preserved.

## 8. Assets

### `POST /documents/:documentId/assets`

Multipart field: `file`.

Validation:

- MIME type and file signature must agree.
- Allowed: PNG, JPEG, WebP, GIF.
- Maximum: 20 MB.

Response:

```ts
interface UploadAssetResponse {
  assetId: Id;
  markdown: string;
  originalUrl: string;
  thumbnailUrl: string;
}
```

The returned Markdown uses a relative managed path and escaped alt text based on the original filename.

### `GET /assets/:assetId`

Returns the original image with immutable ETag and private cache headers.

### `GET /assets/:assetId/thumbnail`

Returns the generated thumbnail. Until generation completes, returns the original image with a response header indicating fallback.

### `POST /assets/scan-unreferenced`

Returns candidates but performs no deletion.

```ts
interface AssetCandidate {
  id: Id;
  relativePath: string;
  byteSize: number;
  ownerDocumentId: Id;
}
```

### `POST /assets/recycle`

Body: `{ "assetIds": ["..."], "confirmation": "RECYCLE_ASSETS" }`.

The server rechecks references immediately before moving files. Referenced files are skipped and reported.

## 9. Search and Overview

### `GET /search`

Query:

- `q`, non-empty, maximum 200 characters
- `groupId` repeatable
- `includeArchived=boolean`
- `limit`, maximum 100

```ts
type SearchResult =
  | {
      type: "milestone";
      id: Id;
      documentId: Id;
      title: string;
      date: LocalDate;
      snippet: string;
      matchOffset: number | null;
    }
  | {
      type: "daily";
      date: LocalDate;
      documentId: Id;
      snippet: string;
      matchOffset: number | null;
    }
  | {
      type: "group";
      id: Id;
      title: string;
      snippet: string;
    };
```

Response: `ListResponse<SearchResult>`.

### `GET /overview`

Returns due today, next seven days inclusive, overdue, and in-progress counts under the current group filter.

## 10. Trash

### `GET /trash`

Returns batches ordered by deletion date descending.

```ts
interface TrashBatchSummary {
  id: Id;
  kind: "milestone" | "group" | "group_milestones" | "asset_cleanup";
  label: string;
  entityCount: number;
  deletedAt: string;
  purgeAfter: string;
}
```

### `POST /trash/:batchId/restore`

Body: `{ "confirmation": "RESTORE" }`.

Group batches restore as a whole. Response includes restored IDs and any associations skipped because their owner no longer exists.

### `DELETE /trash/:batchId`

Body: `{ "confirmation": "PERMANENTLY_DELETE" }`.

Permanently deletes one batch.

### `DELETE /trash`

Body: `{ "confirmation": "EMPTY_TRASH" }`.

Permanently deletes all ready batches. Both permanent-delete operations require a second client confirmation before the request is sent.

## 11. Templates and Settings

### `GET /templates`

Returns milestone and daily Markdown template bodies and versions.

### `PUT /templates/:kind`

```ts
interface UpdateTemplateRequest {
  expectedVersion: number;
  markdown: string;
}
```

Templates may be empty. Reserved frontmatter is not allowed in template bodies because the server generates it.

### `GET /settings`

Returns server-owned settings and available choices. It does not return the startup token.

### `POST /data-root/migrate`

```ts
interface MigrateDataRootRequest {
  grantId: Id;
  confirmation: "MIGRATE_DATA_ROOT";
}
```

The destination is selected through a trusted local path picker opened by the server. Arbitrary browser-supplied paths are rejected.

Response reports verification and whether restart is required.

### `POST /system/select-directory`

Opens the macOS directory picker and returns a short-lived opaque grant plus the selected display name. The absolute path is retained server-side and is not exposed to ordinary API logs.

```ts
interface DirectoryGrantResponse {
  grantId: Id;
  displayName: string;
  expiresAt: string;
}
```

### `POST /system/open-data-folder`

Opens Finder at the current data root. Response: `204`.

## 12. Backup

### `POST /backups/export`

Creates a consistent manual ZIP after checkpointing SQLite.

```ts
interface BackupResponse {
  id: Id;
  filename: string;
  createdAt: string;
  byteSize: number;
  sha256: string;
}
```

### `GET /backups`

Lists manual and automatic backups without exposing paths outside the data root.

### `GET /backups/:backupId/download`

Streams a backup after authentication with `Content-Disposition: attachment`. The response is private and not cached.

### `POST /backups/:backupId/verify`

Checks ZIP digest, SQLite integrity, manifest, and required paths. It does not restore.

Automatic snapshots use the same manifest format and retain the five newest successful snapshots.

## 13. HTTP Status Rules

- `200`: successful read or mutation with body
- `201`: successful creation
- `204`: successful mutation without body
- `400`: malformed request
- `401`: missing or invalid startup token
- `404`: entity not found
- `409`: version, revision, or frontmatter conflict
- `413`: uploaded image exceeds 20 MB
- `415`: unsupported or invalid image format
- `422`: well-formed request violates domain rules
- `500`: unexpected database or filesystem failure
- `503`: startup integrity or migration state prevents safe service

No error response includes absolute filesystem paths, bearer tokens, full document bodies except the explicit authenticated document-conflict response, or SQL details.

## 14. Idempotency and Concurrency

- `GET` operations are side-effect free except valid external frontmatter import during document open or refresh.
- Entity updates and deletes require `expectedVersion`; reorder operations require exact membership plus `expectedVersions`.
- Document saves require `expectedRevision`.
- Repeating a delete against an entity already in the same recycle batch returns the existing batch.
- Restore and purge endpoints are idempotent while their operation journal entry exists.
- The server serializes mutations affecting the same document or trash batch.
- SQLite runs in WAL mode with a single application writer.
