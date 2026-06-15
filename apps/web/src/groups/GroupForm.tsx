import { useState, type FormEvent } from "react";

import { useCreateGroup } from "../api/queries.js";

interface GroupFormProps {
  onCancel: () => void;
}

export function GroupForm({ onCancel }: GroupFormProps) {
  const createGroup = useCreateGroup();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#177d67");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    await createGroup.mutateAsync({ color, name: trimmedName });
    onCancel();
  }

  return (
    <form className="groupCreateForm" onSubmit={submit}>
      <label>
        <span>Project name</span>
        <input
          autoFocus
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
      <div className="formActions">
        <button className="textButton" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="primaryButton"
          disabled={createGroup.isPending || !name.trim()}
          type="submit"
        >
          Create project
        </button>
      </div>
    </form>
  );
}
