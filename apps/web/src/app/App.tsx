import { useState } from "react";
import type { LocalDate } from "@timemagic/shared";
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";

import { useGroups, useMilestones } from "../api/queries.js";
import { CalendarView } from "../calendar/CalendarView.js";
import { IconButton } from "../components/IconButton.js";
import { SegmentedControl } from "../components/SegmentedControl.js";
import { DailyDetails } from "../daily/DailyDetails.js";
import { GroupDetails } from "../groups/GroupDetails.js";
import { GroupSidebar } from "../groups/GroupSidebar.js";
import { MilestoneDetails } from "../milestones/MilestoneDetails.js";
import { TimelineView } from "../timeline/TimelineView.js";
import "./app.css";

type MobilePane = "projects" | "timeline" | "details";
type PrimaryView = "timeline" | "calendar";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}` as const;
}

export function App() {
  const groups = useGroups(true);
  const allMilestones = useMilestones({
    includeCancelled: true,
    includeCompleted: true,
    includePast: true,
  });
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [primaryView, setPrimaryView] = useState<PrimaryView>("timeline");
  const [mobilePane, setMobilePane] = useState<MobilePane>("timeline");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<LocalDate | null>(null);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[] | null>(null);
  const allGroups = groups.data?.items ?? [];
  const activeGroups = allGroups.filter(({ archivedAt }) => !archivedAt);
  const allGroupIds = activeGroups.map(({ id }) => id);
  const activeGroupIdSet = new Set(allGroupIds);
  const effectiveVisibleGroupIds = (
    visibleGroupIds ?? allGroupIds
  ).filter((id) => activeGroupIdSet.has(id));
  const selectedGroup =
    groups.data?.items.find(({ id }) => id === selectedGroupId) ?? null;
  const selectedMilestone =
    allMilestones.data?.items.find(({ id }) => id === selectedMilestoneId) ??
    null;

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
          activeId={primaryView}
          label="Primary view"
          onChange={(id) => setPrimaryView(id as PrimaryView)}
          segments={[
            { id: "timeline", label: "Timeline" },
            { id: "calendar", label: "Calendar" },
          ]}
        />
      </header>

      <div className="workspace">
        <nav aria-label="Projects" className="pane projectsPane">
          <div className="paneHeader">
            <div>
              <span className="eyebrow">Projects</span>
              <strong>{activeGroups.length} active</strong>
            </div>
            <IconButton
              icon={PanelLeftClose}
              label="Collapse projects"
              onClick={() => setLeftCollapsed(true)}
            />
          </div>
          {groups.isLoading ? (
            <div className="emptyState">
              <FolderKanban aria-hidden size={20} />
              <p>Loading projects...</p>
            </div>
          ) : (
            <GroupSidebar
              onSelect={(groupId) => {
                setSelectedGroupId(groupId);
                setSelectedMilestoneId(null);
                setMobilePane("details");
              }}
              onVisibleGroupIdsChange={setVisibleGroupIds}
              selectedGroupId={selectedGroupId}
              visibleGroupIds={effectiveVisibleGroupIds}
            />
          )}
        </nav>

        <main
          aria-label={primaryView === "timeline" ? "Timeline" : "Calendar"}
          className="mainPane"
        >
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
              <h1>
                {primaryView === "timeline" ? "Timeline" : "Calendar"}
              </h1>
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

          {primaryView === "timeline" ? (
            <TimelineView
              groups={activeGroups}
              onSelect={(milestoneId) => {
                setSelectedDate(null);
                setSelectedGroupId(null);
                setSelectedMilestoneId(milestoneId);
                setMobilePane("details");
              }}
              today={localToday()}
              visibleGroupIds={effectiveVisibleGroupIds}
            />
          ) : (
            <CalendarView
              groups={activeGroups}
              initialDate={selectedMilestone?.date}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedGroupId(null);
                setSelectedMilestoneId(null);
                setMobilePane("details");
              }}
              selectedDate={selectedDate}
              today={localToday()}
              visibleGroupIds={effectiveVisibleGroupIds}
            />
          )}
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
          {selectedMilestone ? (
            <MilestoneDetails
              groups={allGroups}
              milestone={selectedMilestone}
              onDeleted={() => {
                setSelectedMilestoneId(null);
                setSelectedDate(null);
                setMobilePane("details");
              }}
            />
          ) : selectedGroup ? (
            <GroupDetails group={selectedGroup} />
          ) : selectedDate ? (
            <DailyDetails
              date={selectedDate}
              groups={activeGroups}
            />
          ) : (
            <div className="emptyState">
              <p>Select a project or milestone.</p>
            </div>
          )}
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
          aria-pressed={
            mobilePane === "timeline" && primaryView === "timeline"
          }
          onClick={() => {
            setPrimaryView("timeline");
            setMobilePane("timeline");
          }}
          type="button"
        >
          Timeline
        </button>
        <button
          aria-pressed={
            mobilePane === "timeline" && primaryView === "calendar"
          }
          onClick={() => {
            setPrimaryView("calendar");
            setMobilePane("timeline");
          }}
          type="button"
        >
          Calendar
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
