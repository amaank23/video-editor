/**
 * Convert milliseconds to a human-readable timecode string HH:MM:SS.mmm
 */
export function msToTimecode(ms: number, showMs = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (showMs) {
    const mmm = String(milliseconds).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${mmm}`;
  }

  return `${hh}:${mm}:${ss}`;
}

/**
 * Convert frame number to milliseconds given fps
 */
export function framesToMs(frame: number, fps: number): number {
  return (frame / fps) * 1000;
}

/**
 * Convert milliseconds to frame number given fps
 */
export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/**
 * Snap a time value to the nearest frame boundary
 */
export function snapToFrame(ms: number, fps: number): number {
  return framesToMs(Math.round(msToFrame(ms, fps)), fps);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
