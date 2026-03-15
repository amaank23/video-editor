import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMediaStore } from '@/stores/mediaStore';
import { PlaybackEngine } from '@/engine/playback/PlaybackEngine';
import { CanvasRenderer } from '@/engine/renderer/CanvasRenderer';
import { AudioEngine } from '@/engine/audio/AudioEngine';

/**
 * Wires PlaybackEngine + CanvasRenderer + AudioEngine to the Zustand stores.
 * Call this once inside CanvasPreview.
 */
export function usePlayback(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef   = useRef<PlaybackEngine | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const audioRef    = useRef<AudioEngine | null>(null);
  // Tracks the last playheadMs value written by the engine tick so the seek
  // effect can skip no-op re-renders during playback (engine-driven changes).
  const enginePlayheadRef = useRef(0);

  const setPlayheadMs = useEditorStore((s) => s.setPlayheadMs);
  const setPlaying    = useEditorStore((s) => s.setPlaying);

  // ── Create engines once on mount ──────────────────────────────────────
  useEffect(() => {
    const renderer = new CanvasRenderer();
    const audio    = new AudioEngine();
    rendererRef.current = renderer;
    audioRef.current    = audio;

    const engine = new PlaybackEngine(
      // onTick — called on every rAF frame
      (timeMs) => {
        enginePlayheadRef.current = timeMs;
        setPlayheadMs(timeMs);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const project = useProjectStore.getState().project;
        const assets  = useMediaStore.getState().assets;

        renderer.playVideos(project, assets, timeMs);
        renderer.render(ctx, project, timeMs, assets);
      },
      // onEnded — playhead reached the end
      () => {
        setPlaying(false);
        rendererRef.current?.pauseVideos();
        audioRef.current?.pause();
      },
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      renderer.destroy();
      audio.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── React to isPlaying changes ─────────────────────────────────────────
  const isPlaying    = useEditorStore((s) => s.playback.isPlaying);
  const loopEnabled  = useEditorStore((s) => s.playback.loopEnabled);

  useEffect(() => {
    const engine   = engineRef.current;
    const renderer = rendererRef.current;
    const audio    = audioRef.current;
    if (!engine) return;

    if (isPlaying) {
      const { playheadMs }  = useEditorStore.getState().playback;
      const { timeline }    = useProjectStore.getState().project;
      const durationMs      = timeline.durationMs || 60_000;
      const project         = useProjectStore.getState().project;
      const assets          = useMediaStore.getState().assets;

      audio?.play(project, assets, playheadMs);
      engine.play(playheadMs, durationMs, loopEnabled);
    } else {
      engine.pause();
      renderer?.pauseVideos();
      audio?.pause();

      // Re-render a still frame at the paused position
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx     = canvas.getContext('2d');
        const project = useProjectStore.getState().project;
        const assets  = useMediaStore.getState().assets;
        const timeMs  = useEditorStore.getState().playback.playheadMs;
        if (ctx) {
          renderer?.seekVideos(project, assets, timeMs);
          renderer?.render(ctx, project, timeMs, assets);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── Re-render on external seek (playhead moved while paused) ──────────
  const playheadMs = useEditorStore((s) => s.playback.playheadMs);

  useEffect(() => {
    // Skip engine-driven ticks — the onTick callback already rendered the frame
    if (playheadMs === enginePlayheadRef.current) return;

    const engine   = engineRef.current;
    const renderer = rendererRef.current;
    engine?.seek(playheadMs);

    const canvas = canvasRef.current;
    if (!canvas || !renderer) return;
    const ctx     = canvas.getContext('2d');
    const project = useProjectStore.getState().project;
    const assets  = useMediaStore.getState().assets;
    if (ctx) {
      renderer.seekVideos(project, assets, playheadMs);
      renderer.render(ctx, project, playheadMs, assets);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playheadMs]);
}
