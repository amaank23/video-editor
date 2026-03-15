import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const EXPORT_DIR = process.env.EXPORT_DIR ?? './exports';

export function ensureDirs(): void {
  [UPLOAD_DIR, EXPORT_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export function getUploadPath(filename: string): string {
  return path.resolve(UPLOAD_DIR, filename);
}

export function getExportPath(filename: string): string {
  return path.resolve(EXPORT_DIR, filename);
}

export function ensureExportDir(): string {
  const dir = path.resolve(EXPORT_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getServeUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export function deleteFile(filePath: string): void {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.warn('[storage] Failed to delete file:', filePath, err.message);
    }
  });
}

export async function cleanOldExports(): Promise<void> {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();

  let files: string[];
  try {
    files = await fs.promises.readdir(EXPORT_DIR);
  } catch {
    return; // EXPORT_DIR may not exist yet
  }

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(EXPORT_DIR, file);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > oneHour) {
          await fs.promises.unlink(filePath);
        }
      } catch {
        // File may have been deleted concurrently — ignore
      }
    }),
  );
}
