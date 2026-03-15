import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { CreateProjectInput, UpdateProjectInput, ClipInput } from './projects.types';

const DEFAULT_SETTINGS = {
  width: 1920,
  height: 1080,
  fps: 30,
  backgroundColor: '#000000',
  aspectRatio: '16:9',
};

export function listProjects() {
  return prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { assets: true } },
    },
  });
}

export function createProject({ name, settings }: CreateProjectInput) {
  return prisma.project.create({
    data: {
      name: name ?? 'Untitled Project',
      settings: settings ?? DEFAULT_SETTINGS,
    },
  });
}

export async function findProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tracks: {
        include: { clips: { orderBy: { startTimeMs: 'asc' } } },
        orderBy: { order: 'asc' },
      },
      assets: true,
    },
  });
  if (!project) return null;
  return {
    ...project,
    assets: project.assets.map((a) => ({
      ...a,
      fileSizeBytes: Number(a.fileSizeBytes),
    })),
  };
}

/**
 * Update project metadata and fully sync its timeline (tracks + clips).
 * Uses a single transaction:
 *  1. Update project name/settings
 *  2. Delete tracks that were removed (cascades to their clips)
 *  3. Upsert surviving/new tracks
 *  4. Delete clips that were removed within surviving tracks
 *  5. Upsert surviving/new clips
 * Returns null if the project doesn't exist.
 */
export async function updateProject(
  id: string,
  { name, settings, tracks, clips }: UpdateProjectInput,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Update project metadata
      const project = await tx.project.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(settings !== undefined && { settings: settings as any }),
        },
      });

      // 2. Sync tracks and clips when provided
      if (tracks !== undefined && clips !== undefined) {
        const newTrackIds = new Set(tracks.map((t) => t.id));

        // Delete removed tracks (their clips cascade-delete)
        await tx.track.deleteMany({
          where: { projectId: id, id: { notIn: [...newTrackIds] } },
        });

        // Upsert tracks
        for (const track of tracks) {
          await tx.track.upsert({
            where: { id: track.id },
            create: {
              id: track.id,
              projectId: id,
              type: track.type,
              name: track.name,
              order: track.order,
              locked: track.locked,
              muted: track.muted,
              collapsed: track.collapsed,
            },
            update: {
              type: track.type,
              name: track.name,
              order: track.order,
              locked: track.locked,
              muted: track.muted,
              collapsed: track.collapsed,
            },
          });
        }

        // Delete clips that no longer exist within surviving tracks
        const newClipIds = new Set(Object.keys(clips));
        await tx.clip.deleteMany({
          where: {
            trackId: { in: [...newTrackIds] },
            id: { notIn: [...newClipIds] },
          },
        });

        // Upsert clips
        for (const clip of Object.values(clips) as ClipInput[]) {
          const {
            id: clipId,
            trackId,
            type,
            startTimeMs,
            durationMs,
            trimStartMs,
            trimEndMs,
            transform,
            animations,
            name: clipName,
            locked,
            visible,
            ...rest
          } = clip;

          // Everything else (assetId, volume, content, etc.) → properties JSON
          const properties = rest as Prisma.InputJsonValue;

          await tx.clip.upsert({
            where: { id: clipId },
            create: {
              id: clipId,
              trackId,
              type,
              startTimeMs,
              durationMs,
              trimStartMs,
              trimEndMs,
              transform: transform as Prisma.InputJsonValue,
              animations: animations as Prisma.InputJsonValue,
              name: clipName,
              locked,
              visible,
              properties,
            },
            update: {
              trackId,
              type,
              startTimeMs,
              durationMs,
              trimStartMs,
              trimEndMs,
              transform: transform as Prisma.InputJsonValue,
              animations: animations as Prisma.InputJsonValue,
              name: clipName,
              locked,
              visible,
              properties,
            },
          });
        }
      }

      return project;
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return null;
    }
    throw err;
  }
}

export function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}
