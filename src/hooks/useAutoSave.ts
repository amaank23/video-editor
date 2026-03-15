import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { saveProject } from '@/lib/api/projects';

const DEBOUNCE_MS = 1500;

/**
 * Subscribes to projectStore and debounces PUT /api/projects/:id whenever
 * the project name or settings change. Skips saves until serverRegistered is
 * true (i.e. createProject has resolved and a real server ID is in the store).
 * Cancels in-flight requests via AbortController so rapid changes don't cause
 * out-of-order writes on the server.
 */
export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      const p = state.project;
      const q = prev.project;

      // Block saves until the server has confirmed the project ID
      if (!state.serverRegistered) return;

      // Only auto-save on name or settings changes — not on every clip move
      if (p.name === q.name && p.settings === q.settings) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort(); // cancel any in-flight request

      timerRef.current = setTimeout(async () => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
          await saveProject(p.id, { name: p.name, settings: p.settings }, ctrl.signal);
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
