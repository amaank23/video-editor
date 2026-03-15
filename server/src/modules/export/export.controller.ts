import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import ffmpeg from 'fluent-ffmpeg';
import { prisma } from '../../lib/prisma';
import { probeFile } from '../../shared/ffmpeg';
import { ensureExportDir } from '../../shared/storage';
import type { ExportJobStatus, ExportJobOptions } from './export.types';

// ── In-memory job store ────────────────────────────────────────────────────

const jobs = new Map<string, ExportJobStatus & { outputPath?: string }>();

// ── Resolution presets ─────────────────────────────────────────────────────

const RESOLUTION: Record<string, { w: number; h: number }> = {
  '480p':  { w: 854,  h: 480  },
  '720p':  { w: 1280, h: 720  },
  '1080p': { w: 1920, h: 1080 },
  '4k':    { w: 3840, h: 2160 },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Convert normalized (0-1) transform to pixel values at the given resolution. */
function transformToPx(
  t: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number },
  canvasW: number,
  canvasH: number,
) {
  const w = Math.round(t.width  * canvasW  * t.scaleX);
  const h = Math.round(t.height * canvasH  * t.scaleY);
  const x = Math.round(t.x * canvasW - w / 2);
  const y = Math.round(t.y * canvasH - h / 2);
  return { x, y, w, h };
}

/** Escape text for FFmpeg drawtext filter. */
function escapeDrawtext(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
}

/** Validate jobId is a nanoid-shaped alphanumeric string (prevents path traversal). */
const JOB_ID_RE = /^[A-Za-z0-9_-]{10,30}$/;
function isValidJobId(id: string): boolean {
  return JOB_ID_RE.test(id);
}

/** Clamp a numeric DB value into a safe range, falling back to `def`. */
function safeNum(val: unknown, def: number, min: number, max: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

/** Validate a hex color string and return an FFmpeg-safe value (hex without #). */
function safeColor(val: unknown, def = 'ffffff'): string {
  const s = String(val ?? '').replace(/^#/, '');
  return /^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(s) ? s : def;
}

// ── Main export builder ────────────────────────────────────────────────────

async function runExport(
  jobId: string,
  projectId: string,
  opts: ExportJobOptions,
): Promise<void> {
  const job = jobs.get(jobId)!;
  job.status = 'rendering';
  job.progress = 0;

  try {
    // Load project from DB
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tracks: { include: { clips: true }, orderBy: { order: 'asc' } },
        assets: true,
      },
    });
    if (!project) throw new Error('Project not found');

    const settings = project.settings as {
      width: number; height: number; fps: number; backgroundColor: string;
    };

    const resolution = RESOLUTION[opts.resolution] ?? { w: settings.width, h: settings.height };
    const fps        = opts.fps ?? settings.fps ?? 30;
    const startSec   = (opts.startTimeMs ?? 0) / 1000;
    const endSec     = opts.endTimeMs   != null ? opts.endTimeMs   / 1000
                     : Math.max(...project.tracks.flatMap((t) =>
                         t.clips.map((c) => (c.startTimeMs + c.durationMs) / 1000)
                       ), 1);
    const totalSec   = Math.max(0.1, endSec - startSec);
    const bg         = settings.backgroundColor ?? '#000000';
    const assetMap   = new Map(project.assets.map((a) => [a.id, a]));

    // Collect all unique asset file paths for inputs
    const assetPaths: string[] = [];
    const assetIndex  = new Map<string, number>();

    // Flatten all clips sorted by track order
    type AnyClip = {
      id: string; trackId: string; type: string;
      startTimeMs: number; durationMs: number; trimStartMs: number; trimEndMs: number;
      transform: unknown; animations: unknown;
      name: string; locked: boolean; visible: boolean;
      properties: unknown;
    };

    const allClips: AnyClip[] = project.tracks.flatMap((t) =>
      t.clips.map((c) => ({ ...c, properties: c.properties as Record<string, unknown> }))
    );

    // Register asset file paths and probe for audio
    const hasAudioMap = new Map<string, boolean>();
    for (const clip of allClips) {
      const props = clip.properties as Record<string, unknown>;
      const assetId = props.assetId as string | undefined;
      if (!assetId) continue;
      const asset = assetMap.get(assetId);
      if (!asset || assetIndex.has(assetId)) continue;
      assetIndex.set(assetId, assetPaths.length);
      assetPaths.push(asset.filePath);
      // Probe to check for audio stream (video files only — audio files always have audio)
      if (asset.type === 'video') {
        try {
          const probe = await probeFile(asset.filePath);
          hasAudioMap.set(assetId, probe.hasAudio);
        } catch {
          hasAudioMap.set(assetId, false);
        }
      } else if (asset.type === 'audio') {
        hasAudioMap.set(assetId, true);
      }
    }

    // ── Build filter_complex ───────────────────────────────────────────────

    const filterParts: string[] = [];
    let   prevVideo              = 'bg';
    const audioStreams: string[] = [];
    let   clipCounter            = 0;
    const { w: cW, h: cH } = resolution;

    // Background: solid color for the full duration
    const bgInputIdx = assetPaths.length; // background lavfi input is always last
    filterParts.push(
      `[${bgInputIdx}:v]trim=duration=${totalSec},fps=${fps},format=rgba[bg]`
    );

    for (const clip of allClips) {
      const props   = clip.properties as Record<string, unknown>;
      const assetId = props.assetId as string | undefined;
      const clipStartSec = clip.startTimeMs / 1000 - startSec;
      const clipEndSec   = clipStartSec + clip.durationMs / 1000;

      // Skip clips entirely outside the export range
      if (clipEndSec <= 0 || clipStartSec >= totalSec) continue;

      const visStart = Math.max(0, clipStartSec);
      const visEnd   = Math.min(totalSec, clipEndSec);
      const enableExpr = `between(t,${visStart.toFixed(3)},${visEnd.toFixed(3)})`;
      const n = clipCounter++;

      const transform = clip.transform as {
        x: number; y: number; width: number; height: number;
        scaleX: number; scaleY: number; opacity: number; rotation: number;
      };
      const { x, y, w, h } = transformToPx(transform, cW, cH);

      if (clip.type === 'video' && assetId) {
        const idx       = assetIndex.get(assetId)!;
        const trimStart = clip.trimStartMs / 1000;
        const trimDur   = clip.durationMs  / 1000;
        const delay     = Math.max(0, clipStartSec);
        const opacity   = transform.opacity ?? 1;

        filterParts.push(
          `[${idx}:v]trim=start=${trimStart}:duration=${trimDur},setpts=PTS-STARTPTS+${delay}/TB,` +
          `scale=${w}:${h},format=rgba,colorchannelmixer=aa=${opacity}[v${n}]`
        );
        filterParts.push(
          `[${prevVideo}][v${n}]overlay=${x}:${y}:enable='${enableExpr}'[comp${n}]`
        );
        prevVideo = `comp${n}`;

        // Audio track from this video clip (only if the file has an audio stream)
        if (opts.includeAudio !== false && hasAudioMap.get(assetId)) {
          const vol = safeNum(props.volume, 1, 0, 10);
          const delayMs = Math.round(delay * 1000);
          filterParts.push(
            `[${idx}:a]atrim=start=${trimStart}:duration=${trimDur},` +
            `asetpts=PTS-STARTPTS,adelay=${delayMs}:all=1,volume=${vol}[a${n}]`
          );
          audioStreams.push(`[a${n}]`);
        }
      } else if (clip.type === 'image' && assetId) {
        const idx     = assetIndex.get(assetId)!;
        const delay   = Math.max(0, clipStartSec);
        const opacity = transform.opacity ?? 1;

        filterParts.push(
          `[${idx}:v]loop=loop=-1:size=1,trim=duration=${clip.durationMs / 1000},` +
          `setpts=PTS-STARTPTS+${delay}/TB,scale=${w}:${h},format=rgba,colorchannelmixer=aa=${opacity}[v${n}]`
        );
        filterParts.push(
          `[${prevVideo}][v${n}]overlay=${x}:${y}:enable='${enableExpr}'[comp${n}]`
        );
        prevVideo = `comp${n}`;
      } else if (clip.type === 'text') {
        const textContent  = String(props.content ?? '');
        const fontSize     = safeNum(props.fontSize, 36, 1, 500);
        const color        = safeColor(props.color);
        const textLines    = textContent.split('\n');
        const escapedLines = textLines.map((l) => escapeDrawtext(l));

        // Stack drawtext filters for multi-line text
        let textBase = `[${prevVideo}]`;
        for (let li = 0; li < escapedLines.length; li++) {
          const yOffset = Math.round(y + li * fontSize * 1.2);
          textBase +=
            `drawtext=text='${escapedLines[li]}':x=${x}:y=${yOffset}` +
            `:fontsize=${fontSize}:fontcolor=0x${color}:enable='${enableExpr}'`;
          if (li < escapedLines.length - 1) textBase += ',';
        }
        textBase += `[comp${n}]`;
        filterParts.push(textBase);
        prevVideo = `comp${n}`;
      } else if (clip.type === 'audio' && assetId) {
        if (opts.includeAudio !== false) {
          const idx         = assetIndex.get(assetId)!;
          const trimStart   = clip.trimStartMs / 1000;
          const trimDur     = clip.durationMs  / 1000;
          const delay       = Math.max(0, clipStartSec);
          const vol     = safeNum(props.volume, 1, 0, 10);
          const delayMs = Math.round(delay * 1000);
          filterParts.push(
            `[${idx}:a]atrim=start=${trimStart}:duration=${trimDur},` +
            `asetpts=PTS-STARTPTS,adelay=${delayMs}:all=1,volume=${vol}[a${n}]`
          );
          audioStreams.push(`[a${n}]`);
        }
      }
    }

    // If multiple audio streams, mix them down to one with amix
    const outputMappings: string[] = [`[${prevVideo}]`];
    if (audioStreams.length > 1) {
      const amixLabel = 'amix_out';
      filterParts.push(
        audioStreams.join('') + `amix=inputs=${audioStreams.length}:normalize=0[${amixLabel}]`
      );
      outputMappings.push(`[${amixLabel}]`);
    } else if (audioStreams.length === 1) {
      outputMappings.push(audioStreams[0]);
    }
    const finalFilter = filterParts.join('; ');
    const outputPath  = path.join(ensureExportDir(), `${jobId}.mp4`);

    // ── Build ffmpeg command ───────────────────────────────────────────────

    let cmd = ffmpeg();

    // Asset inputs
    for (const p of assetPaths) cmd = cmd.input(p);

    // Background color input (lavfi)
    cmd = cmd.input(`color=${bg.replace('#', '')}:s=${cW}x${cH}:r=${fps}`)
             .inputOptions(['-f', 'lavfi']);

    // Normalise all audio to 44100 Hz before adelay so delay samples are correct
    cmd = cmd.complexFilter(finalFilter);

    // Map all output streams
    for (const m of outputMappings) {
      cmd = cmd.outputOptions([`-map ${m}`]);
    }

    // Video + audio codec options
    const crf = opts.quality ? Math.round(51 - (opts.quality / 100) * 46) : 23;
    cmd = cmd
      .videoCodec('libx264')
      .outputOptions(['-crf', String(crf), '-preset', 'fast', '-movflags', '+faststart'])
      .duration(totalSec)
      .output(outputPath);

    if (audioStreams.length > 0) {
      cmd = cmd.audioCodec('aac').audioBitrate('192k');
    }

    // Run
    await new Promise<void>((resolve, reject) => {
      cmd
        .on('progress', (p) => {
          const percent = totalSec > 0
            ? Math.min(99, ((p.timemark ? timemarkToSec(p.timemark) : 0) / totalSec) * 100)
            : 0;
          jobs.get(jobId)!.progress = Math.round(percent);
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    job.status    = 'done';
    job.progress  = 100;
    job.outputPath = outputPath;
    job.outputUrl  = `/api/export/download/${jobId}`;
  } catch (err) {
    const j = jobs.get(jobId)!;
    j.status = 'error';
    j.error  = err instanceof Error ? err.message : String(err);
    // Auto-evict errored jobs after 30 minutes so the Map doesn't grow unbounded
    setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000);
  }
}

function timemarkToSec(timemark: string): number {
  const parts = timemark.split(':').map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

// ── Route handlers ─────────────────────────────────────────────────────────

const VALID_RESOLUTIONS = new Set(['480p', '720p', '1080p', '4k']);

export function triggerExport(req: Request, res: Response, next: NextFunction): void {
  try {
    const projectId = String(req.params.projectId);
    const body      = req.body as Record<string, unknown>;

    // Validate export options at the system boundary
    const resolution = String(body.resolution ?? '1080p');
    if (!VALID_RESOLUTIONS.has(resolution)) {
      res.status(400).json({ error: `Invalid resolution. Must be one of: ${[...VALID_RESOLUTIONS].join(', ')}` });
      return;
    }
    const fps     = safeNum(body.fps, 30, 1, 120);
    const quality = safeNum(body.quality, 80, 0, 100);
    const includeAudio = body.includeAudio !== false;

    const opts: ExportJobOptions = {
      resolution: resolution as ExportJobOptions['resolution'],
      fps,
      quality,
      includeAudio,
      startTimeMs: body.startTimeMs != null ? safeNum(body.startTimeMs, 0, 0, Infinity) : undefined,
      endTimeMs:   body.endTimeMs   != null ? safeNum(body.endTimeMs,   0, 0, Infinity) : undefined,
    };

    const jobId: string = nanoid();
    const job: ExportJobStatus = {
      jobId,
      projectId,
      status: 'queued',
      progress: 0,
    };
    jobs.set(jobId, job);

    // Fire-and-forget — client polls /status/:jobId
    runExport(jobId, projectId, opts).catch(() => { /* errors stored on job */ });

    res.status(202).json(job);
  } catch (err) {
    next(err);
  }
}

export function getExportStatus(req: Request, res: Response): void {
  const jobId = String(req.params.jobId);
  if (!isValidJobId(jobId)) { res.status(400).json({ error: 'Invalid job ID' }); return; }
  const job = jobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json({
    jobId:     job.jobId,
    projectId: job.projectId,
    status:    job.status,
    progress:  job.progress,
    outputUrl: job.outputUrl,
    error:     job.error,
  } satisfies ExportJobStatus);
}

export function downloadExport(req: Request, res: Response, next: NextFunction): void {
  const jobId = String(req.params.jobId);
  if (!isValidJobId(jobId)) { res.status(400).json({ error: 'Invalid job ID' }); return; }
  const job      = jobs.get(jobId);
  const filePath = job?.outputPath;

  if (!job || job.status !== 'done' || !filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Export file not found or not ready' });
    return;
  }

  res.download(filePath, `export_${jobId}.mp4`, (err) => {
    if (err) { next(err); return; }
    // Clean up in-memory job record once the file has been sent
    jobs.delete(jobId);
  });
}
