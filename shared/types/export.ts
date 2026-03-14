export type ExportFormat = 'mp4' | 'webm' | 'gif';
export type ExportResolution = '480p' | '720p' | '1080p' | '4k';

export interface ExportOptions {
  format: ExportFormat;
  resolution: ExportResolution;
  fps: number;
  quality: number;       // 0-1, maps to CRF for h264 (0=best, 1=worst)
  includeAudio: boolean;
  startTimeMs: number;
  endTimeMs: number;
}

export interface ExportJob {
  id: string;
  projectId: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;      // 0-1
  outputUrl?: string;    // set when status === 'done'
  errorMessage?: string; // set when status === 'error'
  createdAt: number;
}

export const RESOLUTION_MAP: Record<ExportResolution, { width: number; height: number }> = {
  '480p':  { width: 854,  height: 480  },
  '720p':  { width: 1280, height: 720  },
  '1080p': { width: 1920, height: 1080 },
  '4k':    { width: 3840, height: 2160 },
};
