import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";

import { useGroups, useMilestones } from "../api/queries.js";
import { IconButton } from "../components/IconButton.js";
import { SegmentedControl } from "../components/SegmentedControl.js";
import "./app.css";

type MobilePane = "projects" | "timeline" | "details";

export function App() {
  const groups = useGroups();
  const milestones = useMilestones();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("timeline");

  return (
    <div
      className="appShell"
      data-left-collapsed={leftCollapsed}
      data-mobile-pane={mobilePane}
      data-right-collapsed={rightCollapsed}
    >
      <header className="topbar">
        <div className="brand">
          <span className="brandMark" aria-hidden>
            T
          </span>
          <span>TimeMagic</span>
        </div>
        <SegmentedControl
          activeId="timeline"
          label="Primary view"
          onChange={() => undefined}
          segments={[
            { id: "timeline", label: "Timeline" },
            { disabled: true, id: "calendar", label: "Calendar" },
          ]}
        />
      </header>

      <div className="workspace">
        <nav aria-label="Projects" className="pane projectsPane">
          <div className="paneHeader">
            <div>
              <span className="eyebrow">Projects</span>
              <strong>{groups.data?.items.length ?? 0} active</strong>
            </div>
            <IconButton
              icon={PanelLeftClose}
              label="Collapse projects"
              onClick={() => setLeftCollapsed(true)}
            />
          </div>
          <div className="emptyState">
            <FolderKanban aria-hidden size={20} />
            <p>Create a project to organize milestones.</p>
          </div>
        </nav>

        <main aria-label="Timeline" className="mainPane">
          <div className="mainToolbar">
            {leftCollapsed ? (
              <IconButton
                icon={ChevronRight}
                label="Expand projects"
                onClick={() => setLeftCollapsed(false)}
              />
            ) : (
              <span />
            )}
            <div className="viewTitle">
              <span className="eyebrow">From today</span>
              <h1>Timeline</h1>
            </div>
            {rightCollapsed ? (
              <IconButton
                icon={ChevronLeft}
                label="Expand details"
                onClick={() => setRightCollapsed(false)}
              />
            ) : (
              <span />
            )}
          </div>

          <div className="timelineCanvas">
            <div className="todayMarker">
              <span>Today</span>
            </div>
            <div className="emptyState emptyState--large">
              <CalendarDays aria-hidden size={22} />
              <p>
                {milestones.isLoading
                  ? "Loading milestones..."
                  : "No upcoming milestones."}
              </p>
            </div>
          </div>
        </main>

        <aside aria-label="Details" className="pane detailsPane">
          <div className="paneHeader">
            <div>
              <span className="eyebrow">Selection</span>
              <strong>Details</strong>
            </div>
            <IconButton
              icon={PanelRightClose}
              label="Collapse details"
              onClick={() => setRightCollapsed(true)}
            />
          </div>
          <div className="emptyState">
            <p>Select a project or milestone.</p>
          </div>
        </aside>
      </div>

      <nav aria-label="Mobile navigation" className="mobileNav">
        <button
          aria-pressed={mobilePane === "projects"}
          onClick={() => setMobilePane("projects")}
          type="button"
        >
          Projects
        </button>
        <button
          aria-pressed={mobilePane === "timeline"}
          onClick={() => setMobilePane("timeline")}
          type="button"
        >
          Timeline
        </button>
        <button
          aria-pressed={mobilePane === "details"}
          onClick={() => setMobilePane("details")}
          type="button"
        >
          Details
        </button>
      </nav>
    </div>
  );
}
