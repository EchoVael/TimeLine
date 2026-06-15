# TimeMagic Group Recycle Design

## Goal

Add a recoverable "delete project" workflow. Deleting a project moves the
project, all of its milestones, and their Markdown documents into one recycle
batch. The batch remains restorable for at least 30 days.

This is distinct from Archive:

- Archive reduces active-list noise while retaining the project in place.
- Move to Trash removes the project and its milestones from normal views.
- Restore returns the whole project batch together.

## User Experience

### Move to Trash

The project details pane contains a `Move project to Trash` danger action.
Activating it opens a confirmation dialog that names the project and explains
that all milestones will move with it. The request is sent only after the user
confirms.

After a successful move:

- The project disappears from active and archived project lists.
- Its milestones disappear from Timeline and Calendar.
- Daily notes remain intact, but associations to the recycled project are
  hidden.
- The details pane returns to its empty state.

### Trash

The project sidebar exposes a compact `Trash` section with the number of
recycle batches. Expanding it shows group batches ordered newest first. Each
row displays the project name, deletion date, item count, and scheduled purge
date.

Each group batch has a `Restore` command. Restore returns the project and all
of its milestones and Markdown files as one operation. An archived project
returns with its prior archived state; an active project returns active.

This slice does not expose permanent deletion or automatic purge. It records
`purgeAfter` as 30 days after deletion so those operations can be added later
without changing stored batches.

## Data Model

Add `trash_batches`:

- `id`
- `kind`, initially `group`
- `root_entity_id`
- `label`
- `entity_count`
- `restore_payload`
- `deleted_at`
- `purge_after`
- `operation_state`
- `created_at`
- `updated_at`

The existing `deleted_at` and `trash_batch_id` columns on groups, milestones,
and documents identify recycled records.

`restore_payload` stores the original group `archivedAt` value and file move
metadata needed to restore the batch. Daily-note group association rows remain
in place. Existing daily-note summary behavior already treats associations to
deleted groups as hidden `recycledGroupIds`.

## File Operations

For a group batch, milestone Markdown files move from:

`data/docs/nodes/<milestoneId>.md`

to:

`data/trash/<batchId>/docs/nodes/<milestoneId>.md`

The server stages file moves before committing database soft deletes. If a
file move or database transaction fails, already moved files are restored and
the batch is not exposed as ready.

Restore performs the inverse operation. A target-path collision aborts the
restore with a conflict instead of overwriting an existing file.

Assets are not yet implemented in the application, so this slice has no asset
movement. The batch format leaves room for asset paths later.

## API

### `DELETE /api/v1/groups/:groupId`

Request:

```json
{
  "expectedVersion": 3,
  "confirmation": "RECYCLE_GROUP"
}
```

Response:

```json
{
  "trashBatchId": "01...",
  "purgeAfter": "2026-07-16T10:00:00.000Z"
}
```

The operation is idempotent for a group already assigned to the same ready
batch. A stale active version returns `409 VERSION_CONFLICT`.

### `GET /api/v1/trash`

Returns ready batches ordered by deletion date descending.

### `POST /api/v1/trash/:batchId/restore`

Request:

```json
{
  "confirmation": "RESTORE"
}
```

Returns restored group and milestone IDs.

## Service Boundaries

- `GroupRecycleService` coordinates group/milestone/document state and file
  movement.
- `TrashRepository` owns batch persistence and atomic soft-delete/restore
  transactions.
- `TrashFileStore` owns path validation, move, rollback, and collision checks.
- Group and milestone repositories continue to exclude `deletedAt` records
  from normal queries.

The recycle service serializes operations per group or trash batch so repeated
clicks cannot create multiple competing batches.

## Error Handling

- Missing group or batch: `404 NOT_FOUND`
- Stale group version: `409 VERSION_CONFLICT`
- Restore path collision or non-ready batch: `409 RESTORE_CONFLICT`
- Invalid confirmation: `400 VALIDATION_FAILED`
- File move failure: `500 FILE_OPERATION_FAILED`, with rollback attempted
- Database failure: `500 DATABASE_FAILED`, with moved files restored

No error response includes absolute filesystem paths.

## Testing

Server tests cover:

- Recycling a group soft-deletes the group, milestones, and documents.
- Markdown files move into one batch directory.
- Daily-note associations remain and become recycled associations.
- Repeating or racing the delete does not create duplicate batches.
- Restore returns database records and files together.
- A restore collision leaves the batch unchanged.

Web tests cover:

- Confirmation is required before moving a group to Trash.
- Successful recycling clears selection and refreshes all affected views.
- Trash lists the batch and restores it.

Playwright covers the desktop and mobile flow:

1. Create a project and milestone.
2. Move the project to Trash.
3. Confirm it disappears from Timeline and Calendar.
4. Restore it from Trash.
5. Confirm the project and milestone return.
