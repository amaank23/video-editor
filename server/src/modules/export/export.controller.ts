import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

const EXPORT_DIR = process.env.EXPORT_DIR ?? './exports';

export function triggerExport(_req: Request, res: Response, _next: NextFunction): void {
  res.status(501).json({ error: 'Export not yet implemented. Coming in Phase 5.' });
}

export function downloadExport(req: Request, res: Response, next: NextFunction): void {
  const filename = path.basename(String(req.params.filename));
  const filePath = path.join(EXPORT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Export file not found' });
    return;
  }

  res.download(filePath, filename, (err) => {
    if (err) next(err);
  });
}
