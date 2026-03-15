import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { saveProject } from '@/lib/api/projects';

const DEBOUNCE_MS = 2000;

/**
 * Subscribes to projectStore and debounces PUT /api/projects/:id whenever
 * the project changes (name, settings, clips, or tracks). Skips saves until
 * serverRegistered is true (createProject has resolved and a real server ID
 * is in the store). Cancels in-flight requests via AbortController so rapid
 * changes don't cause out-of-order writes on the server.
 */
export function useAutoSave() {
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef        = useRef<AbortController | null>(null);
  const setSaveStatusFn = useEditorStore((s) => s.setSaveStatus);
  // Use a ref so the effect closure never goes stale
  const setSaveStatus   = useRef(setSaveStatusFn);
  setSaveStatus.current = setSaveStatusFn;

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      // Block saves until the server has confirmed the project ID
      if (!state.serverRegistered) return;

      // Only save when something actually changed
      if (state.project === prev.project) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();

      setSaveStatus.current('saving');

      timerRef.current = setTimeout(async () => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const p = useProjectStore.getState().project;
        try {
          await saveProject(
            p.id,
            {
              name:     p.name,
              settings: p.settings,
              tracks:   p.timeline.tracks,
              clips:    p.clips,
            },
            ctrl.signal,
          );
          setSaveStatus.current('saved');
          // Reset to idle after a short while so the indicator fades
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          idleTimerRef.current = setTimeout(() => setSaveStatus.current('idle'), 2000);
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          console.warn('[useAutoSave] Save failed:', err);
          setSaveStatus.current('error');
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current)     clearTimeout(timerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);
}
