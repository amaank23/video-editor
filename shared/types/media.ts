import type { AssetId } from './clips';

export interface MediaAsset {
  id: AssetId;
  name: string;
  type: 'video' | 'audio' | 'image';
  mimeType: string;
  fileSizeBytes: number;
  serveUrl: string;       // e.g. /uploads/uuid.mp4 — used as <video src>
  durationMs?: number;    // undefined for images
  width?: number;
  height?: number;
  fps?: number;
  thumbnails: string[];   // array of base64 JPEG data URLs, evenly spaced
  createdAt: number;
}

export interface ProbeResult {
  durationMs: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  codec?: string;
  audioCodec?: string;
  needsTranscode: boolean; // true if codec is not browser-safe
}
