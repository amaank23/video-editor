import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Project, Track, Timeline } from '@shared/types/project';
import type { Clip, ClipId, TrackId, TrackType, Transform } from '@shared/types/clips';
import { createDefaultProject, DEFAULT_PROJECT_SETTINGS } from '@shared/types/project';

const MAX_UNDO_STEPS = 50;

const DEFAULT_TRANSFORM: Transform = {
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

  // Project actions
  setProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
  updateProjectSettings: (patch: Partial<Project['settings']>) => void;

  // Track actions
  addTrack: (type: TrackType, name?: string) => TrackId;
  removeTrack: (id: TrackId) => void;
  updateTrack: (id: TrackId, patch: Partial<Track>) => void;

  // Clip actions
  addClip: (clip: Clip) => void;
  removeClip: (id: ClipId) => void;
  updateClip: (id: ClipId, patch: Partial<Clip>) => void;
  moveClip: (id: ClipId, newStartTimeMs: number, newTrackId?: TrackId) => void;
  trimClip: (id: ClipId, trimStartMs: number, trimEndMs: number) => void;
  splitClip: (id: ClipId, atTimeMs: number) => [ClipId, ClipId] | null;

  // Asset refs
  addAssetRef: (assetId: string) => void;
  removeAssetRef: (assetId: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

function recomputeTimelineDuration(project: Project): number {
  let max = 0;
  for (const clip of Object.values(project.clips)) {
    max = Math.max(max, clip.startTimeMs + clip.durationMs);
  }
  return max;
}

function removeClipFromTrack(project: Project, clipId: ClipId): Project {
  const clip = project.clips[clipId];
  if (!clip) return project;

  const tracks = project.timeline.tracks.map((t) =>
    t.id === clip.trackId ? { ...t, clipIds: t.clipIds.filter((id) => id !== clipId) } : t,
  );

  const clips = { ...project.clips };
  delete clips[clipId];

  return {
    ...project,
    timeline: { ...project.timeline, tracks },
    clips,
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createDefaultProject(nanoid()),
  past: [],
  future: [],

  setProject: (project) => set({ project, past: [], future: [] }),

  updateProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name, updatedAt: Date.now() } })),

  updateProjectSettings: (patch) =>
    set((s) => ({
      project: {
        ...s.project,
        settings: { ...s.project.settings, ...patch },
        updatedAt: Date.now(),
      },
    })),

  addTrack: (type, name) => {
    const id = nanoid();
    const displayName = name ?? (type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'Overlay');

    set((s) => {
      get().pushHistory();
      const order = s.project.timeline.tracks.length;
      const newTrack: Track = {
        id,
        type,
        name: displayName,
        order,
        locked: false,
        muted: false,
        collapsed: false,
        clipIds: [],
      };
      return {
        project: {
          ...s.project,
          timeline: {
            ...s.project.timeline,
            tracks: [...s.project.timeline.tracks, newTrack],
          },
          updatedAt: Date.now(),
        },
      };
    });

    return id;
  },

  removeTrack: (id) =>
    set((s) => {
      get().pushHistory();
      const track = s.project.timeline.tracks.find((t) => t.id === id);
      if (!track) return s;

      // Remove all clips on this track
      const clips = { ...s.project.clips };
      track.clipIds.forEach((cid) => delete clips[cid]);

      return {
        project: {
          ...s.project,
          timeline: {
            ...s.project.timeline,
            tracks: s.project.timeline.tracks.filter((t) => t.id !== id),
          },
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
          tracks: s.project.timeline.tracks.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        },
        updatedAt: Date.now(),
      },
    })),

  addClip: (clip) =>
    set((s) => {
      get().pushHistory();
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
      const durationMs = recomputeTimelineDuration({ ...s.project, clips });

      return {
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks, durationMs },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  removeClip: (id) =>
    set((s) => {
      get().pushHistory();
      const updated = removeClipFromTrack(s.project, id);
      const durationMs = recomputeTimelineDuration(updated);
      return {
        project: {
          ...updated,
          timeline: { ...updated.timeline, durationMs },
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
      get().pushHistory();
      const existing = s.project.clips[id];
      if (!existing) return s;

      const targetTrackId = newTrackId ?? existing.trackId;
      const updatedClip: Clip = { ...existing, startTimeMs: newStartTimeMs, trackId: targetTrackId } as Clip;

      let tracks = s.project.timeline.tracks;
      if (newTrackId && newTrackId !== existing.trackId) {
        // Move from old track to new track
        tracks = tracks.map((t) => {
          if (t.id === existing.trackId) return { ...t, clipIds: t.clipIds.filter((c) => c !== id) };
          if (t.id === newTrackId) return { ...t, clipIds: [...t.clipIds, id] };
          return t;
        });
      }

      // Re-sort clipIds on affected track
      const clips = { ...s.project.clips, [id]: updatedClip };
      tracks = tracks.map((t) =>
        t.id === targetTrackId
          ? { ...t, clipIds: [...t.clipIds].sort((a, b) => (clips[a]?.startTimeMs ?? 0) - (clips[b]?.startTimeMs ?? 0)) }
          : t,
      );

      const durationMs = recomputeTimelineDuration({ ...s.project, clips });

      return {
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks, durationMs },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  trimClip: (id, trimStartMs, trimEndMs) =>
    set((s) => {
      get().pushHistory();
      const existing = s.project.clips[id];
      if (!existing) return s;

      const newDuration = trimEndMs - trimStartMs;
      const updatedClip = {
        ...existing,
        trimStartMs,
        trimEndMs,
        durationMs: newDuration,
      } as Clip;

      const clips = { ...s.project.clips, [id]: updatedClip };
      const durationMs = recomputeTimelineDuration({ ...s.project, clips });

      return {
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, durationMs },
          clips,
          updatedAt: Date.now(),
        },
      };
    }),

  splitClip: (id, atTimeMs) => {
    const { project } = get();
    const clip = project.clips[id];
    if (!clip) return null;
    if (atTimeMs <= clip.startTimeMs || atTimeMs >= clip.startTimeMs + clip.durationMs) return null;

    get().pushHistory();

    const leftDuration = atTimeMs - clip.startTimeMs;
    const rightDuration = clip.durationMs - leftDuration;
    const leftId = nanoid();
    const rightId = nanoid();

    const leftClip: Clip = {
      ...clip,
      id: leftId,
      durationMs: leftDuration,
      trimEndMs: clip.trimStartMs + leftDuration,
    } as Clip;

    const rightClip: Clip = {
      ...clip,
      id: rightId,
      startTimeMs: atTimeMs,
      durationMs: rightDuration,
      trimStartMs: clip.trimStartMs + leftDuration,
    } as Clip;

    set((s) => {
      const clips = { ...s.project.clips };
      delete clips[id];
      clips[leftId] = leftClip;
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

      return {
        project: {
          ...s.project,
          timeline: { ...s.project.timeline, tracks },
          clips,
          updatedAt: Date.now(),
        },
      };
    });

    return [leftId, rightId];
  },

  addAssetRef: (assetId) =>
    set((s) => ({
      project: {
        ...s.project,
        assetIds: s.project.assetIds.includes(assetId)
          ? s.project.assetIds
          : [...s.project.assetIds, assetId],
      },
    })),

  removeAssetRef: (assetId) =>
    set((s) => ({
      project: {
        ...s.project,
        assetIds: s.project.assetIds.filter((id) => id !== assetId),
      },
    })),

  pushHistory: () =>
    set((s) => {
      const past = [...s.past, s.project].slice(-MAX_UNDO_STEPS);
      return { past, future: [] };
    }),

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
}));
