'use client';

import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { msToTimecode } from '@/lib/utils/time';
import { useRef, useCallback } from 'react';

const TRACK_HEIGHT = 56;
const HEADER_WIDTH = 120;

export default function Timeline() {
  const tracks = useProjectStore((s) => s.project.timeline.tracks);
  const clips = useProjectStore((s) => s.project.clips);
  const durationMs = useProjectStore((s) => s.project.timeline.durationMs);

  const playheadMs = useEditorStore((s) => s.playback.playheadMs);
  const { zoomLevel, scrollLeftMs } = useEditorStore((s) => s.timelineViewport);
  const setPlayheadMs = useEditorStore((s) => s.setPlayheadMs);
  const setScrollLeftMs = useEditorStore((s) => s.setScrollLeftMs);
  const setZoom = useEditorStore((s) => s.setZoom);

  const rulerRef = useRef<HTMLDivElement>(null);

  // Convert ms to pixels
  const msToX = useCallback((ms: number) => ((ms - scrollLeftMs) / 1000) * zoomLevel, [scrollLeftMs, zoomLevel]);

  // Click on ruler to seek
  function handleRulerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const clickMs = (x / zoomLevel) * 1000 + scrollLeftMs;
    setPlayheadMs(Math.max(0, clickMs));
  }

  // Wheel to zoom
  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(zoomLevel * factor);
    } else {
      setScrollLeftMs(scrollLeftMs + (e.deltaY / zoomLevel) * 1000 * 10);
    }
  }

  // Build ruler ticks
  const totalMs = Math.max(durationMs, 30_000);
  const tickIntervalMs = zoomLevel >= 200 ? 1000 : zoomLevel >= 50 ? 5000 : 10_000;
  const visibleDurationMs = 10_000 / (zoomLevel / 100); // rough estimate
  const ticks: number[] = [];
  const startTick = Math.floor(scrollLeftMs / tickIntervalMs) * tickIntervalMs;
  for (let t = startTick; t <= scrollLeftMs + visibleDurationMs + tickIntervalMs * 2; t += tickIntervalMs) {
    if (t >= 0) ticks.push(t);
  }

  const playheadX = msToX(playheadMs);

  return (
    <div
      className="flex flex-col h-full bg-neutral-900 overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Time ruler */}
      <div className="flex flex-none h-7 border-b border-neutral-700">
        {/* Track header spacer */}
        <div className="flex-none bg-neutral-850 border-r border-neutral-700" style={{ width: HEADER_WIDTH }} />

        {/* Ruler clicks */}
        <div
          ref={rulerRef}
          className="flex-1 relative overflow-hidden cursor-pointer bg-neutral-850"
          onClick={handleRulerClick}
        >
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: msToX(t) }}
            >
              <div className="w-px h-2 bg-neutral-600" />
              <span className="text-xs text-neutral-500 mt-0.5 select-none" style={{ fontSize: 10 }}>
                {msToTimecode(t)}
              </span>
            </div>
          ))}

          {/* Playhead on ruler */}
          <div
            className="absolute top-0 w-px h-full bg-indigo-400 pointer-events-none"
            style={{ left: playheadX }}
          />
        </div>
      </div>

      {/* Track area */}
      <div className="flex flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Track headers */}
        <div
          className="flex-none flex flex-col border-r border-neutral-700 bg-neutral-850"
          style={{ width: HEADER_WIDTH }}
        >
          {tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-2 px-2 border-b border-neutral-800"
              style={{ height: TRACK_HEIGHT }}
            >
              {/* Mute button */}
              <button
                className={`w-5 h-5 rounded text-xs flex items-center justify-center transition-colors ${
                  track.muted ? 'bg-yellow-600 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={track.muted ? 'Unmute' : 'Mute'}
              >
                M
              </button>
              {/* Track name */}
              <span className="text-xs text-neutral-300 truncate flex-1">{track.name}</span>
            </div>
          ))}

          {tracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-600 px-2 text-center">
              No tracks
            </div>
          )}
        </div>

        {/* Clip lanes */}
        <div className="flex-1 relative overflow-hidden">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="relative border-b border-neutral-800"
              style={{ height: TRACK_HEIGHT }}
            >
              {/* Drop zone hint */}
              <div className="absolute inset-0 bg-neutral-900/50" />

              {/* Clips */}
              {track.clipIds.map((clipId) => {
                const clip = clips[clipId];
                if (!clip) return null;
                const left = msToX(clip.startTimeMs);
                const width = (clip.durationMs / 1000) * zoomLevel;
                if (left + width < 0 || left > 2000) return null; // simple culling

                const colors: Record<string, string> = {
                  video: 'bg-indigo-700 border-indigo-500',
                  audio: 'bg-green-800 border-green-600',
                  image: 'bg-purple-800 border-purple-600',
                  text: 'bg-yellow-800 border-yellow-600',
                };

                return (
                  <div
                    key={clipId}
                    className={`absolute top-1 bottom-1 rounded border ${colors[clip.type] ?? 'bg-neutral-700 border-neutral-500'} flex items-center px-2 overflow-hidden cursor-pointer select-none`}
                    style={{ left: Math.max(0, left), width: Math.max(4, width) }}
                    title={clip.name}
                  >
                    <span className="text-xs text-white/80 truncate">{clip.name}</span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Playhead line over clips */}
          <div
            className="absolute top-0 bottom-0 w-px bg-indigo-400 pointer-events-none z-10"
            style={{ left: playheadX }}
          />
        </div>
      </div>
    </div>
  );
}
