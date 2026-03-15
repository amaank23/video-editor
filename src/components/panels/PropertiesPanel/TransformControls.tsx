'use client';

import { useRef } from 'react';
import type { Clip } from '@shared/types/clips';
import { useProjectStore } from '@/stores/projectStore';

interface Props { clip: Clip }

interface FieldDef {
  label: string;
  key: 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity';
  scale: number;   // multiply stored value by this to display
  min: number;
  max: number;
  step: number;
  unit: string;
}

const FIELDS: FieldDef[] = [
  { label: 'X',        key: 'x',        scale: 100, min: -200, max: 200, step: 0.5, unit: '%' },
  { label: 'Y',        key: 'y',        scale: 100, min: -200, max: 200, step: 0.5, unit: '%' },
  { label: 'W',        key: 'width',    scale: 100, min: 0,    max: 200, step: 0.5, unit: '%' },
  { label: 'H',        key: 'height',   scale: 100, min: 0,    max: 200, step: 0.5, unit: '%' },
  { label: 'Rotation', key: 'rotation', scale: 1,   min: -360, max: 360, step: 1,   unit: '°' },
  { label: 'Opacity',  key: 'opacity',  scale: 100, min: 0,    max: 100, step: 1,   unit: '%' },
];

export default function TransformControls({ clip }: Props) {
  const updateClip  = useProjectStore((s) => s.updateClip);
  const pushHistory = useProjectStore((s) => s.pushHistory);
  // Capture the displayed value at focus time; only push history if it changed
  const focusValueRef = useRef<number | null>(null);

  function onChange(key: FieldDef['key'], displayValue: number, scale: number) {
    updateClip(clip.id, {
      transform: { ...clip.transform, [key]: displayValue / scale },
    });
  }

  return (
    <div>
      <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-2">Transform</label>
      <div className="space-y-1.5">
        {FIELDS.map(({ label, key, scale, min, max, step, unit }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 w-14 shrink-0">{label}</span>
            <input
              type="number"
              value={parseFloat((clip.transform[key] * scale).toFixed(2))}
              min={min}
              max={max}
              step={step}
              onFocus={(e) => { focusValueRef.current = parseFloat(e.target.value); }}
              onChange={(e) => onChange(key, parseFloat(e.target.value) || 0, scale)}
              onBlur={(e) => {
                const current = parseFloat(e.target.value) || 0;
                if (current !== focusValueRef.current) pushHistory();
                focusValueRef.current = null;
              }}
              className="flex-1 bg-neutral-800 text-xs text-neutral-200 px-2 py-1 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-neutral-600 w-4 shrink-0">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
