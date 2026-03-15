'use client';

import { useRef, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { msToTimecode } from '@/lib/utils/time';
import { DEFAULT_TRANSFORM } from '@/stores/projectStore';
import TrackHeader from './TrackHeader';
import ClipBlock from './ClipBlock';
import Playhead from './Playhead';
import type { Clip, TrackType } from '@shared/types/clips';

const TRACK_HEIGHT  = 56;
const HEADER_WIDTH  = 128;
const MIN_ZOOM      = 10;
const MAX_ZOOM      = 1000;
const MAX_TICKS     = 200;

export default function Timeline() {
  useKeyboardShortcuts();

  const tracks      = useProjectStore((s) => s.project.timeline.tracks);
  const clips       = useProjectStore((s) => s.project.clips);
  const durationMs  = useProjectStore((s) => s.project.timeline.durationMs);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const playheadMs      = useEditorStore((s) => s.playback.playheadMs);
  const { zoomLevel, scrollLeftMs } = useEditorStore((s) => s.timelineViewport);
  const setPlayheadMs   = useEditorStore((s) => s.setPlayheadMs);
  const setScrollLeftMs = useEditorStore((s) => s.setScrollLeftMs);
  const setZoom         = useEditorStore((s) => s.setZoom);

  const addClip  = useProjectStore((s) => s.addClip);
  const addTrack = useProjectStore((s) => s.addTrack);
  const assets   = useMediaStore((s) => s.assets);

  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef     = useRef<HTMLDivElement>(null);
  const lanesRef     = useRef<HTMLDivElement>(null);
  const rulerDragRef = useRef<{ startX: number; startMs: number } | null>(null);

  // ms → pixel offset relative to the ruler/clip area (header excluded)
  const msToX = useCallback(
    (ms: number) => ((ms - scrollLeftMs) / 1000) * zoomLevel,
    [scrollLeftMs, zoomLevel],
  );

  // ── Passive-safe wheel handler ─────────────────────────────────────────
  // React 19 attaches wheel listeners as passive by default; calling
  // e.preventDefault() in an onWheel prop is silently ignored.
  // We attach manually with { passive: false } so Ctrl+scroll zoom works.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const { zoomLevel: z } = useEditorStore.getState().timelineViewport;
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
      } else {
        const { zoomLevel: z, scrollLeftMs: s } = useEditorStore.getState().timelineViewport;
        setScrollLeftMs(s + (e.deltaY / z) * 1000 * 10);
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setZoom, setScrollLeftMs]);

  // ── Ruler scrub (click + drag) ─────────────────────────────────────────
  function rulerClientXToMs(clientX: number) {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, ((clientX - rect.left) / zoomLevel) * 1000 + scrollLeftMs);
  }

  function onRulerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const ms = rulerClientXToMs(e.clientX);
    setPlayheadMs(ms);
    rulerDragRef.current = { startX: e.clientX, startMs: ms };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onRulerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!rulerDragRef.current) return;
    setPlayheadMs(rulerClientXToMs(e.clientX));
  }

  function onRulerPointerUp() {
    rulerDragRef.current = null;
  }

  // ── Ruler ticks ────────────────────────────────────────────────────────
  const totalMs = Math.max(durationMs, 30_000);
  const tickIntervalMs =
    zoomLevel >= 200 ? 1_000 : zoomLevel >= 60 ? 5_000 : 10_000;
  const visibleMs = (rulerRef.current?.clientWidth ?? 800) / zoomLevel * 1000;
  const ticks: number[] = [];
  const startTick = Math.floor(scrollLeftMs / tickIntervalMs) * tickIntervalMs;
  for (let t = startTick; t <= scrollLeftMs + visibleMs + tickIntervalMs; t += tickIntervalMs) {
    if (t >= 0 && t <= totalMs + tickIntervalMs) {
      ticks.push(t);
      if (ticks.length >= MAX_TICKS) break;
    }
  }

  // ── Asset drag-and-drop from media library ─────────────────────────────
  function onLanesDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes('application/x-asset-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function onLanesDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('application/x-asset-id');
    if (!assetId) return;

    const asset = assets[assetId];
    if (!asset) return;

    // Calculate drop time from X position within the lanes area
    const lanesRect = lanesRef.current?.getBoundingClientRect();
    if (!lanesRect) return;
    const dropX  = e.clientX - lanesRect.left;
    const dropMs = Math.max(0, (dropX / zoomLevel) * 1000 + scrollLeftMs);

    // Calculate which track row was targeted from Y position
    const dropY    = e.clientY - lanesRect.top;
    const rowIndex = Math.floor(dropY / TRACK_HEIGHT);
    const targetRow = tracks[rowIndex]; // actual track at the dropped row

    // Determine asset→track type mapping
    const neededType: TrackType = asset.type === 'audio' ? 'audio'
      : asset.type === 'image' ? 'overlay'
      : 'video';

    // If dropped directly on a compatible track, use it.
    // Otherwise find the last compatible track or create one.
    let targetTrackId: string;
    if (targetRow && targetRow.type === neededType) {
      targetTrackId = targetRow.id;
    } else {
      const compatible = tracks.filter((t) => t.type === neededType);
      if (compatible.length > 0) {
        targetTrackId = compatible[compatible.length - 1].id;
      } else {
        targetTrackId = addTrack(neededType, asset.type === 'audio' ? 'Audio' : asset.type === 'image' ? 'Overlay' : 'Video');
      }
    }

    const clipDurationMs = asset.durationMs ?? 5_000;

    // Build clip depending on asset type
    const base = {
      id: nanoid(),
      trackId: targetTrackId,
      startTimeMs: dropMs,
      durationMs: clipDurationMs,
      trimStartMs: 0,
      trimEndMs: clipDurationMs,
      transform: { ...DEFAULT_TRANSFORM },
      animations: [],
      name: asset.name,
      locked: false,
      visible: true,
    };

    let clip: Clip;
    if (asset.type === 'video') {
      clip = { ...base, type: 'video', assetId: assetId, volume: 1, playbackRate: 1 };
    } else if (asset.type === 'audio') {
      clip = { ...base, type: 'audio', assetId: assetId, volume: 1, playbackRate: 1, fadeInMs: 0, fadeOutMs: 0 };
    } else {
      clip = { ...base, type: 'image', assetId: assetId };
    }

    addClip(clip);
  }

  const playheadX = msToX(playheadMs);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-neutral-900 overflow-hidden"
    >
      {/* ── Time ruler ──────────────────────────────────────────────────── */}
      <div className="flex flex-none h-7 border-b border-neutral-700">
        {/* Header spacer */}
        <div
          className="flex-none bg-neutral-850 border-r border-neutral-700"
          style={{ width: HEADER_WIDTH }}
        />

        {/* Ruler — draggable scrub surface */}
        <div
          ref={rulerRef}
          className="flex-1 relative overflow-hidden cursor-col-resize bg-neutral-850 select-none"
          onPointerDown={onRulerPointerDown}
          onPointerMove={onRulerPointerMove}
          onPointerUp={onRulerPointerUp}
        >
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-center pointer-events-none"
              style={{ left: msToX(t) }}
            >
              <div className="w-px h-2 bg-neutral-600" />
              <span className="text-neutral-500 mt-0.5 select-none" style={{ fontSize: 9 }}>
                {msToTimecode(t)}
              </span>
            </div>
          ))}

          {/* Playhead line on ruler */}
          <div
            className="absolute top-0 bottom-0 w-px bg-indigo-400 pointer-events-none"
            style={{ left: playheadX }}
          />
        </div>
      </div>

      {/* ── Track area ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Track headers */}
        <div
          className="flex-none flex flex-col border-r border-neutral-700"
          style={{ width: HEADER_WIDTH }}
        >
          {tracks.map((track) => (
            <TrackHeader key={track.id} track={track} height={TRACK_HEIGHT} />
          ))}
          {tracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-600 px-2 text-center">
              No tracks
            </div>
          )}
        </div>

        {/* Clip lanes */}
        <div
          ref={lanesRef}
          className="flex-1 relative overflow-hidden"
          onClick={clearSelection}
          onDragOver={onLanesDragOver}
          onDrop={onLanesDrop}
        >
          {tracks.map((track) => (
            <div
              key={track.id}
              className="relative border-b border-neutral-800"
              style={{ height: TRACK_HEIGHT }}
            >
              <div className="absolute inset-0 bg-neutral-900/40" />
              {track.clipIds.map((clipId) => {
                const clip = clips[clipId];
                if (!clip) return null;
                return (
                  <ClipBlock
                    key={clipId}
                    clip={clip}
                    zoomLevel={zoomLevel}
                    scrollLeftMs={scrollLeftMs}
                  />
                );
              })}
            </div>
          ))}

          {/* Playhead line over clips */}
          <Playhead x={playheadX} zoomLevel={zoomLevel} />
        </div>
      </div>
    </div>
  );
}
