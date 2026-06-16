# Milestone Soft Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add soft deletion for milestones from the Details pane.

**Architecture:** Add a shared delete request schema, a server `DELETE /api/v1/milestones/:id` route backed by service/repository soft delete, and a web mutation used by `MilestoneDetails`. The App clears the selected milestone after deletion.

**Tech Stack:** TypeScript, Fastify, Drizzle ORM, React, TanStack Query, Vitest.

---

### Task 1: API Soft Delete

**Files:**
- Modify: `packages/shared/src/milestones.ts`
- Modify: `apps/server/src/milestones/milestone.repository.ts`
- Modify: `apps/server/src/milestones/milestone.service.ts`
- Modify: `apps/server/src/milestones/milestone.routes.ts`
- Modify: `apps/server/src/milestones/milestone.routes.test.ts`

- [ ] Write failing route tests for milestone deletion and stale version conflict.
- [ ] Add `deleteMilestoneRequestSchema` with `expectedVersion`.
- [ ] Add repository `softDelete(id, expectedVersion, deletedAt)`.
- [ ] Add service `delete(id, input)` that checks version, soft deletes, normalizes day order, and returns `{ id, deleted: true }`.
- [ ] Add `DELETE /api/v1/milestones/:milestoneId`.
- [ ] Run server milestone route tests.

### Task 2: Web Delete Action

**Files:**
- Modify: `apps/web/src/api/queries.ts`
- Modify: `apps/web/src/milestones/MilestoneDetails.tsx`
- Create: `apps/web/src/milestones/MilestoneDetails.test.tsx`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/App.test.tsx`

- [ ] Write failing tests for delete confirmation and selected milestone clearing.
- [ ] Add `useDeleteMilestone`.
- [ ] Add inline delete confirmation UI to `MilestoneDetails`.
- [ ] Pass `onDeleted` from `App` to clear selected milestone.
- [ ] Run focused web tests.

### Task 3: Verification and Commit

**Files:**
- All modified files above.

- [ ] Run `pnpm --filter @timemagic/server exec vitest run src/milestones/milestone.routes.test.ts`.
- [ ] Run `pnpm --filter @timemagic/web exec vitest run src/milestones/MilestoneDetails.test.tsx src/app/App.test.tsx`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `git diff --check`.
- [ ] Commit with `feat: add milestone soft delete`.
