import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { CreateProjectInput, UpdateProjectInput } from './projects.types';

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

export function findProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      tracks: {
        include: { clips: true },
        orderBy: { order: 'asc' },
      },
      assets: true,
    },
  });
}

/** Returns null if project not found (P2025), throws on all other errors. */
export async function updateProject(id: string, { name, settings }: UpdateProjectInput) {
  try {
    return await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(settings !== undefined && { settings: settings as any }),
      },
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
