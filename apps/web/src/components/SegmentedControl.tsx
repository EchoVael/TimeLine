interface Segment {
  disabled?: boolean;
  id: string;
  label: string;
}

interface SegmentedControlProps {
  activeId: string;
  label: string;
  onChange: (id: string) => void;
  segments: Segment[];
}

export function SegmentedControl({
  activeId,
  label,
  onChange,
  segments,
}: SegmentedControlProps) {
  return (
    <div aria-label={label} className="segmentedControl" role="group">
      {segments.map((segment) => (
        <button
          aria-pressed={segment.id === activeId}
          disabled={segment.disabled}
          key={segment.id}
          onClick={() => onChange(segment.id)}
          type="button"
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
