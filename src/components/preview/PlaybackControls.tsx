'use client';

import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { msToTimecode } from '@/lib/utils/time';

export default function PlaybackControls() {
  const { isPlaying, playheadMs, loopEnabled } = useEditorStore((s) => s.playback);
  const setPlaying    = useEditorStore((s) => s.setPlaying);
  const setPlayheadMs = useEditorStore((s) => s.setPlayheadMs);
  const toggleLoop    = useEditorStore((s) => s.toggleLoop);
  const durationMs    = useProjectStore((s) => s.project.timeline.durationMs);

  function handlePlayPause() {
    setPlaying(!isPlaying);
  }

  function handleStop() {
    setPlaying(false);
    setPlayheadMs(0);
  }

  // Progress bar 0-1
  const progress = durationMs > 0 ? Math.min(1, playheadMs / durationMs) : 0;

  return (
    <div className="flex flex-col gap-1.5 py-2 px-4">
      {/* Progress bar */}
      <div
        className="h-1 bg-neutral-700 rounded-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (durationMs <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setPlayheadMs(ratio * durationMs);
        }}
      >
        <div
          className="h-full bg-indigo-500 rounded-full transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-center gap-2">
        {/* Stop */}
        <button
          onClick={handleStop}
          title="Stop (go to start)"
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
              <rect x="6"  y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          )}
        </button>

        {/* Loop toggle */}
        <button
          onClick={toggleLoop}
          title={loopEnabled ? 'Loop on' : 'Loop off'}
          className={`p-1.5 rounded transition-colors ${
            loopEnabled
              ? 'text-indigo-400 bg-indigo-900/40'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>

        {/* Timecode */}
        <span className="text-xs text-neutral-400 font-mono tabular-nums ml-1">
          {msToTimecode(playheadMs)} / {msToTimecode(durationMs)}
        </span>
      </div>
    </div>
  );
}
