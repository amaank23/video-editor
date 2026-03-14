'use client';

import { useProjectStore } from '@/stores/projectStore';

export default function UndoRedoButtons() {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);

  return (
    <>
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 10H17C19.761 10 22 12.239 22 15C22 17.761 19.761 20 17 20H12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6L3 10L7 14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 10H7C4.239 10 2 12.239 2 15C2 17.761 4.239 20 7 20H12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 6L21 10L17 14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}
