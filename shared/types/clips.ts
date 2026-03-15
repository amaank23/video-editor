export type ClipId = string;
export type TrackId = string;
export type AssetId = string;
export type ClipType = 'video' | 'audio' | 'image' | 'text';
export type TrackType = 'video' | 'audio' | 'overlay';

export interface Transform {
  x: number;        // 0-1 normalized canvas position
  y: number;
  width: number;    // 0-1 normalized
  height: number;
  rotation: number; // degrees
  opacity: number;  // 0-1
  scaleX: number;   // multiplicative
  scaleY: number;
}

export type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';

export interface Keyframe<T = number> {
  timeMs: number;         // relative to clip startTimeMs
  value: T;
  easing: EasingFunction;
}

export interface AnimationTrack {
  property: keyof Transform;
  keyframes: Keyframe[];
}

interface BaseClip {
  id: ClipId;
  type: ClipType;
  trackId: TrackId;
  startTimeMs: number;    // global project time where clip begins
  durationMs: number;     // visible duration on timeline
  trimStartMs: number;    // offset into source asset
  trimEndMs: number;      // end offset into source asset
  transform: Transform;
  animations: AnimationTrack[];
  name: string;
  locked: boolean;
  visible: boolean;
}

export interface ColorCorrection {
  brightness: number;   // -1 to 1  (0 = no change)
  contrast: number;     // -1 to 1
  saturation: number;   // -1 to 1
}

export interface VideoClip extends BaseClip {
  type: 'video';
  assetId: AssetId;
  volume: number;          // 0-1
  playbackRate: number;    // 0.25-4.0
  cropRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  colorCorrection?: ColorCorrection;
}

export interface AudioClip extends BaseClip {
  type: 'audio';
  assetId: AssetId;
  volume: number;
  playbackRate: number;
  fadeInMs: number;
  fadeOutMs: number;
}

export interface ImageClip extends BaseClip {
  type: 'image';
  assetId: AssetId;
  colorCorrection?: ColorCorrection;
}

export interface TextClip extends BaseClip {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export type Clip = VideoClip | AudioClip | ImageClip | TextClip;
