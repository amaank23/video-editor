'use client';

import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';

export default function PropertiesPanel() {
  const selectedClipIds = useEditorStore((s) => s.selection.clipIds);
  const clips = useProjectStore((s) => s.project.clips);

  const selectedClip = selectedClipIds.length === 1 ? clips[selectedClipIds[0]] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex-none px-3 py-2 border-b border-neutral-700">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedClip ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-600 px-4 text-center">
            <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            <p className="text-xs">Select a clip to edit its properties</p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Clip info */}
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider">Clip</label>
              <p className="text-sm text-neutral-200 mt-1 truncate">{selectedClip.name}</p>
              <p className="text-xs text-neutral-500 capitalize">{selectedClip.type}</p>
            </div>

            {/* Position placeholder */}
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-2">Transform</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 w-8">X</span>
                  <input
                    type="number"
                    value={Math.round(selectedClip.transform.x * 100)}
                    readOnly
                    className="flex-1 bg-neutral-800 text-xs text-neutral-200 px-2 py-1 rounded border border-neutral-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 w-8">Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedClip.transform.y * 100)}
                    readOnly
                    className="flex-1 bg-neutral-800 text-xs text-neutral-200 px-2 py-1 rounded border border-neutral-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 w-8">Opacity</span>
                  <input
                    type="number"
                    value={Math.round(selectedClip.transform.opacity * 100)}
                    readOnly
                    className="flex-1 bg-neutral-800 text-xs text-neutral-200 px-2 py-1 rounded border border-neutral-700"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-600 italic">Full property editing in Phase 4</p>
          </div>
        )}
      </div>
    </div>
  );
}
