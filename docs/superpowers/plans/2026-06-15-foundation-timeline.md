# TimeMagic Foundation and Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable TimeMagic vertical slice: a secure local server, persistent groups and milestones, and a compact responsive three-pane timeline workspace.

**Architecture:** Use a pnpm workspace with a React/Vite client, Fastify server, and shared Zod schemas. SQLite is accessed through `better-sqlite3`; Drizzle owns schema definitions and migrations. The server serves typed JSON APIs on loopback only, while the client uses TanStack Query and feature-focused React components.

**Tech Stack:** TypeScript, pnpm workspaces, React, Vite, Fastify, Zod, Drizzle ORM, better-sqlite3, TanStack Query, dnd-kit, lucide-react, Vitest, Testing Library, Playwright.

---

## File Map

```text
.
├── package.json                         Workspace scripts and dev dependencies
├── pnpm-workspace.yaml                  Workspace package discovery
├── tsconfig.base.json                   Shared strict TypeScript settings
├── .gitignore                           Runtime/build exclusions
├── apps/
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── app.ts                   Fastify composition
│   │       ├── index.ts                 Loopback process entry
│   │       ├── config.ts                Runtime/data-root/token config
│   │       ├── db/
│   │       │   ├── client.ts            SQLite connection
│   │       │   ├── migrate.ts           Migration runner
│   │       │   └── schema.ts            Drizzle tables and indexes
│   │       ├── lib/
│   │       │   ├── api-error.ts         Stable API errors
│   │       │   └── id.ts                ULID generation
│   │       ├── groups/
│   │       │   ├── group.repository.ts  Group persistence
│   │       │   ├── group.service.ts     Group rules
│   │       │   └── group.routes.ts      HTTP routes
│   │       └── milestones/
│   │           ├── milestone.repository.ts
│   │           ├── milestone.service.ts
│   │           └── milestone.routes.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx                 React entry and providers
│           ├── app/App.tsx              Workspace composition
│           ├── app/app.css              Tokens and responsive layout
│           ├── api/client.ts             Authenticated fetch wrapper
│           ├── api/queries.ts            Query and mutation hooks
│           ├── components/
│           │   ├── IconButton.tsx
│           │   ├── SegmentedControl.tsx
│           │   └── StatusBadge.tsx
│           ├── groups/
│           │   ├── GroupSidebar.tsx
│           │   ├── GroupForm.tsx
│           │   └── GroupDetails.tsx
│           ├── milestones/
│           │   ├── MilestoneForm.tsx
│           │   ├── MilestoneDetails.tsx
│           │   └── status.ts
│           └── timeline/
│               ├── TimelineView.tsx
│               ├── TimelineRow.tsx
│               └── TimelineFilters.tsx
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── dates.ts
│           ├── groups.ts
│           └── milestones.ts
└── tests/
    └── e2e/
        ├── playwright.config.ts
        └── timeline.spec.ts
```

## Task 1: Initialize the Workspace

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`

- [ ] **Step 1: Initialize Git**

Run:

```bash
git init
git add docs
git commit -m "docs: define TimeMagic v1 design"
```

Expected: a new repository with the approved design committed.

- [ ] **Step 2: Add workspace manifests**

Root scripts must include:

```json
{
  "scripts": {
    "dev": "concurrently -k -n server,web \"pnpm --filter @timemagic/server dev\" \"pnpm --filter @timemagic/web dev\"",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "test:e2e": "playwright test -c tests/e2e/playwright.config.ts"
  }
}
```

Use `workspace:*` for internal dependencies and strict TypeScript settings with `noUncheckedIndexedAccess`.

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm add -Dw concurrently typescript vitest @playwright/test
pnpm --filter @timemagic/shared add zod
pnpm --filter @timemagic/server add fastify @fastify/cors better-sqlite3 drizzle-orm ulid @timemagic/shared@workspace:*
pnpm --filter @timemagic/server add -D @types/better-sqlite3 drizzle-kit tsx
pnpm --filter @timemagic/web add react react-dom @tanstack/react-query @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react @timemagic/shared@workspace:*
pnpm --filter @timemagic/web add -D vite @vitejs/plugin-react @types/react @types/react-dom jsdom @testing-library/react @testing-library/user-event
```

Expected: `pnpm-lock.yaml` is created and all workspace packages resolve.

- [ ] **Step 4: Verify the empty workspace**

Run:

```bash
pnpm install
pnpm typecheck
```

Expected: typecheck scripts run without missing workspace-package errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize pnpm workspace"
```

## Task 2: Define Shared Domain Schemas

**Files:**
- Create: `packages/shared/src/dates.ts`
- Create: `packages/shared/src/groups.ts`
- Create: `packages/shared/src/milestones.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/dates.test.ts`
- Create: `packages/shared/src/milestones.test.ts`

- [ ] **Step 1: Write failing date tests**

Cover:

```ts
expect(localDateSchema.safeParse("2026-02-30").success).toBe(false);
expect(isOverdue("2026-06-14", "not_started", "2026-06-15")).toBe(true);
expect(isOverdue("2026-06-14", "completed", "2026-06-15")).toBe(false);
expect(isOverdue("2026-06-15", "in_progress", "2026-06-15")).toBe(false);
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm --filter @timemagic/shared test
```

Expected: FAIL because schemas and helpers do not exist.

- [ ] **Step 3: Implement schemas and helpers**

Define:

```ts
export const milestoneStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
]);

export function isOverdue(
  date: LocalDate,
  status: MilestoneStatus,
  today: LocalDate,
): boolean {
  return date < today && status !== "completed" && status !== "cancelled";
}
```

Use round-trip calendar validation for `localDateSchema`; regex alone is insufficient.

- [ ] **Step 4: Add request/response schemas**

Export Zod schemas and inferred types for:

- `Group`
- `CreateGroupRequest`
- `UpdateGroupRequest`
- `Milestone`
- `CreateMilestoneRequest`
- `UpdateMilestoneRequest`
- `MilestoneListQuery`
- `ApiError`

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm --filter @timemagic/shared test
pnpm --filter @timemagic/shared typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat: define shared group and milestone schemas"
```

## Task 3: Create SQLite and Fastify Foundation

**Files:**
- Create: `apps/server/drizzle.config.ts`
- Create: `apps/server/src/config.ts`
- Create: `apps/server/src/db/schema.ts`
- Create: `apps/server/src/db/client.ts`
- Create: `apps/server/src/db/migrate.ts`
- Create: `apps/server/src/lib/api-error.ts`
- Create: `apps/server/src/lib/id.ts`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/app.test.ts`

- [ ] **Step 1: Write a failing server bootstrap test**

Use a temporary data root and inject the startup token:

```ts
const app = await buildApp({
  dataRoot,
  startupToken: "test-token",
  today: () => "2026-06-15",
});

expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
expect((await app.inject({ method: "GET", url: "/api/v1/bootstrap" })).statusCode).toBe(401);
```

- [ ] **Step 2: Run the test and confirm failure**

```bash
pnpm --filter @timemagic/server test
```

Expected: FAIL because `buildApp` does not exist.

- [ ] **Step 3: Define the initial schema**

Create Drizzle tables for `groups`, `documents`, and `milestones` using the approved names and constraints. Enable:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

- [ ] **Step 4: Implement server composition**

`buildApp` must:

- Expose unauthenticated `GET /health`.
- Require `Authorization: Bearer <token>` for `/api/v1/*`.
- Add request IDs.
- Map `ApiError` to the documented JSON envelope.
- Register route modules through explicit functions.

- [ ] **Step 5: Implement the process entry**

`index.ts` must:

- Read `TIMEMAGIC_DATA_ROOT`, defaulting to repository `data/`.
- Generate a startup token if none is provided.
- Run migrations before listen.
- Bind to `127.0.0.1` only.
- Print the local URL and token-bearing fragment once.
- Handle `SIGINT` and `SIGTERM` with a clean SQLite close.

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @timemagic/server test
pnpm --filter @timemagic/server typecheck
```

Expected: health is public, bootstrap is protected, valid token succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/server
git commit -m "feat: add secure local server and database foundation"
```

## Task 4: Implement Group APIs

**Files:**
- Create: `apps/server/src/groups/group.repository.ts`
- Create: `apps/server/src/groups/group.service.ts`
- Create: `apps/server/src/groups/group.routes.ts`
- Create: `apps/server/src/groups/group.routes.test.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Write failing API tests**

Test:

- Create a group at `sortOrder = 0`.
- Create a second group at `sortOrder = 1`.
- Update with the correct version.
- Reject stale `expectedVersion` with `409 VERSION_CONFLICT`.
- Reorder with complete membership and versions.
- Archive and unarchive.
- List active groups in manual order.

- [ ] **Step 2: Confirm tests fail**

```bash
pnpm --filter @timemagic/server test -- group.routes.test.ts
```

- [ ] **Step 3: Implement repository**

Repository methods:

```ts
list(options): GroupRecord[]
findById(id): GroupRecord | undefined
insert(input): GroupRecord
update(id, expectedVersion, changes): GroupRecord
reorder(orderedIds, expectedVersions): GroupRecord[]
setArchived(id, expectedVersion, archived): GroupRecord
```

All mutations run in SQLite transactions.

- [ ] **Step 4: Implement service rules**

Validate names after trim, colors as six-digit hex, and exact reorder membership. Return stable error codes rather than SQLite messages.

- [ ] **Step 5: Register routes and rerun tests**

```bash
pnpm --filter @timemagic/server test -- group.routes.test.ts
pnpm --filter @timemagic/server typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/groups apps/server/src/app.ts
git commit -m "feat: add persistent group management"
```

## Task 5: Implement Milestone APIs

**Files:**
- Create: `apps/server/src/milestones/milestone.repository.ts`
- Create: `apps/server/src/milestones/milestone.service.ts`
- Create: `apps/server/src/milestones/milestone.routes.ts`
- Create: `apps/server/src/milestones/milestone.routes.test.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Write failing API tests**

Test:

- Reject creation without an active group.
- Create with `not_started`, a stable `documentId`, and generated empty Markdown file.
- List from today forward in date/day order.
- Derive overdue from injected today.
- Move dates and append to the destination date.
- Complete and automatically set `completedOn`.
- Leave completed state and clear `completedOn`.
- Reorder only with complete same-date membership.

- [ ] **Step 2: Confirm tests fail**

```bash
pnpm --filter @timemagic/server test -- milestone.routes.test.ts
```

- [ ] **Step 3: Implement document creation seam**

For this slice, create canonical milestone Markdown at:

```text
data/docs/nodes/{milestoneId}.md
```

Use a temporary sibling and atomic rename. The body is empty; the full editor arrives in the next slice.

- [ ] **Step 4: Implement repository and service**

Keep date/default ordering logic in the service:

```ts
create(input, today): Milestone
update(id, expectedVersion, changes, today): Milestone
list(query, today): Milestone[]
reorderDay(date, orderedIds, expectedVersions): Milestone[]
```

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm --filter @timemagic/server test -- milestone.routes.test.ts
pnpm --filter @timemagic/server typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/milestones apps/server/src/app.ts
git commit -m "feat: add milestone timeline APIs"
```

## Task 6: Build the Web Workspace Shell

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/App.tsx`
- Create: `apps/web/src/app/app.css`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/api/queries.ts`
- Create: `apps/web/src/components/IconButton.tsx`
- Create: `apps/web/src/components/SegmentedControl.tsx`
- Create: `apps/web/src/components/StatusBadge.tsx`
- Create: `apps/web/src/app/App.test.tsx`

- [ ] **Step 1: Write a failing workspace test**

Render with mocked queries and assert:

- Left sidebar, center timeline, and right detail pane exist.
- Left and right collapse buttons have accessible labels.
- Timeline/Calendar segmented control exists, with Calendar disabled as "coming next" only in this slice.

- [ ] **Step 2: Confirm failure**

```bash
pnpm --filter @timemagic/web test
```

- [ ] **Step 3: Implement API client**

Read the startup token from the URL fragment once, move it to `sessionStorage`, remove it from the visible URL, and attach it to `/api/v1` requests. Parse documented API errors.

- [ ] **Step 4: Implement the responsive shell**

Desktop:

```css
.workspace {
  display: grid;
  grid-template-columns: var(--left-pane) minmax(420px, 1fr) var(--right-pane);
  height: 100dvh;
}
```

Use stable pane widths, 6px or smaller radii, visible focus rings, light/dark color tokens, and no large decorative backgrounds. Below 760px, show one active pane at a time.

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm --filter @timemagic/web test
pnpm --filter @timemagic/web typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat: add responsive TimeMagic workspace"
```

## Task 7: Add Group Sidebar and Details

**Files:**
- Create: `apps/web/src/groups/GroupSidebar.tsx`
- Create: `apps/web/src/groups/GroupForm.tsx`
- Create: `apps/web/src/groups/GroupDetails.tsx`
- Create: `apps/web/src/groups/GroupSidebar.test.tsx`
- Modify: `apps/web/src/api/queries.ts`
- Modify: `apps/web/src/app/App.tsx`

- [ ] **Step 1: Write failing interaction tests**

Verify:

- Creating a group trims its name.
- Visibility checkbox does not open details.
- Clicking the group label opens details.
- "Only this group" changes the visible ID set.
- Archive action invalidates group and milestone queries.

- [ ] **Step 2: Confirm failure**

```bash
pnpm --filter @timemagic/web test -- GroupSidebar.test.tsx
```

- [ ] **Step 3: Implement query hooks**

Add:

```ts
useGroups()
useCreateGroup()
useUpdateGroup()
useArchiveGroup()
useReorderGroups()
```

Structured mutations update UI only after server success.

- [ ] **Step 4: Implement sidebar and details**

Use:

- Checkbox for show/hide.
- Eye icon action for "only this group."
- Grip handle for reorder.
- Plus icon for create.
- Color swatch and visible group name.
- Right-pane form for name, color, description, and archive.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @timemagic/web test -- GroupSidebar.test.tsx
pnpm --filter @timemagic/web typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/groups apps/web/src/api apps/web/src/app
git commit -m "feat: add group navigation and filtering"
```

## Task 8: Add Compact Timeline and Milestone Details

**Files:**
- Create: `apps/web/src/milestones/MilestoneForm.tsx`
- Create: `apps/web/src/milestones/MilestoneDetails.tsx`
- Create: `apps/web/src/milestones/status.ts`
- Create: `apps/web/src/timeline/TimelineView.tsx`
- Create: `apps/web/src/timeline/TimelineRow.tsx`
- Create: `apps/web/src/timeline/TimelineFilters.tsx`
- Create: `apps/web/src/timeline/TimelineView.test.tsx`
- Modify: `apps/web/src/api/queries.ts`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/app.css`

- [ ] **Step 1: Write failing timeline tests**

Verify:

- Rows are ordered by date and `dayOrder`.
- Date, short title, and group label are visible.
- Completed and past rows are hidden by default.
- Toggles reveal hidden rows.
- Clicking a row opens milestone details.
- Creating from timeline defaults to today.
- Overdue has text/icon treatment, not color alone.

- [ ] **Step 2: Confirm failure**

```bash
pnpm --filter @timemagic/web test -- TimelineView.test.tsx
```

- [ ] **Step 3: Implement milestone hooks**

Add:

```ts
useMilestones(filters)
useCreateMilestone()
useUpdateMilestone()
useReorderMilestones()
```

- [ ] **Step 4: Implement the compact timeline**

Every row has stable grid tracks:

```css
.timelineRow {
  display: grid;
  grid-template-columns: 92px 20px minmax(0, 1fr);
  min-height: 44px;
}
```

Use a real vertical line, compact typography, truncated title with tooltip, group label, status icon, and no overlapping absolute-positioned text.

- [ ] **Step 5: Implement milestone create/edit**

Create requires:

- Short title
- Local date
- Active group

Edit supports title, date, group, and status. Show computed overdue and `completedOn` where relevant.

- [ ] **Step 6: Run tests and typecheck**

```bash
pnpm --filter @timemagic/web test -- TimelineView.test.tsx
pnpm --filter @timemagic/web typecheck
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat: add compact milestone timeline"
```

## Task 9: Add End-to-End Verification

**Files:**
- Create: `tests/e2e/playwright.config.ts`
- Create: `tests/e2e/timeline.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing E2E test**

The scenario:

```ts
test("creates a group and milestone in the timeline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /new group/i }).click();
  await page.getByLabel(/group name/i).fill("Thesis");
  await page.getByRole("button", { name: /create group/i }).click();
  await page.getByRole("button", { name: /new milestone/i }).click();
  await page.getByLabel(/title/i).fill("First draft");
  await page.getByRole("button", { name: /create milestone/i }).click();
  await expect(page.getByText("First draft")).toBeVisible();
  await expect(page.getByText("Thesis")).toBeVisible();
});
```

Use stable test-only English locale through local storage.

- [ ] **Step 2: Add isolated E2E server setup**

Playwright must start server and web processes against a temporary data root and deterministic token. It must not touch the user's normal `data/`.

- [ ] **Step 3: Run and confirm initial failure**

```bash
pnpm test:e2e
```

- [ ] **Step 4: Fix integration gaps only**

Do not weaken assertions. Fix startup, proxy, labels, or query invalidation until the real workflow passes.

- [ ] **Step 5: Verify desktop and narrow screenshots**

Capture at:

- `1440x900`
- `390x844`

Assert no horizontal page overflow and that only one pane is visible in the narrow layout.

- [ ] **Step 6: Run full verification**

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
```

Expected: all commands pass.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "test: verify foundation timeline workflow"
```

## Task 10: Start the Development Environment

**Files:**
- Modify only if verification exposes a startup issue.

- [ ] **Step 1: Start the app**

Run:

```bash
pnpm dev
```

Expected:

- Fastify listens on loopback.
- Vite prints a local browser URL.
- The UI can create and persist groups and milestones.

- [ ] **Step 2: Smoke-test persistence**

Create one group and milestone, stop the processes cleanly, restart, and confirm both records remain.

- [ ] **Step 3: Record the URL and verification result**

Report the Vite URL, commands run, and any functionality intentionally deferred to the next vertical slice.
