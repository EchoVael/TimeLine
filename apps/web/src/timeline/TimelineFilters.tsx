import { Plus } from "lucide-react";

import { IconButton } from "../components/IconButton.js";

export function TimelineFilters({ onNew, onToday }: {
  onNew: () => void;
  onToday: () => void;
}) {
  return (
    <div className="timelineFilters">
      <button className="textButton" onClick={onToday} type="button">
        Back to today
      </button>
      <IconButton icon={Plus} label="New milestone" onClick={onNew} />
    </div>
  );
}
