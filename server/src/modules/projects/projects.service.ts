import { prisma } from '../../lib/prisma';
import type { JsonValue, CreateProjectInput, UpdateProjectInput } from './projects.types';

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

export function updateProject(id: string, { name, settings }: UpdateProjectInput) {
  return prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(settings !== undefined && { settings: settings as any }),
    },
  });
}

export function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}
