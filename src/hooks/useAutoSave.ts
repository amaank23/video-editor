import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      // Block saves until the server has confirmed the project ID
      if (!state.serverRegistered) return;

      // Only save when something actually changed
      if (state.project === prev.project) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();

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
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.warn('[useAutoSave] Save failed:', err);
          }
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);
}
