'use client';

import type { AudioClip } from '@shared/types/clips';
import { useProjectStore } from '@/stores/projectStore';

interface Props { clip: AudioClip }

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

function SliderRow({
  label, value, min, max, step, unit, onChange, onCommit,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; onCommit: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-xs text-neutral-500 uppercase tracking-wider">{label}</label>
        <span className="text-xs text-neutral-400 tabular-nums">{Math.round(value)}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onMouseUp={onCommit}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

export default function AudioProperties({ clip }: Props) {
  const updateClip        = useProjectStore((s) => s.updateClip);
  const updateClipAndCommit = useProjectStore((s) => s.updateClipAndCommit);
  const pushHistory       = useProjectStore((s) => s.pushHistory);

  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="text-sm text-neutral-200 truncate font-medium">{clip.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">Audio clip</p>
      </div>

      <SliderRow label="Volume" value={clip.volume * 100} min={0} max={100} step={1} unit="%"
        onChange={(v) => updateClip(clip.id, { volume: v / 100 })} onCommit={pushHistory} />

      <SliderRow label="Fade in" value={clip.fadeInMs} min={0} max={5000} step={50} unit="ms"
        onChange={(v) => updateClip(clip.id, { fadeInMs: v })} onCommit={pushHistory} />

      <SliderRow label="Fade out" value={clip.fadeOutMs} min={0} max={5000} step={50} unit="ms"
        onChange={(v) => updateClip(clip.id, { fadeOutMs: v })} onCommit={pushHistory} />

      <div>
        <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-2">Speed</label>
        <div className="flex flex-wrap gap-1">
          {RATES.map((r) => (
            <button key={r}
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
    </div>
  );
}
