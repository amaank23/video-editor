'use client';

import { useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { startExportJob, pollExportJob, getExportDownloadUrl } from '@/lib/api/projects';

export interface ExportOptions {
  resolution: '480p' | '720p' | '1080p' | '4k';
  fps: number;
  quality: number;   // 0-100
  includeAudio: boolean;
  startTimeMs?: number;
  endTimeMs?: number;
}

/**
 * Drives the server-side FFmpeg export:
 *  1. POST /api/export/:projectId  → starts job
 *  2. Poll GET /api/export/status/:jobId every second
 *  3. When done, trigger download via window.open
 */
export function useExport() {
  const setExportProgress  = useEditorStore((s) => s.setExportProgress);
  const setExportModalOpen = useEditorStore((s) => s.setExportModalOpen);
  const projectId          = useProjectStore((s) => s.project.id);
  const pollRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancel = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setExportProgress(null);
  };

  const startExport = async (opts: ExportOptions): Promise<void> => {
    if (pollRef.current) cancel(); // clear any stale poll

    setExportProgress(0);
    setExportModalOpen(false);

    try {
      const job = await startExportJob(projectId, opts);
      if (job.status === 'error') throw new Error(job.error ?? 'Export failed to start');

      await new Promise<void>((resolve, reject) => {
        pollRef.current = setInterval(async () => {
          try {
            const status = await pollExportJob(job.jobId);
            setExportProgress(status.progress / 100);

            if (status.status === 'done') {
              clearInterval(pollRef.current!);
              pollRef.current = null;
              setExportProgress(null);
              // Open download in a new tab
              const a = document.createElement('a');
              a.href = getExportDownloadUrl(job.jobId);
              a.download = `export_${job.jobId}.mp4`;
              a.click();
              resolve();
            } else if (status.status === 'error') {
              clearInterval(pollRef.current!);
              pollRef.current = null;
              setExportProgress(null);
              reject(new Error(status.error ?? 'Export failed'));
            }
          } catch (err) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setExportProgress(null);
            reject(err);
          }
        }, 1000);
      });
    } catch (err) {
      setExportProgress(null);
      throw err;
    }
  };

  return { startExport, cancel };
}
