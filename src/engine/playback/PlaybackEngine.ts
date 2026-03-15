export type TickCallback = (timeMs: number) => void;
export type EndedCallback = () => void;

/**
 * Pure timing engine — no React, no DOM.
 * Uses performance.now() + requestAnimationFrame for frame-accurate playback.
 */
export class PlaybackEngine {
  private rafId: number | null = null;
  private startProjectMs = 0;   // project time at which play began
  private startWallMs    = 0;   // performance.now() at which play began
  private _currentMs     = 0;
  private _durationMs    = 0;
  private _loop          = false;

  constructor(
    private readonly onTick: TickCallback,
    private readonly onEnded: EndedCallback,
  ) {}

  get currentMs()  { return this._currentMs; }
  get isRunning()  { return this.rafId !== null; }

  play(fromMs: number, durationMs: number, loop = false) {
    this.cancelRaf();
    this._durationMs    = durationMs;
    this._loop          = loop;
    this.startProjectMs = fromMs;
    this.startWallMs    = performance.now();
    this._currentMs     = fromMs;
    this.scheduleTick();
  }

  pause() {
    this.cancelRaf();
    // _currentMs stays at the paused position
  }

  /** Update the current position without starting/stopping playback. */
  seek(ms: number) {
    this._currentMs     = Math.max(0, this._durationMs > 0 ? Math.min(ms, this._durationMs) : ms);
    // If playing, re-anchor the wall clock so timing stays correct
    if (this.isRunning) {
      this.startProjectMs = this._currentMs;
      this.startWallMs    = performance.now();
    }
  }

  destroy() {
    this.cancelRaf();
  }

  private cancelRaf() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private scheduleTick() {
    this.rafId = requestAnimationFrame(this.tick);
  }

  private readonly tick = () => {
    const elapsed = performance.now() - this.startWallMs;
    let t = this.startProjectMs + elapsed;

    if (t >= this._durationMs) {
      if (this._loop && this._durationMs > 0) {
        // Wrap around preserving the fractional overshoot so loops are smooth
        const wrapped = t % this._durationMs;
        this.startProjectMs = wrapped;
        this.startWallMs    = performance.now();
        t = wrapped;
      } else {
        this._currentMs = this._durationMs;
        this.onTick(this._currentMs);
        this.rafId = null;
        this.onEnded();
        return;
      }
    }

    this._currentMs = t;
    this.onTick(t);
    this.scheduleTick();
  };
}
