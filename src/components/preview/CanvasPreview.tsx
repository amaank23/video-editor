'use client';

import { useEffect, useRef } from 'react';
import PlaybackControls from './PlaybackControls';
import { useProjectStore } from '@/stores/projectStore';

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = useProjectStore((s) => s.project.settings);

  // Paint a black canvas background on mount and when settings change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [settings.backgroundColor]);

  // Maintain aspect ratio within the container using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const aspectRatio = settings.width / settings.height;

    function resize() {
      const cw = container!.clientWidth - 32; // 16px padding each side
      const ch = container!.clientHeight - 32;
      let w = cw;
      let h = cw / aspectRatio;
      if (h > ch) {
        h = ch;
        w = ch * aspectRatio;
      }
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
    }

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    return () => observer.disconnect();
  }, [settings.width, settings.height]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center min-h-0 p-4">
        <canvas
          ref={canvasRef}
          width={settings.width}
          height={settings.height}
          className="shadow-2xl shadow-black/60"
          style={{ background: settings.backgroundColor }}
        />
      </div>

      {/* Playback controls */}
      <div className="flex-none border-t border-neutral-800">
        <PlaybackControls />
      </div>
    </div>
  );
}
