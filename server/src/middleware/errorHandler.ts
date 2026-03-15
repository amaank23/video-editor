import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Always log the full error server-side
  console.error('[Error]', err.stack ?? err.message);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large' });
      return;
    }
    res.status(400).json({ error: 'File upload error' });
    return;
  }

  // Prisma not-found
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  // Never expose internal details to clients
  res.status(500).json({ error: 'Internal server error' });
}
