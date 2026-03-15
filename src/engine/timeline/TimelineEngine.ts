import type { Project } from '@shared/types/project';
import type { Clip, ClipId } from '@shared/types/clips';

/** All clips whose time range contains the given time. */
export function getActiveClips(project: Project, timeMs: number): Clip[] {
  return Object.values(project.clips).filter(
    (c) => c.startTimeMs <= timeMs && c.startTimeMs + c.durationMs > timeMs,
  );
}

/**
 * Collect all clip edge timestamps as potential snap targets.
 * Optionally exclude one clip (the one being dragged/trimmed).
 */
export function getSnapPoints(project: Project, excludeClipId?: ClipId): number[] {
  const points = new Set<number>([0]);
  for (const clip of Object.values(project.clips)) {
    if (clip.id === excludeClipId) continue;
    points.add(clip.startTimeMs);
    points.add(clip.startTimeMs + clip.durationMs);
  }
  return Array.from(points).sort((a, b) => a - b);
}

/**
 * Snap ms to the nearest point within thresholdMs.
 * Returns ms unchanged if no point is close enough.
 */
export function snapToNearest(ms: number, points: number[], thresholdMs: number): number {
  let best = ms;
  let bestDist = thresholdMs;
  for (const p of points) {
    const dist = Math.abs(ms - p);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

/** Snap ms to a regular grid interval. */
export function snapToGrid(ms: number, gridMs: number): number {
  return Math.round(ms / gridMs) * gridMs;
}
