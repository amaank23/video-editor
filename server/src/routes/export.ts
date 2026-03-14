import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

const EXPORT_DIR = process.env.EXPORT_DIR ?? './exports';

// POST /api/export/:projectId — placeholder for Phase 5
router.post('/:projectId', async (_req: Request, res: Response, _next: NextFunction) => {
  // Full Remotion export implemented in Phase 5
  res.status(501).json({ error: 'Export not yet implemented. Coming in Phase 5.' });
});

// GET /api/export/download/:filename
router.get('/download/:filename', (req: Request, res: Response, next: NextFunction) => {
  const filename = path.basename(String(req.params.filename)); // sanitize
  const filePath = path.join(EXPORT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Export file not found' });
    return;
  }

  res.download(filePath, filename, (err) => {
    if (err) next(err);
  });
});

export default router;
