'use client';

import type { VideoClip, ImageClip, ColorCorrection } from '@shared/types/clips';
import { useProjectStore } from '@/stores/projectStore';

interface Props {
  clip: VideoClip | ImageClip;
}

const DEFAULT_CC: ColorCorrection = { brightness: 0, contrast: 0, saturation: 0 };

const SLIDERS: { key: keyof ColorCorrection; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast',   label: 'Contrast'   },
  { key: 'saturation', label: 'Saturation'  },
];

export default function ColorCorrectionControls({ clip }: Props) {
  const updateClip          = useProjectStore((s) => s.updateClip);
  const updateClipAndCommit = useProjectStore((s) => s.updateClipAndCommit);
  const pushHistory         = useProjectStore((s) => s.pushHistory);

  const cc = clip.colorCorrection ?? DEFAULT_CC;

  const isDefault =
    cc.brightness === 0 && cc.contrast === 0 && cc.saturation === 0;

  function handleChange(key: keyof ColorCorrection, value: number) {
    updateClip(clip.id, {
      colorCorrection: { ...cc, [key]: value },
    } as Partial<VideoClip | ImageClip>);
  }

  function handleCommit() {
    pushHistory();
  }

  function handleReset() {
    updateClipAndCommit(clip.id, { colorCorrection: undefined } as Partial<VideoClip | ImageClip>);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-neutral-500 uppercase tracking-wider">Color</label>
        {!isDefault && (
          <button
            onClick={handleReset}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-2">
        {SLIDERS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">{label}</span>
            <input
              type="range"
              min={-1} max={1} step={0.01}
              value={cc[key]}
              onChange={(e) => handleChange(key, parseFloat(e.target.value))}
              onMouseUp={handleCommit}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-neutral-400 w-10 text-right tabular-nums">
              {cc[key] >= 0 ? '+' : ''}{Math.round(cc[key] * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
