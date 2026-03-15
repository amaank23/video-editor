import { useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';

export function useKeyboardShortcuts() {
  const undo                = useProjectStore((s) => s.undo);
  const redo                = useProjectStore((s) => s.redo);
  const removeMultipleClips = useProjectStore((s) => s.removeMultipleClips);
  const splitClip           = useProjectStore((s) => s.splitClip);
  const selectedClipIds     = useEditorStore((s) => s.selection.clipIds);
  const clearSelection      = useEditorStore((s) => s.clearSelection);
  const setPlaying          = useEditorStore((s) => s.setPlaying);
  const setPlayheadMs       = useEditorStore((s) => s.setPlayheadMs);
  const setInPoint          = useEditorStore((s) => s.setInPoint);
  const setOutPoint         = useEditorStore((s) => s.setOutPoint);
  const setShuttleRate      = useEditorStore((s) => s.setShuttleRate);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Never intercept while the user is typing
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      // Space — toggle play / pause (read live state to avoid stale closure)
      if (e.code === 'Space') {
        e.preventDefault();
        const currentlyPlaying = useEditorStore.getState().playback.isPlaying;
        if (currentlyPlaying) {
          setShuttleRate(1);
          setPlaying(false);
        } else {
          setPlaying(true);
        }
        return;
      }

      // Delete / Backspace — remove selected clips (single undo entry)
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedClipIds.length > 0) {
        e.preventDefault();
        const clips = useProjectStore.getState().project.clips;
        const validIds = selectedClipIds.filter((id) => !!clips[id]);
        if (validIds.length > 0) removeMultipleClips(validIds);
        clearSelection();
        return;
      }

      // Ctrl/Cmd+Z — undo   Ctrl/Cmd+Shift+Z — redo
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Ctrl/Cmd+Y — redo (Windows convention)
      if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
        return;
      }

      // S — split selected clip at playhead
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && selectedClipIds.length === 1) {
        e.preventDefault();
        const playheadMs = useEditorStore.getState().playback.playheadMs;
        splitClip(selectedClipIds[0], playheadMs);
        return;
      }

      // Arrow Left / Right — nudge playhead by one frame
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const { playheadMs } = useEditorStore.getState().playback;
        const fps = useProjectStore.getState().project.settings.fps;
        const frameDurationMs = Math.round(1000 / fps);
        const durationMs = useProjectStore.getState().project.timeline.durationMs;
        const delta = e.code === 'ArrowRight' ? frameDurationMs : -frameDurationMs;
        setPlayheadMs(Math.min(durationMs, Math.max(0, playheadMs + delta)));
        return;
      }

      // J — shuttle reverse 2×
      if (e.code === 'KeyJ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShuttleRate(-2);
        setPlaying(true);
        return;
      }

      // K — pause and reset shuttle rate
      if (e.code === 'KeyK' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShuttleRate(1);
        setPlaying(false);
        return;
      }

      // L — shuttle forward 2×
      if (e.code === 'KeyL' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShuttleRate(2);
        setPlaying(true);
        return;
      }

      // [ — set in-point at current playhead
      if (e.code === 'BracketLeft') {
        e.preventDefault();
        const { playheadMs } = useEditorStore.getState().playback;
        setInPoint(playheadMs);
        return;
      }

      // ] — set out-point at current playhead
      if (e.code === 'BracketRight') {
        e.preventDefault();
        const { playheadMs } = useEditorStore.getState().playback;
        setOutPoint(playheadMs);
        return;
      }

      // Escape — clear selection (skip if export modal is open)
      if (e.code === 'Escape') {
        if (useEditorStore.getState().exportModalOpen) return;
        e.preventDefault();
        clearSelection();
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    undo, redo, removeMultipleClips, splitClip,
    selectedClipIds, clearSelection,
    setPlaying, setPlayheadMs,
    setInPoint, setOutPoint, setShuttleRate,
  ]);
}
