# Timeline Selection Calendar Focus Design

## Goal

When a user opens a milestone from Timeline and then switches to Calendar,
Calendar should open on the month containing that milestone. This makes the
timeline-to-calendar workflow preserve context.

## Behavior

Clicking a Timeline milestone continues to select the milestone and show its
details. The selected milestone's `date` becomes the pending Calendar focus
date.

When Calendar is opened while a milestone is selected, Calendar initializes its
month cursor from the selected milestone date instead of `today`.

If no milestone is selected, Calendar keeps the current behavior and opens on
today's month.

Once Calendar is open, manual calendar navigation is respected. Changing the
year/month selects, using previous/next month, or clicking `Today` should not
be immediately overridden by the selected milestone date.

Selecting a date in Calendar clears the selected milestone, as it does today.

## Component Boundaries

`App` owns the cross-view selection state. It derives `calendarInitialDate`
from the selected milestone and passes it to `CalendarView`.

`CalendarView` accepts an optional `initialDate` prop. Its internal cursor is
initialized from `initialDate ?? today`. It also responds when it is mounted or
re-opened with a different initial date, but it does not reset the cursor on
every render.

No server API or persisted data changes are required.

## Testing

Web tests cover:

- Selecting a Timeline milestone, then switching to Calendar, opens the
  milestone's month.
- The selected milestone remains selected in the details pane after switching.
- Without a selected milestone, Calendar still opens on today's month.
- Once Calendar is open, manual month/year navigation is not overwritten by the
  selected milestone.

E2E coverage is optional for this slice because the behavior is fully covered
at the App component boundary and does not cross API or persistence boundaries.
