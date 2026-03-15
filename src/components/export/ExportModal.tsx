'use client';

import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useExport, type ExportOptions } from '@/hooks/useExport';

const RESOLUTIONS = ['480p', '720p', '1080p', '4k'] as const;
const FPS_OPTIONS = [24, 25, 30, 60] as const;

export default function ExportModal() {
  const open            = useEditorStore((s) => s.exportModalOpen);
  const setOpen         = useEditorStore((s) => s.setExportModalOpen);
  const exportProgress  = useEditorStore((s) => s.exportProgress);
  const durationMs      = useProjectStore((s) => s.project.timeline.durationMs);
  const fps             = useProjectStore((s) => s.project.settings.fps);
  const clips           = useProjectStore((s) => s.project.clips);

  const { startExport, cancel } = useExport();

  const [resolution, setResolution] = useState<ExportOptions['resolution']>('1080p');
  const [exportFps,  setExportFps]  = useState(fps ?? 30);
  const [quality,    setQuality]    = useState(85);
  const [audio,      setAudio]      = useState(true);
  const [range,      setRange]      = useState<'all' | 'inout'>('all');
  const [error,      setError]      = useState<string | null>(null);

  const inPointMs  = useEditorStore((s) => s.playback.inPointMs);
  const outPointMs = useEditorStore((s) => s.playback.outPointMs);

  const isExporting = exportProgress !== null;

  if (!open) return null;

  function hasAudioInTimeline(): boolean {
    return Object.values(clips).some((c) => c.type === 'audio' || c.type === 'video');
  }

  async function handleExport() {
    setError(null);

    if (audio && !hasAudioInTimeline()) {
      setError('Your timeline has no audio or video clips. Disable "Include audio" or add a video/audio clip first.');
      return;
    }

    const opts: ExportOptions = {
      resolution,
      fps: exportFps,
      quality,
      includeAudio: audio,
      startTimeMs: range === 'inout' && inPointMs != null  ? inPointMs  : 0,
      endTimeMs:   range === 'inout' && outPointMs != null ? outPointMs : durationMs,
    };
    try {
      await startExport(opts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-md p-6 text-sm text-white">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base">Export Video</h2>
          {!isExporting && (
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-500 hover:text-neutral-200 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Resolution */}
          <div className="flex items-center justify-between">
            <label className="text-neutral-400">Resolution</label>
            <div className="flex gap-1.5">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    resolution === r
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div className="flex items-center justify-between">
            <label className="text-neutral-400">Frame rate</label>
            <div className="flex gap-1.5">
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => setExportFps(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    exportFps === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-neutral-400">Quality</label>
              <span className="text-neutral-300 text-xs tabular-nums">{quality}%</span>
            </div>
            <input
              type="range" min={10} max={100} step={5} value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-neutral-600 text-xs">
              <span>Smaller file</span>
              <span>Best quality</span>
            </div>
          </div>

          {/* Audio */}
          <div className="flex items-center justify-between">
            <label className="text-neutral-400">Include audio</label>
            <button
              onClick={() => setAudio((a) => !a)}
              className={`w-10 h-5 rounded-full transition-colors relative ${audio ? 'bg-indigo-600' : 'bg-neutral-700'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${audio ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Range */}
          <div className="flex items-center justify-between">
            <label className="text-neutral-400">Range</label>
            <div className="flex gap-1.5">
              {(['all', 'inout'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  disabled={r === 'inout' && (inPointMs == null || outPointMs == null)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    range === r
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {r === 'all' ? 'Full timeline' : 'In / Out points'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-red-400 text-xs bg-red-500/10 rounded p-2">{error}</p>
        )}

        {/* Progress */}
        {isExporting && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Rendering…</span>
              <span>{Math.round((exportProgress ?? 0) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${Math.round((exportProgress ?? 0) * 100)}%` }}
              />
            </div>
            <button
              onClick={cancel}
              className="w-full mt-2 py-1.5 rounded text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Actions */}
        {!isExporting && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={durationMs <= 0}
              className="flex-1 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              Export MP4
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
