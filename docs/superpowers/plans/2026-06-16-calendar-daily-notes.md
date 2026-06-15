# TimeMagic Calendar and Daily Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a usable monthly calendar that displays milestones and lets each date own a lazily created, multi-project Markdown daily note.

**Architecture:** Extend the shared Zod contract and SQLite schema with daily notes and group associations. Fastify services provide month-range summaries and document/group mutations, with Markdown stored in `data/docs/daily/YYYY/MM/YYYY-MM-DD.md`. The React workspace enables Calendar mode, a custom month grid, and a right-pane daily editor with explicit Edit/Preview modes and debounced autosave.

**Tech Stack:** Existing React, Fastify, SQLite, Drizzle, Zod, Vitest, Testing Library, Playwright; add `react-markdown` and `remark-gfm`.

---

### Task 1: Shared Calendar and Daily Note Contracts

**Files:**
- Create: `packages/shared/src/calendar.ts`
- Create: `packages/shared/src/daily-notes.ts`
- Create: `packages/shared/src/calendar.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] Write failing tests for month display range, leap years, and Monday/Sunday week starts.
- [ ] Run `pnpm --filter @timemagic/shared test` and verify failure.
- [ ] Implement calendar range helpers and Zod request/response types.
- [ ] Run shared tests and typecheck.
- [ ] Commit.

### Task 2: Daily Note Persistence and APIs

**Files:**
- Modify: `apps/server/src/db/schema.ts`
- Modify: `apps/server/src/db/migrate.ts`
- Create: `apps/server/src/daily-notes/daily-note-document.store.ts`
- Create: `apps/server/src/daily-notes/daily-note.repository.ts`
- Create: `apps/server/src/daily-notes/daily-note.service.ts`
- Create: `apps/server/src/daily-notes/daily-note.routes.ts`
- Create: `apps/server/src/daily-notes/daily-note.routes.test.ts`
- Modify: `apps/server/src/app.ts`

- [ ] Write failing API tests for non-creating reads, first save, autosave revision, group association patches, and daily clear.
- [ ] Verify red.
- [ ] Add `daily_notes` and `daily_note_groups`.
- [ ] Implement canonical daily frontmatter and atomic file writes.
- [ ] Implement routes from the approved API contract.
- [ ] Verify API tests and typecheck.
- [ ] Commit.

### Task 3: Calendar Summary API

**Files:**
- Create: `apps/server/src/calendar/calendar.service.ts`
- Create: `apps/server/src/calendar/calendar.routes.ts`
- Create: `apps/server/src/calendar/calendar.routes.test.ts`
- Modify: `apps/server/src/app.ts`

- [ ] Write failing tests for six-week month range, milestone counts, first title, group IDs, overflow, and daily-note marker.
- [ ] Verify red.
- [ ] Implement month summary using bounded milestone and daily-note queries.
- [ ] Verify tests and typecheck.
- [ ] Commit.

### Task 4: Calendar Month UI

**Files:**
- Create: `apps/web/src/calendar/calendar-utils.ts`
- Create: `apps/web/src/calendar/CalendarView.tsx`
- Create: `apps/web/src/calendar/CalendarDayCell.tsx`
- Create: `apps/web/src/calendar/CalendarView.test.tsx`
- Modify: `apps/web/src/api/queries.ts`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/app.css`

- [ ] Write failing tests for month navigation, weekday headers, cell summaries, `+N`, date selection, and hover create action.
- [ ] Verify red.
- [ ] Add calendar query hook and implement custom month grid.
- [ ] Enable Timeline/Calendar segmented control.
- [ ] Verify tests and typecheck.
- [ ] Commit.

### Task 5: Daily Details and Markdown Autosave

**Files:**
- Create: `apps/web/src/daily/DailyDetails.tsx`
- Create: `apps/web/src/daily/DailyEditor.tsx`
- Create: `apps/web/src/daily/DailyDetails.test.tsx`
- Modify: `apps/web/src/api/queries.ts`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/app.css`
- Modify: `apps/web/package.json`

- [ ] Write failing tests for due milestones, multi-project selection, Edit/Preview mode, unsaved draft, and debounced save status.
- [ ] Verify red.
- [ ] Install and use `react-markdown` with `remark-gfm`.
- [ ] Implement daily query/mutations and browser draft fallback.
- [ ] Verify tests and typecheck.
- [ ] Commit.

### Task 6: End-to-End Verification

**Files:**
- Create: `tests/e2e/calendar.spec.ts`
- Modify: `tests/e2e/playwright.config.ts` only if setup requires it.

- [ ] Write E2E for creating a milestone from a calendar date, linking two groups to a daily note, editing Markdown, switching to Preview, and reloading.
- [ ] Run E2E and fix integration gaps.
- [ ] Run `pnpm build && pnpm test && pnpm typecheck && pnpm test:e2e`.
- [ ] Inspect desktop/mobile screenshots for overlap and overflow.
- [ ] Commit and restart `pnpm dev`.
