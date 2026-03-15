import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Project, Track } from '@shared/types/project';
import type { Clip, ClipId, TrackId, TrackType, Transform } from '@shared/types/clips';
import { createDefaultProject } from '@shared/types/project';

const MAX_UNDO_STEPS = 50;

export const DEFAULT_TRANSFORM: Transform = {
  x: 0.5,
  y: 0.5,
  width: 1,
  height: 1,
  rotation: 0,
  opacity: 1,
  scaleX: 1,
  scaleY: 1,
};

interface ProjectState {
  project: Project;
  past: Project[];
  future: Project[];
  /** True once the server has confirmed the project ID via createProject(). */
  serverRegistered: boolean;

  setProject: (project: Project) => void;
  restoreProject: (project: Project) => void;
  setProjectId: (id: string) => void;
  updateProjectName: (name: string) => void;
  updateProjectSettings: (patch: Partial<Project['settings']>) => void;

  addTrack: (type: TrackType, name?: string) => TrackId;
  removeTrack: (id: TrackId) => void;
  updateTrack: (id: TrackId, patch: Partial<Track>) => void;

  addClip: (clip: Clip) => void;
  removeClip: (id: ClipId) => void;
  removeMultipleClips: (ids: ClipId[]) => void;
  updateClip: (id: ClipId, patch: Partial<Clip>) => void;
  moveClip: (id: ClipId, newStartTimeMs: number, newTrackId?: TrackId) => void;
  moveMultipleClips: (moves: Array<{ id: ClipId; newStartTimeMs: number }>) => void;
  trimClip: (id: ClipId, trimStartMs: number, trimEndMs: number) => void;
  splitClip: (id: ClipId, atTimeMs: number) => [ClipId, ClipId] | null;

  addAssetRef: (assetId: string) => void;
  removeAssetRef: (assetId: string) => void;

  setServerRegistered: () => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  /** Update a clip AND record an undo entry atomically. Use for discrete committed changes. */
  updateClipAndCommit: (id: ClipId, patch: Partial<Clip>) => void;
}

// Pure helpers — no Zustand dependency

function maxDuration(clips: Record<ClipId, Clip>): number {
  let max = 0;
  for (const c of Object.values(clips)) {
    max = Math.max(max, c.startTimeMs + c.durationMs);
  }
  return max;
}

/** Prepend current project to past[], clear future[], cap at MAX_UNDO_STEPS. */
function withHistory(
  s: { project: Project; past: Project[]; future: Project[] },
): { past: Project[]; future: Project[] } {
  return {
    past: [...s.past, s.project].slice(-MAX_UNDO_STEPS),
    future: [],
  };
}

function removeClipFromProject(project: Project, clipId: ClipId): Project {
  const clip = project.clips[clipId];
  if (!clip) return project;

  const tracks = project.timeline.tracks.map((t) =>
    t.id === clip.trackId ? { ...t, clipIds: t.clipIds.filter((id) => id !== clipId) } : t,
  );
  const clips = { ...project.clips };
  delete clips[clipId];

  return { ...project, timeline: { ...project.timeline, tracks }, clips };
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: createDefaultProject(nanoid()),
  past: [],
  future: [],
  serverRegistered: false,

  setProject: (project) => set({ project, past: [], future: [] }),

  restoreProject: (project) => set({ project, past: [], future: [], serverRegistered: true }),

  setProjectId: (id) => set((s) => ({ project: { ...s.project, id } })),

  setServerRegistered: () => set({ serverRegistered: true }),

  updateProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name, updatedAt: Date.now() } })),

  updateProjectSettings: (patch) =>
    set((s) => ({
      project: { ...s.project, settings: { ...s.project.settings, ...patch }, updatedAt: Date.now() },
    })),

  // ── Tracks ──────────────────────────────────────────────────────────────

  addTrack: (type, name) => {
    const id = nanoid();
    const displayName = name ?? (type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'Overlay');
    set((s) => {
      const newTrack: Track = {
        id,
        type,
        name: displayName,
        order: s.project.timeline.tracks.length,
        locked: false,
        muted: false,
        collapsed: false,
        clipIds: [],
      };
      return {
        ...withHistory(s),
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks: [...s.project.timeline.tracks, newTrack] },
          updatedAt: Date.now(),
        },
      };
    });
    return id;
  },

  removeTrack: (id) =>
    set((s) => {
      const track = s.project.timeline.tracks.find((t) => t.id === id);
      if (!track) return s;
      const clips = { ...s.project.clips };
      track.clipIds.forEach((cid) => delete clips[cid]);
      return {
        ...withHistory(s),
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks: s.project.timeline.tracks.filter((t) => t.id !== id) },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  updateTrack: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        timeline: {
          ...s.project.timeline,
          tracks: s.project.timeline.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        },
        updatedAt: Date.now(),
      },
    })),

  // ── Clips ────────────────────────────────────────────────────────────────

  addClip: (clip) =>
    set((s) => {
      const clips = { ...s.project.clips, [clip.id]: clip };
      const tracks = s.project.timeline.tracks.map((t) =>
        t.id === clip.trackId
          ? {
              ...t,
              clipIds: [...t.clipIds, clip.id].sort(
                (a, b) => (clips[a]?.startTimeMs ?? 0) - (clips[b]?.startTimeMs ?? 0),
              ),
            }
          : t,
      );
      return {
        ...withHistory(s),
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks, durationMs: maxDuration(clips) },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  removeClip: (id) =>
    set((s) => {
      const updated = removeClipFromProject(s.project, id);
      return {
        ...withHistory(s),
        project: {
          ...updated,
          timeline: { ...updated.timeline, durationMs: maxDuration(updated.clips) },
          updatedAt: Date.now(),
        },
      };
    }),

  removeMultipleClips: (ids) =>
    set((s) => {
      let updated = s.project;
      for (const id of ids) {
        updated = removeClipFromProject(updated, id);
      }
      return {
        ...withHistory(s),
        project: {
          ...updated,
          timeline: { ...updated.timeline, durationMs: maxDuration(updated.clips) },
          updatedAt: Date.now(),
        },
      };
    }),

  updateClip: (id, patch) =>
    set((s) => {
      const existing = s.project.clips[id];
      if (!existing) return s;
      return {
        project: {
          ...s.project,
          clips: { ...s.project.clips, [id]: { ...existing, ...patch } as Clip },
          updatedAt: Date.now(),
        },
      };
    }),

  moveClip: (id, newStartTimeMs, newTrackId) =>
    set((s) => {
      const existing = s.project.clips[id];
      if (!existing) return s;

      const targetTrackId = newTrackId ?? existing.trackId;
      const updatedClip = { ...existing, startTimeMs: newStartTimeMs, trackId: targetTrackId } as Clip;
      const clips = { ...s.project.clips, [id]: updatedClip };

      let tracks = s.project.timeline.tracks;
      if (newTrackId && newTrackId !== existing.trackId) {
        tracks = tracks.map((t) => {
          if (t.id === existing.trackId) return { ...t, clipIds: t.clipIds.filter((c) => c !== id) };
          if (t.id === newTrackId) return { ...t, clipIds: [...t.clipIds, id] };
          return t;
        });
      }
      tracks = tracks.map((t) =>
        t.id === targetTrackId
          ? { ...t, clipIds: [...t.clipIds].sort((a, b) => (clips[a]?.startTimeMs ?? 0) - (clips[b]?.startTimeMs ?? 0)) }
          : t,
      );

      return {
        ...withHistory(s),
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks, durationMs: maxDuration(clips) },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  moveMultipleClips: (moves) =>
    set((s) => {
      const clips = { ...s.project.clips };
      for (const { id, newStartTimeMs } of moves) {
        const existing = clips[id];
        if (!existing) continue;
        clips[id] = { ...existing, startTimeMs: Math.max(0, newStartTimeMs) } as Clip;
      }
      const affectedTrackIds = new Set(
        moves.map((m) => clips[m.id]?.trackId).filter(Boolean) as string[],
      );
      const tracks = s.project.timeline.tracks.map((t) =>
        affectedTrackIds.has(t.id)
          ? { ...t, clipIds: [...t.clipIds].sort((a, b) => (clips[a]?.startTimeMs ?? 0) - (clips[b]?.startTimeMs ?? 0)) }
          : t,
      );
      return {
        ...withHistory(s),
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks, durationMs: maxDuration(clips) },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  trimClip: (id, trimStartMs, trimEndMs) =>
    set((s) => {
      const existing = s.project.clips[id];
      if (!existing) return s;
      const clips = {
        ...s.project.clips,
        [id]: { ...existing, trimStartMs, trimEndMs, durationMs: trimEndMs - trimStartMs } as Clip,
      };
      return {
        ...withHistory(s),
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, durationMs: maxDuration(clips) },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  splitClip: (id, atTimeMs) => {
    // IDs must be generated before set() so we can return them
    const leftId  = nanoid();
    const rightId = nanoid();
    let result: [ClipId, ClipId] | null = null;

    set((s) => {
      // All reads happen inside set() against the guaranteed-fresh state
      const clip = s.project.clips[id];
      if (!clip) return s;
      if (atTimeMs <= clip.startTimeMs || atTimeMs >= clip.startTimeMs + clip.durationMs) return s;

      const leftDuration  = atTimeMs - clip.startTimeMs;
      const rightDuration = clip.durationMs - leftDuration;

      const leftClip  = { ...clip, id: leftId,  durationMs: leftDuration,  trimEndMs:   clip.trimStartMs + leftDuration } as Clip;
      const rightClip = { ...clip, id: rightId, startTimeMs: atTimeMs, durationMs: rightDuration, trimStartMs: clip.trimStartMs + leftDuration } as Clip;

      const clips = { ...s.project.clips };
      delete clips[id];
      clips[leftId]  = leftClip;
      clips[rightId] = rightClip;

      const tracks = s.project.timeline.tracks.map((t) =>
        t.id === clip.trackId
          ? {
              ...t,
              clipIds: [...t.clipIds.filter((c) => c !== id), leftId, rightId].sort(
                (a, b) => (clips[a]?.startTimeMs ?? 0) - (clips[b]?.startTimeMs ?? 0),
              ),
            }
          : t,
      );

      result = [leftId, rightId];
      return {
        ...withHistory(s),
        project: { ...s.project, timeline: { ...s.project.timeline, tracks }, clips, updatedAt: Date.now() },
      };
    });

    return result;
  },

  // ── Asset refs ───────────────────────────────────────────────────────────

  addAssetRef: (assetId) =>
    set((s) => ({
      project: {
        ...s.project,
        assetIds: s.project.assetIds.includes(assetId) ? s.project.assetIds : [...s.project.assetIds, assetId],
      },
    })),

  removeAssetRef: (assetId) =>
    set((s) => ({
      project: { ...s.project, assetIds: s.project.assetIds.filter((id) => id !== assetId) },
    })),

  // ── History ──────────────────────────────────────────────────────────────

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const past = [...s.past];
      const previous = past.pop()!;
      return { project: previous, past, future: [s.project, ...s.future] };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const [next, ...future] = s.future;
      return { project: next, past: [...s.past, s.project], future };
    }),

  pushHistory: () => set((s) => ({ ...withHistory(s) })),

  updateClipAndCommit: (id, patch) =>
    set((s) => {
      const existing = s.project.clips[id];
      if (!existing) return s;
      return {
        ...withHistory(s),
        project: {
          ...s.project,
          clips: { ...s.project.clips, [id]: { ...existing, ...patch } as Clip },
          updatedAt: Date.now(),
        },
      };
    }),
}));
