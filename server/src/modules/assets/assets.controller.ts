import { Request, Response, NextFunction } from 'express';
import { createAsset, findAssetById, removeAsset } from './assets.service';

export async function uploadAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  const { projectId } = req.body as { projectId: string };
  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }

  try {
    const asset = await createAsset({ projectId, file });
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function getAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asset = await findAssetById(String(req.params.id));
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asset = await findAssetById(String(req.params.id));
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    await removeAsset(String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
