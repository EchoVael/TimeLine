# Timeline Selection Calendar Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open Calendar on the month containing the Timeline milestone the user just selected.

**Architecture:** `App` derives a `calendarInitialDate` from the selected milestone and passes it to `CalendarView`. `CalendarView` initializes its cursor from `initialDate ?? today` and only syncs when that initial date changes, preserving manual Calendar navigation after opening.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library.

---

### Task 1: Calendar Initial Date from Timeline Selection

**Files:**
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/App.test.tsx`
- Modify: `apps/web/src/calendar/CalendarView.tsx`
- Modify: `apps/web/src/calendar/CalendarView.test.tsx`

- [ ] **Step 1: Write failing App test**

Update `apps/web/src/app/App.test.tsx` mock data to include one active group and one milestone dated `2027-01-03`. Make the mocked `useCalendar` return days based on the requested `year` and `month` using `calendarDates`.

Add a test:

```ts
it("opens Calendar on the selected Timeline milestone month", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "Open Final submission" }));
  expect(screen.getByText("Final submission")).toBeTruthy();

  await user.click(
    within(screen.getByRole("group", { name: "Primary view" })).getByRole(
      "button",
      { name: "Calendar" },
    ),
  );

  expect(screen.getByRole("combobox", { name: "Year" })).toHaveProperty(
    "value",
    "2027",
  );
  expect(screen.getByRole("combobox", { name: "Month" })).toHaveProperty(
    "value",
    "1",
  );
  expect(screen.getByRole("grid", { name: "January 2027" })).toBeTruthy();
  expect(screen.getByText("Final submission")).toBeTruthy();
});
```

- [ ] **Step 2: Write failing CalendarView test for manual navigation preservation**

In `apps/web/src/calendar/CalendarView.test.tsx`, render with
`initialDate="2027-01-03"` and `today="2026-06-16"`. Assert Calendar starts on
January 2027, click `Today`, then assert it shows June 2026 and is not reset to
January 2027 by rerendering with the same `initialDate`.

- [ ] **Step 3: Run red tests**

Run:

```bash
pnpm --filter @timemagic/web exec vitest run \
  src/app/App.test.tsx \
  src/calendar/CalendarView.test.tsx
```

Expected: FAIL because `CalendarView` does not accept `initialDate`, and App
does not pass the selected milestone date to Calendar.

- [ ] **Step 4: Implement minimal behavior**

In `apps/web/src/calendar/CalendarView.tsx`, add `initialDate?: LocalDate` to
props, initialize cursor from `initialDate ?? today`, and use an effect with a
ref to sync only when the initial date value changes:

```ts
const cursorDate = initialDate ?? today;
const [cursor, setCursor] = useState(() => cursorFromDate(cursorDate));
const lastInitialDate = useRef(cursorDate);

useEffect(() => {
  if (lastInitialDate.current !== cursorDate) {
    lastInitialDate.current = cursorDate;
    setCursor(cursorFromDate(cursorDate));
  }
}, [cursorDate]);
```

In `apps/web/src/app/App.tsx`, pass:

```tsx
initialDate={selectedMilestone?.date}
```

to `CalendarView`.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
pnpm --filter @timemagic/web exec vitest run \
  src/app/App.test.tsx \
  src/calendar/CalendarView.test.tsx
pnpm --filter @timemagic/web typecheck
```

Expected: focused tests PASS and TypeScript exits with code 0.

- [ ] **Step 6: Run web suite and commit**

Run:

```bash
pnpm --filter @timemagic/web test
git diff --check
```

Expected: web tests PASS and diff check has no output.

Commit:

```bash
git add apps/web/src/app/App.tsx apps/web/src/app/App.test.tsx apps/web/src/calendar/CalendarView.tsx apps/web/src/calendar/CalendarView.test.tsx
git commit -m "feat: focus calendar from selected timeline milestone"
```
