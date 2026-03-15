import type { Project } from '@shared/types/project';
import type { AudioClip } from '@shared/types/clips';
import type { MediaAsset } from '@shared/types/media';

/**
 * Manages HTMLAudioElement instances for audio-only clips.
 * Video clip audio is handled directly by the video elements in CanvasRenderer.
 */
export class AudioEngine {
  private elements = new Map<string, HTMLAudioElement>(); // clipId → element

  private getOrCreate(clipId: string, serveUrl: string): HTMLAudioElement {
    if (!this.elements.has(clipId)) {
      const audio = new Audio(serveUrl);
      audio.preload = 'auto';
      this.elements.set(clipId, audio);
    }
    return this.elements.get(clipId)!;
  }

  /** Start playing all audio clips that are active at timeMs. */
  play(project: Project, assets: Record<string, MediaAsset>, timeMs: number) {
    for (const clip of Object.values(project.clips)) {
      if (clip.type !== 'audio') continue;
      const ac    = clip as AudioClip;
      const asset = assets[ac.assetId];
      if (!asset) continue;

      const isActive = timeMs >= clip.startTimeMs && timeMs < clip.startTimeMs + clip.durationMs;
      const audio = this.getOrCreate(clip.id, asset.serveUrl);
      audio.volume = ac.volume;

      if (isActive) {
        const targetSec = (clip.trimStartMs + (timeMs - clip.startTimeMs)) / 1000;
        audio.playbackRate = ac.playbackRate ?? 1;
        if (audio.readyState >= 1) {
          audio.currentTime = targetSec;
        }
        audio.play().catch(() => {/* autoplay blocked */});
      } else {
        if (!audio.paused) audio.pause();
      }
    }
  }

  /** Pause all managed audio elements. */
  pause() {
    for (const audio of this.elements.values()) {
      if (!audio.paused) audio.pause();
    }
  }

  /** Seek all audio clips to the correct position without playing. */
  seek(project: Project, assets: Record<string, MediaAsset>, timeMs: number) {
    for (const clip of Object.values(project.clips)) {
      if (clip.type !== 'audio') continue;
      const ac    = clip as AudioClip;
      const asset = assets[ac.assetId];
      if (!asset) continue;

      const isActive = timeMs >= clip.startTimeMs && timeMs < clip.startTimeMs + clip.durationMs;
      if (!isActive) continue;

      const audio = this.getOrCreate(clip.id, asset.serveUrl);
      const targetSec = (clip.trimStartMs + (timeMs - clip.startTimeMs)) / 1000;
      if (audio.readyState >= 1) {
        audio.currentTime = targetSec;
      }
    }
  }

  destroy() {
    for (const audio of this.elements.values()) {
      audio.pause();
      audio.src = '';
    }
    this.elements.clear();
  }
}
