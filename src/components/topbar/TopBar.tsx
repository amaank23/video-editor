'use client';

import ProjectNameInput from './ProjectNameInput';
import UndoRedoButtons from './UndoRedoButtons';
import ExportButton from './ExportButton';

export default function TopBar() {
  return (
    <div className="flex items-center justify-between h-full px-4 gap-4">
      {/* Left: Logo + project name */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-bold text-indigo-400 shrink-0">VideoEditor</span>
        <ProjectNameInput />
      </div>

      {/* Center: Undo / Redo */}
      <div className="flex items-center gap-1">
        <UndoRedoButtons />
      </div>

      {/* Right: Export */}
      <div className="flex items-center gap-2">
        <ExportButton />
      </div>
    </div>
  );
}
