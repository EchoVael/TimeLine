import { useEffect, useState, type FormEvent } from "react";
import type { Group } from "@timemagic/shared";

import {
  useArchiveGroup,
  useUnarchiveGroup,
  useUpdateGroup,
} from "../api/queries.js";

export function GroupDetails({ group }: { group: Group }) {
  const update = useUpdateGroup(group.id);
  const archive = useArchiveGroup(group.id);
  const unarchive = useUnarchiveGroup(group.id);
  const [name, setName] = useState(group.name);
  const [color, setColor] = useState(group.color);
  const [description, setDescription] = useState(group.description);

  useEffect(() => {
    setName(group.name);
    setColor(group.color);
    setDescription(group.description);
  }, [group]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await update.mutateAsync({
      color,
      description,
      expectedVersion: group.version,
      name: name.trim(),
    });
  }

  return (
    <form className="detailsForm" onSubmit={submit}>
      <label>
        <span>Project name</span>
        <input
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>
      <label className="colorField">
        <span>Color</span>
        <input
          aria-label="Project color"
          onChange={(event) => setColor(event.target.value)}
          type="color"
          value={color}
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          maxLength={2_000}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          value={description}
        />
      </label>
      <button
        className="primaryButton"
        disabled={update.isPending || !name.trim()}
        type="submit"
      >
        Save project
      </button>
      {group.archivedAt ? (
        <button
          className="primaryButton"
          disabled={unarchive.isPending}
          onClick={() => void unarchive.mutateAsync(group.version)}
          type="button"
        >
          Unarchive project
        </button>
      ) : (
        <button
          className="dangerButton"
          disabled={archive.isPending}
          onClick={() => archive.mutate(group.version)}
          type="button"
        >
          Archive project
        </button>
      )}
    </form>
  );
}
