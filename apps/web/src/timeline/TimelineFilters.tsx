import { Plus } from "lucide-react";

import { IconButton } from "../components/IconButton.js";

interface TimelineFiltersProps {
  onNew: () => void;
  onShowCompletedChange: (checked: boolean) => void;
  onShowPastChange: (checked: boolean) => void;
  showCompleted: boolean;
  showPast: boolean;
}

export function TimelineFilters({
  onNew,
  onShowCompletedChange,
  onShowPastChange,
  showCompleted,
  showPast,
}: TimelineFiltersProps) {
  return (
    <div className="timelineFilters">
      <label>
        <input
          checked={showPast}
          onChange={(event) => onShowPastChange(event.target.checked)}
          type="checkbox"
        />
        <span>Show past</span>
      </label>
      <label>
        <input
          checked={showCompleted}
          onChange={(event) => onShowCompletedChange(event.target.checked)}
          type="checkbox"
        />
        <span>Show completed</span>
      </label>
      <IconButton icon={Plus} label="New milestone" onClick={onNew} />
    </div>
  );
}
