import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import type { ProbeResult } from '../../../shared/types/media';

// BROWSER-SAFE video codecs that don't need transcoding
const BROWSER_SAFE_VIDEO_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1']);
const BROWSER_SAFE_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis']);

export function probeFile(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

      const durationMs = (metadata.format.duration ?? 0) * 1000;
      const codec = videoStream?.codec_name;
      const audioCodec = audioStream?.codec_name;

      let fps: number | undefined;
      if (videoStream?.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        fps = den > 0 ? num / den : undefined;
      }

      const needsTranscode =
        (!!videoStream && !BROWSER_SAFE_VIDEO_CODECS.has(codec ?? '')) ||
        (!!audioStream && !BROWSER_SAFE_AUDIO_CODECS.has(audioCodec ?? ''));

      resolve({
        durationMs,
        width: videoStream?.width,
        height: videoStream?.height,
        fps,
        hasVideo: !!videoStream,
        hasAudio: !!audioStream,
        codec,
        audioCodec,
        needsTranscode,
      });
    });
  });
}

export function extractThumbnails(
  filePath: string,
  count: number,
  outputDir: string,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const duration = metadata.format.duration ?? 0;
      if (duration === 0) return resolve([]);

      const timestamps: number[] = [];
      for (let i = 0; i < count; i++) {
        timestamps.push((duration / count) * i);
      }

      const promises = timestamps.map(
        (t, i) =>
          new Promise<string>((res, rej) => {
            const outFile = path.join(outputDir, `thumb_${String(i).padStart(3, '0')}.jpg`);
            ffmpeg(filePath)
              .seekInput(t)
              .frames(1)
              .size('160x90')
              .output(outFile)
              .on('end', () => {
                try {
                  const data = fs.readFileSync(outFile);
                  const b64 = `data:image/jpeg;base64,${data.toString('base64')}`;
                  fs.unlinkSync(outFile);
                  res(b64);
                } catch (e) {
                  rej(e);
                }
              })
              .on('error', rej)
              .run();
          }),
      );

      Promise.all(promises).then(resolve).catch(reject);
    });
  });
}

export function transcodeToH264(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-crf 23', '-preset fast', '-movflags +faststart'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}
