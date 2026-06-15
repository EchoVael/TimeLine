# Timeline Year Markers and Calendar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one year divider per visible Timeline year and compact, always-visible year/month selectors to Calendar.

**Architecture:** Keep date grouping and calendar cursor calculations in focused utility functions. `TimelineView` inserts non-sortable year markers around its already filtered milestone rows, while `CalendarView` updates its existing cursor from native select controls and keeps arrows and `Today` unchanged.

**Tech Stack:** React 19, TypeScript, CSS Grid, `@dnd-kit`, Vitest, Testing Library, Playwright.

---

### Task 1: Timeline Year Grouping and Marker

**Files:**
- Create: `apps/web/src/timeline/timeline-utils.ts`
- Create: `apps/web/src/timeline/timeline-utils.test.ts`
- Create: `apps/web/src/timeline/TimelineYearMarker.tsx`
- Modify: `apps/web/src/timeline/TimelineRow.tsx`
- Modify: `apps/web/src/timeline/TimelineView.tsx`
- Modify: `apps/web/src/timeline/TimelineView.test.tsx`
- Modify: `apps/web/src/app/app.css`

- [ ] **Step 1: Write failing utility tests for compact dates and visible year boundaries**

Create `apps/web/src/timeline/timeline-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  formatTimelineDate,
  startsTimelineYear,
  timelineYear,
} from "./timeline-utils.js";

describe("timeline date utilities", () => {
  it("keeps milestone dates compact", () => {
    expect(formatTimelineDate("2026-06-30")).toBe("Jun 30");
  });

  it("starts a year for the first visible item and at year changes", () => {
    expect(startsTimelineYear("2026-06-30", undefined)).toBe(true);
    expect(startsTimelineYear("2026-07-05", "2026-06-30")).toBe(false);
    expect(startsTimelineYear("2027-01-03", "2026-07-05")).toBe(true);
    expect(timelineYear("2027-01-03")).toBe(2027);
  });
});
```

- [ ] **Step 2: Extend the Timeline component test with cross-year and filtering assertions**

In `apps/web/src/timeline/TimelineView.test.tsx`, add a future 2027 milestone:

```ts
{
  completedOn: null,
  date: "2027-01-03",
  dayOrder: 0,
  documentId: "doc-next-year",
  groupId: "group-thesis",
  id: "next-year",
  overdue: false,
  status: "not_started",
  title: "Final submission",
  version: 1,
},
```

Add assertions to the existing visibility test:

```ts
expect(screen.getAllByRole("separator", { name: /Year/ }).map(
  (marker) => marker.getAttribute("aria-label"),
)).toEqual(["Year 2026", "Year 2027"]);
expect(screen.getByText("Jun 30")).toBeTruthy();
expect(screen.getByText("Jan 3")).toBeTruthy();

await user.click(screen.getByRole("checkbox", { name: "Show past" }));
expect(screen.getAllByRole("separator", { name: /Year/ }).map(
  (marker) => marker.getAttribute("aria-label"),
)).toEqual(["Year 2026", "Year 2027"]);
```

Add a 2025 past milestone to the fixture and change the final assertion after
`Show past` to:

```ts
expect(screen.getAllByRole("separator", { name: /Year/ }).map(
  (marker) => marker.getAttribute("aria-label"),
)).toEqual(["Year 2025", "Year 2026", "Year 2027"]);
```

The existing reorder mock remains the regression guard that only milestone IDs
participate in sortable behavior.

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```bash
pnpm --filter @timemagic/web exec vitest run \
  src/timeline/timeline-utils.test.ts \
  src/timeline/TimelineView.test.tsx
```

Expected: FAIL because `timeline-utils.ts` does not exist and no year
separators are rendered.

- [ ] **Step 4: Implement the timeline date utilities**

Create `apps/web/src/timeline/timeline-utils.ts`:

```ts
import type { LocalDate } from "@timemagic/shared";

export function timelineYear(date: LocalDate): number {
  return Number(date.slice(0, 4));
}

export function startsTimelineYear(
  date: LocalDate,
  previousDate: LocalDate | undefined,
): boolean {
  return previousDate === undefined || timelineYear(date) !== timelineYear(previousDate);
}

export function formatTimelineDate(date: LocalDate): string {
  const year = timelineYear(date);
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}
```

Update `apps/web/src/timeline/TimelineRow.tsx` to import
`formatTimelineDate` and remove its private `formatDate` function:

```ts
import { formatTimelineDate } from "./timeline-utils.js";
```

```tsx
<time dateTime={milestone.date}>
  {formatTimelineDate(milestone.date)}
</time>
```

- [ ] **Step 5: Implement the presentational year marker**

Create `apps/web/src/timeline/TimelineYearMarker.tsx`:

```tsx
export function TimelineYearMarker({ year }: { year: number }) {
  return (
    <div
      aria-label={`Year ${year}`}
      className="timelineYearMarker"
      role="separator"
    >
      <span>{year}</span>
      <span aria-hidden className="timelineYearDivider" />
    </div>
  );
}
```

Update `apps/web/src/timeline/TimelineView.tsx`:

```ts
import { Fragment, useMemo, useState } from "react";
import { TimelineYearMarker } from "./TimelineYearMarker.js";
import {
  startsTimelineYear,
  timelineYear,
} from "./timeline-utils.js";
```

Replace the `visibleItems.map` body with:

```tsx
{visibleItems.map((milestone, index) => {
  const group = groupMap.get(milestone.groupId);
  if (!group) {
    return null;
  }
  const previousDate = visibleItems[index - 1]?.date;
  return (
    <Fragment key={milestone.id}>
      {startsTimelineYear(milestone.date, previousDate) ? (
        <TimelineYearMarker year={timelineYear(milestone.date)} />
      ) : null}
      <TimelineRow
        group={group}
        milestone={milestone}
        onSelect={() => onSelect(milestone.id)}
      />
    </Fragment>
  );
})}
```

This leaves `SortableContext.items` unchanged, so separators never enter the
reorder payload.

- [ ] **Step 6: Style the marker as a compact grid-aligned divider**

Add beside the Timeline styles in `apps/web/src/app/app.css`:

```css
.timelineYearMarker {
  display: grid;
  grid-template-columns: 84px 22px minmax(0, 1fr) 28px;
  min-height: 30px;
  align-items: center;
}

.timelineYearMarker > span:first-child {
  padding-right: 12px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.timelineYearDivider {
  grid-column: 2 / 5;
  height: 1px;
  background: var(--border);
}
```

- [ ] **Step 7: Run Timeline tests and typecheck**

Run:

```bash
pnpm --filter @timemagic/web exec vitest run \
  src/timeline/timeline-utils.test.ts \
  src/timeline/TimelineView.test.tsx
pnpm --filter @timemagic/web typecheck
```

Expected: all focused tests PASS and TypeScript exits with code 0.

- [ ] **Step 8: Commit the Timeline slice**

```bash
git add apps/web/src/timeline apps/web/src/app/app.css
git commit -m "feat: add timeline year markers"
```

### Task 2: Calendar Month and Year Selectors

**Files:**
- Create: `apps/web/src/calendar/calendar-utils.test.ts`
- Modify: `apps/web/src/calendar/calendar-utils.ts`
- Modify: `apps/web/src/calendar/CalendarView.tsx`
- Modify: `apps/web/src/calendar/CalendarView.test.tsx`
- Modify: `apps/web/src/app/app.css`

- [ ] **Step 1: Write failing tests for dynamic year options**

Create `apps/web/src/calendar/calendar-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { calendarYearOptions } from "./calendar-utils.js";

describe("calendarYearOptions", () => {
  it("returns the cursor year with ten years on either side", () => {
    const years = calendarYearOptions(2026);

    expect(years).toHaveLength(21);
    expect(years[0]).toBe(2016);
    expect(years[10]).toBe(2026);
    expect(years[20]).toBe(2036);
  });
});
```

- [ ] **Step 2: Replace title assertions with select interaction tests**

In `apps/web/src/calendar/CalendarView.test.tsx`, add `fireEvent` to the
Testing Library import:

```ts
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
```

Then update the render test:

```ts
expect(screen.getByRole("combobox", { name: "Year" })).toHaveProperty(
  "value",
  "2026",
);
expect(screen.getByRole("combobox", { name: "Month" })).toHaveProperty(
  "value",
  "6",
);
expect(screen.getByRole("grid", { name: "June 2026" })).toBeTruthy();
```

Replace the navigation test with:

```ts
it("selects a month and year, navigates, and returns to today", async () => {
  const user = userEvent.setup();
  render(
    <CalendarView
      groups={groups}
      onSelectDate={vi.fn()}
      selectedDate={null}
      today="2026-06-16"
      visibleGroupIds={groups.map(({ id }) => id)}
    />,
  );

  const year = screen.getByRole("combobox", { name: "Year" });
  const month = screen.getByRole("combobox", { name: "Month" });

  await user.selectOptions(month, "12");
  expect(screen.getByRole("grid", { name: "December 2026" })).toBeTruthy();

  await user.selectOptions(year, "2036");
  expect(screen.getByRole("grid", { name: "December 2036" })).toBeTruthy();

  fireEvent.change(year, { target: { value: "not-a-year" } });
  fireEvent.change(month, { target: { value: "13" } });
  expect(screen.getByRole("grid", { name: "December 2036" })).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Next month" }));
  expect(year).toHaveProperty("value", "2037");
  expect(month).toHaveProperty("value", "1");
  expect(screen.getByRole("option", { name: "2037" })).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Today" }));
  expect(year).toHaveProperty("value", "2026");
  expect(month).toHaveProperty("value", "6");
});
```

- [ ] **Step 3: Run the focused Calendar tests and verify they fail**

Run:

```bash
pnpm --filter @timemagic/web exec vitest run \
  src/calendar/calendar-utils.test.ts \
  src/calendar/CalendarView.test.tsx
```

Expected: FAIL because `calendarYearOptions` and the two comboboxes do not
exist.

- [ ] **Step 4: Add calendar option helpers**

Update `apps/web/src/calendar/calendar-utils.ts`:

```ts
export const calendarMonths = Array.from({ length: 12 }, (_, index) => ({
  label: new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, index, 1))),
  value: index + 1,
}));

export function calendarYearOptions(
  cursorYear: number,
  radius = 10,
): number[] {
  return Array.from(
    { length: radius * 2 + 1 },
    (_, index) => cursorYear - radius + index,
  );
}
```

- [ ] **Step 5: Render controlled year and month selects**

Update imports in `apps/web/src/calendar/CalendarView.tsx`:

```ts
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
```

```ts
import {
  calendarMonths,
  calendarYearOptions,
  cursorFromDate,
  monthTitle,
  shiftMonth,
} from "./calendar-utils.js";
```

Add state-derived options and guarded handlers:

```ts
const yearOptions = calendarYearOptions(cursor.year);

function handleYearChange(event: ChangeEvent<HTMLSelectElement>) {
  const year = Number(event.currentTarget.value);
  if (Number.isInteger(year) && year > 0) {
    setCursor((current) => ({ ...current, year }));
  }
}

function handleMonthChange(event: ChangeEvent<HTMLSelectElement>) {
  const month = Number(event.currentTarget.value);
  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    setCursor((current) => ({ ...current, month }));
  }
}
```

Replace `<h2>{monthTitle(cursor)}</h2>` with:

```tsx
<div className="calendarPeriodControls">
  <label>
    <span>Year</span>
    <select
      aria-label="Year"
      onChange={handleYearChange}
      value={cursor.year}
    >
      {yearOptions.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  </label>
  <label>
    <span>Month</span>
    <select
      aria-label="Month"
      onChange={handleMonthChange}
      value={cursor.month}
    >
      {calendarMonths.map((month) => (
        <option key={month.value} value={month.value}>
          {month.label}
        </option>
      ))}
    </select>
  </label>
</div>
```

The label text is visually hidden by CSS but remains available to assistive
technology through the explicit `aria-label`.

- [ ] **Step 6: Style the selectors for desktop and mobile**

Replace `.calendarToolbar h2` styles in `apps/web/src/app/app.css` with:

```css
.calendarPeriodControls {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.calendarPeriodControls label {
  min-width: 0;
}

.calendarPeriodControls label > span {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.calendarPeriodControls select {
  height: 30px;
  padding: 0 24px 0 7px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: inherit;
  font-size: 12px;
  background: var(--surface);
}
```

In the compact media query, replace the `.calendarToolbar h2` rule with:

```css
.calendarPeriodControls {
  grid-column: 2;
}

.calendarPeriodControls select {
  max-width: 92px;
  height: 28px;
  padding-left: 5px;
  font-size: 11px;
}
```

- [ ] **Step 7: Run Calendar tests and typecheck**

Run:

```bash
pnpm --filter @timemagic/web exec vitest run \
  src/calendar/calendar-utils.test.ts \
  src/calendar/CalendarView.test.tsx
pnpm --filter @timemagic/web typecheck
```

Expected: all focused tests PASS and TypeScript exits with code 0.

- [ ] **Step 8: Commit the Calendar slice**

```bash
git add apps/web/src/calendar apps/web/src/app/app.css
git commit -m "feat: add direct calendar period controls"
```

### Task 3: End-to-End Navigation and Responsive Verification

**Files:**
- Modify: `tests/e2e/calendar.spec.ts`

- [ ] **Step 1: Add an E2E test for direct period selection**

Append to `tests/e2e/calendar.spec.ts`:

```ts
test("switches calendar month and year directly", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  await page.goto("/#token=e2e-token");
  await openCalendar(page, mobile);

  const year = page.getByRole("combobox", { name: "Year" });
  const month = page.getByRole("combobox", { name: "Month" });

  await month.selectOption("12");
  await year.selectOption("2027");
  await expect(page.getByRole("grid", { name: "December 2027" })).toBeVisible();

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(year).toHaveValue("2028");
  await expect(month).toHaveValue("1");

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(year).toHaveValue("2027");
  await expect(month).toHaveValue("12");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`calendar-period-${testInfo.project.name}.png`),
  });
});
```

- [ ] **Step 2: Run focused web and E2E tests**

Run:

```bash
pnpm --filter @timemagic/web test
pnpm test:e2e -- tests/e2e/calendar.spec.ts
```

Expected: web tests PASS; Calendar E2E passes in desktop and mobile projects.

- [ ] **Step 3: Inspect screenshots**

Open the generated desktop and mobile `calendar-period-*.png` screenshots and
verify:

- Both selects are visible and do not overlap arrow controls.
- Month names fit inside the controls.
- The calendar grid remains fully visible at 1440x900 and 390x844.
- No horizontal page overflow is introduced.

- [ ] **Step 4: Run the full verification suite**

Run:

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm test:e2e
git diff --check
```

Expected: all commands exit with code 0 and the complete E2E suite passes in
desktop and mobile projects.

- [ ] **Step 5: Commit verification coverage**

```bash
git add tests/e2e/calendar.spec.ts
git commit -m "test: cover calendar period navigation"
```

- [ ] **Step 6: Start or confirm the development server**

Run:

```bash
pnpm dev
```

Expected: web app is available at `http://localhost:4318` and the API health
endpoint responds at `http://localhost:4317/health`. If those ports are already
in use by the existing TimeMagic server, keep the existing process and confirm
both URLs respond instead of starting a duplicate.
