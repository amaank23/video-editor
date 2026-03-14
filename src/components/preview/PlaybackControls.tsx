'use client';

import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { msToTimecode } from '@/lib/utils/time';

export default function PlaybackControls() {
  const { isPlaying, playheadMs } = useEditorStore((s) => s.playback);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setPlayheadMs = useEditorStore((s) => s.setPlayheadMs);
  const durationMs = useProjectStore((s) => s.project.timeline.durationMs);

  function handlePlayPause() {
    // Full playback engine connected in Phase 3
    setPlaying(!isPlaying);
  }

  function handleStop() {
    setPlaying(false);
    setPlayheadMs(0);
  }

  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4">
      {/* Stop */}
      <button
        onClick={handleStop}
        title="Stop"
        className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        className="p-2 rounded-full bg-white text-neutral-900 hover:bg-neutral-200 transition-colors"
      >
        {isPlaying ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        )}
      </button>

      {/* Time display */}
      <span className="text-xs text-neutral-400 font-mono tabular-nums w-24 text-center">
        {msToTimecode(playheadMs)} / {msToTimecode(durationMs)}
      </span>
    </div>
  );
}
