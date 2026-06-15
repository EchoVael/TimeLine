export function TimelineYearMarker({ year }: { year: number }) {
  return (
    <div
      aria-label={`Year ${year}`}
      className="timelineYearMarker"
      draggable={false}
      role="separator"
    >
      <span>{year}</span>
      <span aria-hidden className="timelineYearDivider" />
    </div>
  );
}
