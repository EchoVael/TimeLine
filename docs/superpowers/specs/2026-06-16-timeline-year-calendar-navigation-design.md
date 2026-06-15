# Timeline Year Markers and Calendar Navigation Design

## Goal

Make long-range planning easier without making the interface less compact:

- Show the year once per visible year section in Timeline.
- Allow direct month and year selection in Calendar.

This is a presentation and navigation change only. It does not change stored
milestones, calendar queries, or date semantics.

## Timeline Year Markers

Timeline keeps the existing compact `Jun 30` date on each milestone row.

The ordered, filtered milestone list is divided into visible year sections.
A year marker appears immediately before:

- The first visible milestone.
- Every later milestone whose year differs from the previous visible
  milestone.

The marker displays the four-digit year, such as `2026`, in the date column on
the left. A subtle horizontal divider extends into the timeline content so the
year boundary is easy to scan without resembling a milestone.

Year markers are presentational elements. They are not draggable, selectable,
or included in the milestone reorder payload. Filtering past or completed
milestones recalculates the boundaries from the remaining visible list.

## Calendar Period Controls

The Calendar toolbar keeps the previous-month arrow, next-month arrow, and
`Today` action. Its centered month title is replaced by two compact native
select controls:

- A year select showing four-digit years.
- A month select showing the existing English month names.

Changing either control immediately updates the calendar cursor and reuses the
existing monthly calendar query. The calendar grid's accessible label
continues to use the complete month title, such as `June 2026`.

The year select contains the current cursor year plus the ten years before and
after it. Because the options are regenerated whenever the cursor changes,
using the arrow controls beyond the previous range automatically expands the
available years around the new cursor.

On compact screens, the two selects remain visible. The existing `Today`
button may remain hidden according to the current mobile layout, while the
adjacent-month arrow controls remain available.

## Component Boundaries

`TimelineView` determines whether each sorted, visible milestone begins a new
year section. `TimelineRow` remains responsible only for rendering a
milestone.

A small `TimelineYearMarker` presentation component renders the year label and
divider. It has no state and no drag-and-drop behavior.

`CalendarView` continues to own the calendar cursor. The select controls update
the cursor's `year` or `month` independently, while existing arrow and `Today`
handlers continue to replace the whole cursor.

Date formatting and cursor-range helpers belong in the existing timeline or
calendar utility layer where they can be unit tested without rendering.

## Error and Loading Behavior

Direct selection uses the same calendar query path as arrow navigation, so
existing loading and error behavior is unchanged. Select values always reflect
the active cursor, including while a new month is loading.

Invalid month or year values from a change event are ignored rather than
creating an invalid cursor.

## Testing

Timeline tests cover:

- The first visible milestone receives its year marker.
- Consecutive milestones in the same year do not repeat the marker.
- A milestone in a later year receives a new marker.
- Filtering milestones recalculates year boundaries.
- Year markers do not alter milestone drag-and-drop ordering.

Calendar tests cover:

- The year and month selects reflect the current cursor.
- Selecting a month changes the displayed calendar month.
- Selecting a year changes the displayed calendar year.
- Previous and next arrows update both selects across year boundaries.
- `Today` restores both selects to the current month and year.
- The current cursor year remains available after navigating outside the
  previous option range.

Responsive verification checks that the toolbar controls fit without overlap
on desktop and mobile widths.
