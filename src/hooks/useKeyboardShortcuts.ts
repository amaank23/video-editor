import { useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';

export function useKeyboardShortcuts() {
  const undo          = useProjectStore((s) => s.undo);
  const redo          = useProjectStore((s) => s.redo);
  const removeClip    = useProjectStore((s) => s.removeClip);
  const splitClip     = useProjectStore((s) => s.splitClip);
  const selectedClipIds = useEditorStore((s) => s.selection.clipIds);
  const clearSelection  = useEditorStore((s) => s.clearSelection);
  const isPlaying       = useEditorStore((s) => s.playback.isPlaying);
  const setPlaying      = useEditorStore((s) => s.setPlaying);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Never intercept while the user is typing
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      // Space — toggle play / pause
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!isPlaying);
        return;
      }

      // Delete / Backspace — remove selected clips
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedClipIds.length > 0) {
        e.preventDefault();
        const ids = useProjectStore.getState().project.clips;
        selectedClipIds.forEach((id) => { if (ids[id]) removeClip(id); });
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
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, removeClip, splitClip, selectedClipIds, clearSelection, isPlaying, setPlaying]);
}
