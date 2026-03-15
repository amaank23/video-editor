import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { saveProject } from '@/lib/api/projects';

const DEBOUNCE_MS = 1500;

/**
 * Subscribes to projectStore and debounces PUT /api/projects/:id whenever
 * the project name or settings change. Call once at the app root.
 */
export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      const p = state.project;
      const q = prev.project;

      // Only auto-save on name or settings changes — not on every clip move
      if (p.name === q.name && p.settings === q.settings) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          await saveProject(p.id, { name: p.name, settings: p.settings });
        } catch (err) {
          console.warn('[useAutoSave] Save failed:', err);
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
