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
  const pendingRenderRef  = useRef<number | null>(null);

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
      if (pendingRenderRef.current !== null) {
        cancelAnimationFrame(pendingRenderRef.current);
        pendingRenderRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── React to isPlaying changes ─────────────────────────────────────────
  const isPlaying    = useEditorStore((s) => s.playback.isPlaying);
  const loopEnabled  = useEditorStore((s) => s.playback.loopEnabled);
  const shuttleRate  = useEditorStore((s) => s.playback.shuttleRate);

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
      engine.setRate(useEditorStore.getState().playback.shuttleRate);
    } else {
      engine.pause();
      renderer?.pauseVideos();
      audio?.pause();

      // Seek to the paused position; re-render once seeks complete
      const canvas = canvasRef.current;
      if (canvas && renderer) {
        const project = useProjectStore.getState().project;
        const assets  = useMediaStore.getState().assets;
        const timeMs  = useEditorStore.getState().playback.playheadMs;
        seekAndRender(renderer, canvasRef, engineRef, project, assets, timeMs);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── Update engine rate when shuttle rate changes ──────────────────────
  useEffect(() => {
    engineRef.current?.setRate(shuttleRate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuttleRate]);

  // ── Re-render when project changes (clip edited, added, moved) ───────
  // updatedAt changes on every projectStore mutation so the canvas stays
  // in sync with the properties panel without the user having to scrub.
  // We coalesce rapid updates (e.g. continuous timeline drag) via rAF so
  // we render at most once per display frame while paused.
  const projectUpdatedAt = useProjectStore((s) => s.project.updatedAt);

  useEffect(() => {
    if (engineRef.current?.isRunning) return; // engine already renders every frame
    if (pendingRenderRef.current !== null) return; // frame already queued

    pendingRenderRef.current = requestAnimationFrame(() => {
      pendingRenderRef.current = null;
      const renderer = rendererRef.current;
      const canvas   = canvasRef.current;
      if (!canvas || !renderer) return;
      const ctx     = canvas.getContext('2d');
      const project = useProjectStore.getState().project;
      const assets  = useMediaStore.getState().assets;
      const timeMs  = useEditorStore.getState().playback.playheadMs;
      if (ctx) renderer.render(ctx, project, timeMs, assets);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectUpdatedAt]);

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

    const project = useProjectStore.getState().project;
    const assets  = useMediaStore.getState().assets;

    // Render immediately: thumbnails fill the video area when readyState < 2,
    // so the canvas never goes black.  seekAndRender then re-renders once every
    // active video fires `seeked` (readyState >= 2) to swap in the real frame.
    const ctx = canvas.getContext('2d');
    if (ctx) renderer.render(ctx, project, playheadMs, assets);

    seekAndRender(renderer, canvasRef, engineRef, project, assets, playheadMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playheadMs]);
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Tell the renderer to seek all active video elements to `timeMs`, then
 * re-render the canvas once all `seeked` events have fired.
 *
 * Because seekVideos() uses the `onseeked` *property* (not addEventListener),
 * calling this again for a new scrub position overwrites the previous handler,
 * so only the last seek in a rapid scrub sequence triggers a render.
 */
function seekAndRender(
  renderer: CanvasRenderer,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  engineRef: React.RefObject<PlaybackEngine | null>,
  project: import('@shared/types/project').Project,
  assets: Record<string, import('@shared/types/media').MediaAsset>,
  timeMs: number,
) {
  renderer.seekVideos(project, assets, timeMs, () => {
    const c = canvasRef.current;
    if (!c || engineRef.current?.isRunning) return;
    const c2d  = c.getContext('2d');
    const proj = useProjectStore.getState().project;
    const ast  = useMediaStore.getState().assets;
    const tMs  = useEditorStore.getState().playback.playheadMs;
    if (c2d) renderer.render(c2d, proj, tMs, ast);
  });
}
