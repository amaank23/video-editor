/**
 * Maps a full server project response (tracks + clips + assets) back to the
 * Zustand Project + MediaAsset shapes used by the client stores.
 */
import type { Project, Track, ProjectSettings } from '@shared/types/project';
import type { Clip, Transform, AnimationTrack, TrackType } from '@shared/types/clips';
import type { MediaAsset } from '@shared/types/media';
import type { ServerProjectFull, ServerClip, ServerAsset } from '@/lib/api/projects';

function serverClipToClip(sc: ServerClip): Clip {
  const { id, trackId, type, startTimeMs, durationMs, trimStartMs, trimEndMs,
          transform, animations, name, locked, visible, properties } = sc;
  return {
    id, trackId, type: type as Clip['type'],
    startTimeMs, durationMs, trimStartMs, trimEndMs,
    transform:  transform  as Transform,
    animations: (animations as AnimationTrack[]) ?? [],
    name, locked, visible,
    ...(properties as Record<string, unknown>),
  } as Clip;
}

function serverAssetToMediaAsset(sa: ServerAsset): MediaAsset {
  return {
    id:           sa.id,
    name:         sa.name,
    type:         sa.type as MediaAsset['type'],
    mimeType:     sa.mimeType,
    fileSizeBytes: Number(sa.fileSizeBytes),
    serveUrl:     sa.serveUrl,
    durationMs:   sa.durationMs  ?? undefined,
    width:        sa.width       ?? undefined,
    height:       sa.height      ?? undefined,
    fps:          sa.fps         ?? undefined,
    thumbnails:   sa.thumbnails  ?? [],
    createdAt:    new Date(sa.createdAt).getTime(),
  };
}

export function serverProjectToStoreProject(sp: ServerProjectFull): {
  project: Project;
  assets:  MediaAsset[];
} {
  const clips: Record<string, Clip> = {};
  const tracks: Track[] = sp.tracks.map((st, i) => {
    const clipIds: string[] = [];
    for (const sc of st.clips) {
      const clip = serverClipToClip(sc);
      clips[clip.id] = clip;
      clipIds.push(clip.id);
    }
    return {
      id:        st.id,
      type:      st.type as TrackType,
      name:      st.name,
      order:     st.order ?? i,
      locked:    st.locked,
      muted:     st.muted,
      collapsed: st.collapsed,
      clipIds,
    };
  });

  const durationMs = Object.values(clips).reduce(
    (max, c) => Math.max(max, c.startTimeMs + c.durationMs),
    0,
  );

  const settings = sp.settings as ProjectSettings;

  const project: Project = {
    id:        sp.id,
    name:      sp.name,
    createdAt: new Date(sp.createdAt).getTime(),
    updatedAt: new Date(sp.updatedAt).getTime(),
    version:   1,
    settings,
    timeline:  { durationMs, tracks, fps: settings.fps ?? 30 },
    clips,
    assetIds:  sp.assets.map((a) => a.id),
  };

  const assets = sp.assets.map(serverAssetToMediaAsset);

  return { project, assets };
}
