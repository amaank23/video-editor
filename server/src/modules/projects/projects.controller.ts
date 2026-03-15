import { Request, Response, NextFunction } from 'express';
import {
  listProjects,
  createProject,
  findProjectById,
  updateProject,
  deleteProject,
} from './projects.service';
import type { JsonValue, TrackInput, ClipInput } from './projects.types';

export async function getProjects(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await listProjects());
  } catch (err) {
    next(err);
  }
}

export async function postProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { name, settings } = req.body as { name: string; settings?: JsonValue };
  try {
    const project = await createProject({ name, settings });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await findProjectById(String(req.params.id));
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function putProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { name, settings, tracks, clips } = req.body as {
    name?: string;
    settings?: JsonValue;
    tracks?: TrackInput[];
    clips?: Record<string, ClipInput>;
  };
  try {
    const project = await updateProject(String(req.params.id), { name, settings, tracks, clips });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteProject(String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
