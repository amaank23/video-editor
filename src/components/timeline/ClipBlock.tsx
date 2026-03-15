'use client';

import { useRef } from 'react';
import type { Clip } from '@shared/types/clips';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useMediaStore } from '@/stores/mediaStore';
import { getSnapPoints, snapToNearest } from '@/engine/timeline/TimelineEngine';
import ClipTrimHandle from './ClipTrimHandle';

const CLIP_COLORS: Record<string, string> = {
  video: 'bg-indigo-700 border-indigo-500',
  audio: 'bg-green-800 border-green-600',
  image: 'bg-purple-800 border-purple-600',
  text:  'bg-yellow-800 border-yellow-600',
};

interface ClipBlockProps {
  clip: Clip;
  zoomLevel: number;
  scrollLeftMs: number;
}

/** Apply the same CSS transform to all clip DOM elements in the drag group. */
function setTransformOnClips(ids: string[], translateX: string) {
  for (const id of ids) {
    const el = document.querySelector<HTMLElement>(`[data-clip-id="${id}"]`);
    if (el) el.style.transform = translateX;
  }
}

export default function ClipBlock({ clip, zoomLevel, scrollLeftMs }: ClipBlockProps) {
  const project           = useProjectStore((s) => s.project);
  const moveMultipleClips = useProjectStore((s) => s.moveMultipleClips);
  const selectClip        = useEditorStore((s) => s.selectClip);
  const isSelected        = useEditorStore((s) => s.selection.clipIds.includes(clip.id));

  // For trimEndMs clamping — look up the source asset duration if available
  const assetMap        = useMediaStore((s) => s.assets);
  const sourceDurationMs =
    'assetId' in clip ? (assetMap[(clip as { assetId: string }).assetId]?.durationMs ?? null) : null;

  const blockRef = useRef<HTMLDivElement>(null);
  const dragRef  = useRef<{
    startX: number;
    /** Snapshot of zoomLevel at drag start — avoids stale closure on pointerUp */
    zoomLevel: number;
    origStartMsMap: Record<string, number>;
    dragIds: string[];
  } | null>(null);

  const left  = ((clip.startTimeMs - scrollLeftMs) / 1000) * zoomLevel;
  const width = (clip.durationMs / 1000) * zoomLevel;

  if (left + width < -200 || left > 4000) return null;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).dataset.handle) return;

    // Respect locked tracks
    const track = project.timeline.tracks.find((t) => t.id === clip.trackId);
    if (track?.locked) return;

    e.stopPropagation();

    const currentIds = useEditorStore.getState().selection.clipIds;
    if (e.shiftKey || !currentIds.includes(clip.id)) {
      selectClip(clip.id, e.shiftKey);
    }

    const selectedIds = useEditorStore.getState().selection.clipIds;
    const dragIds = selectedIds.includes(clip.id) ? selectedIds : [...selectedIds, clip.id];

    const origStartMsMap: Record<string, number> = {};
    for (const id of dragIds) {
      origStartMsMap[id] = project.clips[id]?.startTimeMs ?? 0;
    }

    // Capture zoomLevel at drag start — prevents stale closure on pointerUp
    dragRef.current = { startX: e.clientX, zoomLevel, origStartMsMap, dragIds };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const { startX, zoomLevel: z, origStartMsMap, dragIds } = dragRef.current;

    const deltaMs  = ((e.clientX - startX) / z) * 1000;
    const rawMs    = Math.max(0, (origStartMsMap[clip.id] ?? 0) + deltaMs);
    const snapped  = snapToNearest(rawMs, getSnapPoints(project, clip.id), (15 / z) * 1000);
    const offsetPx = ((snapped - (origStartMsMap[clip.id] ?? 0)) / 1000) * z;

    setTransformOnClips(dragIds, `translateX(${offsetPx}px)`);
  }

  function onPointerUp() {
    if (!dragRef.current || !blockRef.current) return;
    const { origStartMsMap, dragIds, zoomLevel: z } = dragRef.current;

    const matrix   = new DOMMatrix(getComputedStyle(blockRef.current).transform);
    const offsetMs = (matrix.m41 / z) * 1000;

    setTransformOnClips(dragIds, '');
    dragRef.current = null;

    moveMultipleClips(
      Object.entries(origStartMsMap).map(([id, origMs]) => ({
        id,
        newStartTimeMs: origMs + offsetMs,
      })),
    );
  }

  return (
    <div
      ref={blockRef}
      data-clip-id={clip.id}
      className={[
        'absolute top-1 bottom-1 rounded border flex items-center overflow-hidden select-none',
        'cursor-grab active:cursor-grabbing',
        CLIP_COLORS[clip.type] ?? 'bg-neutral-700 border-neutral-500',
        isSelected ? 'ring-2 ring-white/50' : '',
      ].join(' ')}
      style={{ left: Math.max(0, left), width: Math.max(4, width), touchAction: 'none' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <ClipTrimHandle side="left"  clip={clip} zoomLevel={zoomLevel} />
      <span className="flex-1 text-xs text-white/80 truncate px-1 pointer-events-none">
        {clip.name}
      </span>
      <ClipTrimHandle side="right" clip={clip} zoomLevel={zoomLevel} sourceDurationMs={sourceDurationMs} />
    </div>
  );
}
