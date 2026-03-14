import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import os from 'os';
import { upload } from '../middleware/upload';
import { prisma } from '../lib/prisma';
import { probeFile, extractThumbnails } from '../services/ffmpeg';
import { getServeUrl, deleteFile } from '../services/storage';

const router = Router();

// POST /api/assets/upload
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
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
      const assetType = file.mimetype.startsWith('video/')
        ? 'video'
        : file.mimetype.startsWith('audio/')
          ? 'audio'
          : 'image';

      // Probe the file for metadata
      let probeResult = null;
      if (assetType !== 'image') {
        probeResult = await probeFile(file.path);
      }

      // Generate thumbnails for video files
      let thumbnails: string[] = [];
      if (assetType === 'video') {
        try {
          thumbnails = await extractThumbnails(file.path, 20, os.tmpdir());
        } catch {
          // Non-fatal: thumbnails are cosmetic
          console.warn('Thumbnail extraction failed for', file.filename);
        }
      }

      const serveUrl = getServeUrl(file.filename);

      const asset = await prisma.asset.create({
        data: {
          projectId,
          name: file.originalname,
          type: assetType,
          mimeType: file.mimetype,
          filePath: file.path,
          serveUrl,
          fileSizeBytes: BigInt(file.size),
          durationMs: probeResult?.durationMs ?? null,
          width: probeResult?.width ?? null,
          height: probeResult?.height ?? null,
          fps: probeResult?.fps ?? null,
          thumbnails,
        },
      });

      res.json({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        mimeType: asset.mimeType,
        fileSizeBytes: asset.fileSizeBytes.toString(),
        serveUrl: asset.serveUrl,
        durationMs: asset.durationMs,
        width: asset.width,
        height: asset.height,
        fps: asset.fps,
        thumbnails: asset.thumbnails,
        createdAt: asset.createdAt.getTime(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/assets/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assets/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    deleteFile(asset.filePath);
    await prisma.asset.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
