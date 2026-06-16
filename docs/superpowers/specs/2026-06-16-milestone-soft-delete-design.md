# Milestone Soft Delete Design

## Goal

Allow a user to delete a milestone from the Details pane without physically removing its Markdown document from disk.

## Behavior

- `MilestoneDetails` shows a destructive `Delete milestone` action.
- The first click reveals an inline confirmation with `Confirm delete` and `Cancel`.
- Confirming calls a new milestone delete mutation with the current milestone `expectedVersion`.
- On success, App clears the selected milestone so the Details pane returns to the empty selection state.
- Deleted milestones disappear from Timeline, Calendar summaries, and daily due milestone lists through existing repository filters.

## API

- Add `DELETE /api/v1/milestones/:milestoneId`.
- Request body: `{ expectedVersion: number }`.
- Success response: `{ id: string, deleted: true }`.
- If the milestone is already deleted or missing, return the existing 404 `milestones.notFound`.
- If the version is stale, return the existing 409 `milestones.version`.

## Persistence

Deletion is a soft delete:

- Set `milestones.deleted_at`.
- Increment `milestones.version`.
- Normalize `day_order` for the milestone's previous date.
- Leave the associated `documents` row and Markdown file untouched.

## Tests

- Server route test proves a deleted milestone no longer appears in list responses and stale deletes conflict.
- Web component test proves delete confirmation calls the mutation with the current version.
- App test proves a deleted selected milestone clears the Details pane after the mutation succeeds.
