import type { Project } from '@shared/types/project';
import type { Clip, VideoClip, AudioClip, ImageClip, TextClip } from '@shared/types/clips';
import type { MediaAsset } from '@shared/types/media';
import { getActiveClips } from '../timeline/TimelineEngine';

/**
 * Renders a single video frame to a 2D canvas.
 * Manages pools of HTMLVideoElement and HTMLImageElement to avoid re-creation.
 * No React dependency — can be used inside rAF callbacks.
 */
export class CanvasRenderer {
  private videos = new Map<string, HTMLVideoElement>();
  private images = new Map<string, HTMLImageElement>();

  // ── Asset element management ─────────────────────────────────────────────

  getOrCreateVideo(assetId: string, serveUrl: string): HTMLVideoElement {
    if (!this.videos.has(assetId)) {
      const video = document.createElement('video');
      // crossOrigin MUST be set before src — setting src first starts a
      // non-CORS fetch, tainting the canvas when drawImage is called later.
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.src = serveUrl;
      this.videos.set(assetId, video);
    }
    return this.videos.get(assetId)!;
  }

  getOrCreateImage(assetId: string, serveUrl: string): HTMLImageElement {
    if (!this.images.has(assetId)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = serveUrl;
      this.images.set(assetId, img);
    }
    return this.images.get(assetId)!;
  }

  /** Play all video elements whose clips are active at timeMs. */
  playVideos(project: Project, assets: Record<string, MediaAsset>, timeMs: number) {
    for (const clip of Object.values(project.clips)) {
      if (clip.type !== 'video') continue;
      const vc = clip as VideoClip;
      const asset = assets[vc.assetId];
      if (!asset) continue;

      const video = this.getOrCreateVideo(vc.assetId, asset.serveUrl);
      const isActive = timeMs >= clip.startTimeMs && timeMs < clip.startTimeMs + clip.durationMs;

      video.volume       = Math.max(0, Math.min(1, vc.volume));
      video.playbackRate = vc.playbackRate ?? 1;

      if (isActive) {
        const targetSec = (clip.trimStartMs + (timeMs - clip.startTimeMs)) / 1000;
        // Seek if more than one frame off (~50 ms at 24 fps)
        if (video.readyState >= 1 && Math.abs(video.currentTime - targetSec) > 0.05) {
          video.currentTime = targetSec;
        }
        if (video.paused) video.play().catch(() => {/* autoplay blocked — ignore */});
      } else {
        if (!video.paused) video.pause();
      }
    }
  }

  /** Pause all managed video elements. */
  pauseVideos() {
    for (const video of this.videos.values()) {
      if (!video.paused) video.pause();
    }
  }

  /** Seek all video elements to the correct position for a still frame at timeMs. */
  seekVideos(project: Project, assets: Record<string, MediaAsset>, timeMs: number) {
    for (const clip of Object.values(project.clips)) {
      if (clip.type !== 'video') continue;
      const vc = clip as VideoClip;
      const asset = assets[vc.assetId];
      if (!asset) continue;

      const isActive = timeMs >= clip.startTimeMs && timeMs < clip.startTimeMs + clip.durationMs;
      if (!isActive) continue;

      const video = this.getOrCreateVideo(vc.assetId, asset.serveUrl);
      const targetSec = (clip.trimStartMs + (timeMs - clip.startTimeMs)) / 1000;
      if (video.readyState >= 1) {
        video.currentTime = targetSec;
      }
    }
  }

  // ── Frame rendering ──────────────────────────────────────────────────────

  render(
    ctx: CanvasRenderingContext2D,
    project: Project,
    timeMs: number,
    assets: Record<string, MediaAsset>,
  ) {
    const { width, height, backgroundColor } = project.settings;

    // Background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const activeClips = getActiveClips(project, timeMs);
    if (activeClips.length === 0) return;

    // Render in track order (index 0 = bottom, last = top)
    const orderMap = new Map(project.timeline.tracks.map((t, i) => [t.id, i]));
    activeClips.sort((a, b) => (orderMap.get(a.trackId) ?? 0) - (orderMap.get(b.trackId) ?? 0));

    for (const clip of activeClips) {
      this.renderClip(ctx, clip, timeMs, assets, width, height);
    }
  }

  private renderClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    timeMs: number,
    assets: Record<string, MediaAsset>,
    canvasW: number,
    canvasH: number,
  ) {
    const { transform } = clip;
    // Normalized (0-1) → canvas pixels; x/y is the element's CENTER
    const cx = transform.x * canvasW;
    const cy = transform.y * canvasH;
    const w  = transform.width  * canvasW  * transform.scaleX;
    const h  = transform.height * canvasH  * transform.scaleY;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, transform.opacity));

    // Apply rotation around the element's center
    if (transform.rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    switch (clip.type) {
      case 'video': {
        const vc    = clip as VideoClip;
        const asset = assets[vc.assetId];
        if (!asset) break;

        const video = this.getOrCreateVideo(vc.assetId, asset.serveUrl);
        if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
          ctx.drawImage(video, cx - w / 2, cy - h / 2, w, h);
        }
        break;
      }

      case 'image': {
        const ic    = clip as ImageClip;
        const asset = assets[ic.assetId];
        if (!asset) break;

        const img = this.getOrCreateImage(ic.assetId, asset.serveUrl);
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        }
        break;
      }

      case 'text': {
        const tc = clip as TextClip;
        const style = `${tc.fontStyle} ${tc.fontWeight} ${tc.fontSize}px ${tc.fontFamily}`;

        if (tc.backgroundColor) {
          ctx.fillStyle = tc.backgroundColor;
          ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        }

        ctx.font         = style;
        ctx.fillStyle    = tc.color;
        ctx.textAlign    = tc.textAlign;
        ctx.textBaseline = 'middle';

        const lines      = tc.content.split('\n');
        const lineH      = tc.fontSize * (tc.lineHeight ?? 1.2);
        const totalH     = lines.length * lineH;
        const startY     = cy - totalH / 2 + lineH / 2;

        if (tc.strokeColor && tc.strokeWidth) {
          ctx.strokeStyle = tc.strokeColor;
          ctx.lineWidth   = tc.strokeWidth;
          lines.forEach((line, i) => {
            ctx.strokeText(line, cx, startY + i * lineH, w);
          });
        }
        lines.forEach((line, i) => {
          ctx.fillText(line, cx, startY + i * lineH, w);
        });
        break;
      }

      case 'audio':
        // Audio clips have no visual — handled by AudioEngine
        break;
    }

    ctx.restore();
  }

  destroy() {
    for (const video of this.videos.values()) {
      video.pause();
      video.src = '';
    }
    this.videos.clear();
    this.images.clear();
  }
}
