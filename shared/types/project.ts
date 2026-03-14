import type { ClipId, TrackId, AssetId, Clip, TrackType } from './clips';

export interface Track {
  id: TrackId;
  type: TrackType;
  name: string;
  order: number;      // z-index: higher order = higher in canvas stack
  locked: boolean;
  muted: boolean;
  collapsed: boolean;
  clipIds: ClipId[];  // ordered by startTimeMs
}

export interface ProjectSettings {
  width: number;          // output resolution e.g. 1920
  height: number;         // e.g. 1080
  fps: number;            // e.g. 30
  backgroundColor: string;
  aspectRatio: string;    // display string e.g. '16:9'
}

export interface Timeline {
  durationMs: number;     // max(clip.startTimeMs + clip.durationMs) across all clips
  tracks: Track[];
  fps: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: number;        // schema version for future migrations
  settings: ProjectSettings;
  timeline: Timeline;
  clips: Record<ClipId, Clip>; // normalized map for O(1) lookup
  assetIds: AssetId[];
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  backgroundColor: '#000000',
  aspectRatio: '16:9',
};

export function createDefaultProject(id: string, name = 'Untitled Project'): Project {
  return {
    id,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    settings: { ...DEFAULT_PROJECT_SETTINGS },
    timeline: {
      durationMs: 0,
      tracks: [],
      fps: 30,
    },
    clips: {},
    assetIds: [],
  };
}
