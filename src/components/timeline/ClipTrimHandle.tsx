'use client';

import { useRef } from 'react';
import type { Clip } from '@shared/types/clips';
import { useProjectStore } from '@/stores/projectStore';

interface ClipTrimHandleProps {
  side: 'left' | 'right';
  clip: Clip;
  zoomLevel: number;
  /** Total duration of the source asset in ms — used to clamp the right handle. */
  sourceDurationMs?: number | null;
}

const MIN_DURATION_MS = 100;

export default function ClipTrimHandle({ side, clip, zoomLevel, sourceDurationMs }: ClipTrimHandleProps) {
  const updateClip  = useProjectStore((s) => s.updateClip);
  const pushHistory = useProjectStore((s) => s.pushHistory);

  const dragRef = useRef<{
    startX: number;
    origStartMs: number;
    origDurationMs: number;
    origTrimStartMs: number;
    origTrimEndMs: number;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      origStartMs: clip.startTimeMs,
      origDurationMs: clip.durationMs,
      origTrimStartMs: clip.trimStartMs,
      origTrimEndMs: clip.trimEndMs,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const { startX, origStartMs, origDurationMs, origTrimStartMs, origTrimEndMs } = dragRef.current;
    const deltaMs = ((e.clientX - startX) / zoomLevel) * 1000;

    if (side === 'left') {
      const clampedDelta = Math.min(deltaMs, origDurationMs - MIN_DURATION_MS);
      const newTrimStartMs = Math.max(0, origTrimStartMs + clampedDelta);
      const appliedDelta = newTrimStartMs - origTrimStartMs;
      updateClip(clip.id, {
        startTimeMs: origStartMs + appliedDelta,
        durationMs: origDurationMs - appliedDelta,
        trimStartMs: newTrimStartMs,
      } as Partial<Clip>);
    } else {
      const maxTrimEnd = sourceDurationMs ?? Infinity;
      const rawTrimEnd = origTrimEndMs + deltaMs;
      const newTrimEndMs = Math.min(maxTrimEnd, Math.max(origTrimStartMs + MIN_DURATION_MS, rawTrimEnd));
      const newDurationMs = newTrimEndMs - origTrimStartMs;
      updateClip(clip.id, {
        durationMs: newDurationMs,
        trimEndMs: newTrimEndMs,
      } as Partial<Clip>);
    }
  }

  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    pushHistory();
  }

  return (
    <div
      data-handle={side}
      className="flex-none w-2 h-full flex items-center justify-center cursor-ew-resize shrink-0 opacity-0 hover:opacity-100 transition-opacity z-10"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="w-0.5 h-4 bg-white/70 rounded-full pointer-events-none" />
    </div>
  );
}
