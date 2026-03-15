'use client';

import { useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';

interface PlayheadProps {
  /** Pixel x-position relative to the clip area (header already excluded). */
  x: number;
  zoomLevel: number;
}

export default function Playhead({ x, zoomLevel }: PlayheadProps) {
  const setPlayheadMs = useEditorStore((s) => s.setPlayheadMs);
  const dragRef = useRef<{ startX: number; startMs: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    const currentMs = useEditorStore.getState().playback.playheadMs;
    dragRef.current = { startX: e.clientX, startMs: currentMs };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const deltaMs = ((e.clientX - dragRef.current.startX) / zoomLevel) * 1000;
    setPlayheadMs(Math.max(0, dragRef.current.startMs + deltaMs));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: x, transform: 'translateX(-50%)' }}
    >
      {/* Draggable triangle indicator at the top */}
      <div
        className="w-4 h-4 mx-auto cursor-ew-resize pointer-events-auto"
        style={{
          clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
          backgroundColor: '#818cf8',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {/* Vertical line */}
      <div className="w-px bg-indigo-400 h-full mx-auto" />
    </div>
  );
}
