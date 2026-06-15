import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Group } from "@timemagic/shared";
import { Eye, GripVertical, Plus } from "lucide-react";

import { useGroups, useReorderGroups } from "../api/queries.js";
import { IconButton } from "../components/IconButton.js";
import { GroupForm } from "./GroupForm.js";

interface GroupSidebarProps {
  onSelect: (groupId: string) => void;
  onVisibleGroupIdsChange: (groupIds: string[]) => void;
  selectedGroupId: string | null;
  visibleGroupIds: string[];
}

interface SortableGroupRowProps {
  group: Group;
  onOnly: () => void;
  onSelect: () => void;
  onToggle: () => void;
  selected: boolean;
  visible: boolean;
}

function SortableGroupRow({
  group,
  onOnly,
  onSelect,
  onToggle,
  selected,
  visible,
}: SortableGroupRowProps) {
  const sortable = useSortable({ id: group.id });
  return (
    <div
      className="groupRow"
      data-selected={selected}
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      <button
        aria-label={`Reorder ${group.name}`}
        className="dragHandle"
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical aria-hidden size={15} />
      </button>
      <input
        aria-label={`Show ${group.name}`}
        checked={visible}
        onChange={onToggle}
        type="checkbox"
      />
      <button
        className="groupLabelButton"
        onClick={onSelect}
        type="button"
        aria-label={`Open ${group.name}`}
      >
        <span
          aria-hidden
          className="groupSwatch"
          style={{ backgroundColor: group.color }}
        />
        <span>{group.name}</span>
      </button>
      <IconButton
        icon={Eye}
        label={`Only ${group.name}`}
        onClick={onOnly}
      />
    </div>
  );
}

function ArchivedGroupRow({
  group,
  onSelect,
  selected,
}: {
  group: Group;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <div
      className="groupRow groupRow--archived"
      data-selected={selected}
    >
      <span className="archivedRowSpacer" />
      <span className="groupSwatch" style={{ backgroundColor: group.color }} />
      <button
        aria-label={`Open ${group.name}`}
        className="groupLabelButton groupLabelButton--archived"
        onClick={onSelect}
        type="button"
      >
        <span>{group.name}</span>
      </button>
      <span className="archivedBadge">Archived</span>
    </div>
  );
}

export function GroupSidebar({
  onSelect,
  onVisibleGroupIdsChange,
  selectedGroupId,
  visibleGroupIds,
}: GroupSidebarProps) {
  const groups = useGroups(true);
  const reorder = useReorderGroups();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const allItems = groups.data?.items ?? [];
  const items = allItems.filter(({ archivedAt }) => !archivedAt);
  const archivedItems = allItems.filter(({ archivedAt }) => archivedAt);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }
    const oldIndex = items.findIndex(({ id }) => id === event.active.id);
    const newIndex = items.findIndex(({ id }) => id === event.over?.id);
    const ordered = arrayMove(items, oldIndex, newIndex);
    await reorder.mutateAsync({
      expectedVersions: Object.fromEntries(
        items.map(({ id, version }) => [id, version]),
      ),
      orderedIds: ordered.map(({ id }) => id),
    });
  }

  return (
    <div className="groupSidebarContent">
      <div className="sidebarActions">
        <span>{items.length ? "Visible projects" : "No projects yet"}</span>
        <IconButton
          icon={Plus}
          label="New project"
          onClick={() => setCreating(true)}
        />
      </div>

      {creating ? <GroupForm onCancel={() => setCreating(false)} /> : null}

      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext
          items={items.map(({ id }) => id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="groupList">
            {items.map((group) => (
              <SortableGroupRow
                group={group}
                key={group.id}
                onOnly={() => onVisibleGroupIdsChange([group.id])}
                onSelect={() => onSelect(group.id)}
                onToggle={() =>
                  onVisibleGroupIdsChange(
                    visibleGroupIds.includes(group.id)
                      ? visibleGroupIds.filter((id) => id !== group.id)
                      : [...visibleGroupIds, group.id],
                  )
                }
                selected={selectedGroupId === group.id}
                visible={visibleGroupIds.includes(group.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {archivedItems.length > 0 ? (
        <div className="archivedProjects">
          <label className="archivedToggle">
            <input
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              type="checkbox"
            />
            <span>Show archived projects</span>
          </label>
          {showArchived ? (
            <div className="groupList">
              {archivedItems.map((group) => (
                <ArchivedGroupRow
                  group={group}
                  key={group.id}
                  onSelect={() => onSelect(group.id)}
                  selected={selectedGroupId === group.id}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
