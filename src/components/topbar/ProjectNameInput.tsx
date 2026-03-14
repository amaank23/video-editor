'use client';

import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';

export default function ProjectNameInput() {
  const name = useProjectStore((s) => s.project.name);
  const updateProjectName = useProjectStore((s) => s.updateProjectName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function startEdit() {
    setDraft(name);
    setEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed) updateProjectName(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitEdit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="bg-neutral-800 text-white text-sm px-2 py-1 rounded border border-indigo-500 outline-none min-w-0 max-w-48"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to rename project"
      className="text-sm text-neutral-200 hover:text-white truncate max-w-48 text-left"
    >
      {name}
    </button>
  );
}
