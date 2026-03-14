export type ExportFormat = 'mp4' | 'webm' | 'gif';
export type ExportResolution = '480p' | '720p' | '1080p' | '4k';

export interface ExportJobOptions {
  format: ExportFormat;
  resolution: ExportResolution;
  fps: number;
  quality: number;
  includeAudio: boolean;
  startTimeMs: number;
  endTimeMs: number;
}

export interface ExportJobStatus {
  jobId: string;
  projectId: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  outputUrl?: string;
  error?: string;
}
