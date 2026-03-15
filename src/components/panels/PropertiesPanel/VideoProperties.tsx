'use client';

import type { VideoClip } from '@shared/types/clips';
import { useProjectStore } from '@/stores/projectStore';
import TransformControls from './TransformControls';

interface Props { clip: VideoClip }

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

export default function VideoProperties({ clip }: Props) {
  const updateClip        = useProjectStore((s) => s.updateClip);
  const updateClipAndCommit = useProjectStore((s) => s.updateClipAndCommit);
  const pushHistory       = useProjectStore((s) => s.pushHistory);

  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="text-sm text-neutral-200 truncate font-medium">{clip.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">Video clip</p>
      </div>

      {/* Volume */}
      <div>
        <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-2">Volume</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={clip.volume}
            onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
            onMouseUp={pushHistory}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-xs text-neutral-400 w-8 text-right tabular-nums">
            {Math.round(clip.volume * 100)}%
          </span>
        </div>
      </div>

      {/* Playback rate */}
      <div>
        <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-2">Speed</label>
        <div className="flex flex-wrap gap-1">
          {RATES.map((r) => (
            <button
              key={r}
              aria-pressed={clip.playbackRate === r}
              onClick={() => updateClipAndCommit(clip.id, { playbackRate: r })}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                clip.playbackRate === r
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>

      <TransformControls clip={clip} />
    </div>
  );
}
