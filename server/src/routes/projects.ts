import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/projects
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
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
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { name, settings } = req.body as { name: string; settings?: Prisma.InputJsonValue };
  try {
    const project = await prisma.project.create({
      data: {
        name: name ?? 'Untitled Project',
        settings: settings ?? {
          width: 1920,
          height: 1080,
          fps: 30,
          backgroundColor: '#000000',
          aspectRatio: '16:9',
        },
      },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id — returns full project with tracks, clips, assets
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tracks: {
          include: { clips: true },
          orderBy: { order: 'asc' },
        },
        assets: true,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id — full project state upsert (auto-save)
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { name, settings } = req.body as { name?: string; settings?: Prisma.InputJsonValue };
  try {
    const id = String(req.params.id);
    const updateData: Prisma.ProjectUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (settings !== undefined) updateData.settings = settings;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.project.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
