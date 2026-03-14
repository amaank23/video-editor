export type AssetType = 'video' | 'audio' | 'image';

export interface CreateAssetInput {
  projectId: string;
  file: Express.Multer.File;
}

export interface AssetResponse {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  fileSizeBytes: string;
  serveUrl: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  thumbnails: string[];
  createdAt: number;
}
