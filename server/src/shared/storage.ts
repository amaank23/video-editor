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

export function getServeUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export function deleteFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function cleanOldExports(): void {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();

  if (!fs.existsSync(EXPORT_DIR)) return;

  fs.readdirSync(EXPORT_DIR).forEach((file) => {
    const filePath = path.join(EXPORT_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > oneHour) {
      fs.unlinkSync(filePath);
    }
  });
}
