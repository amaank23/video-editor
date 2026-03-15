'use client';

import type { TextClip } from '@shared/types/clips';
import { useProjectStore } from '@/stores/projectStore';
import TransformControls from './TransformControls';

interface Props { clip: TextClip }

const FONTS = ['Inter', 'Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana'];
const ALIGNS: Array<TextClip['textAlign']> = ['left', 'center', 'right'];

export default function TextProperties({ clip }: Props) {
  const updateClip  = useProjectStore((s) => s.updateClip);
  const pushHistory = useProjectStore((s) => s.pushHistory);

  function update(patch: Partial<TextClip>) {
    updateClip(clip.id, patch as Partial<typeof clip>);
  }

  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="text-sm text-neutral-200 truncate font-medium">{clip.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">Text clip</p>
      </div>

      {/* Content */}
      <div>
        <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Content</label>
        <textarea
          value={clip.content}
          rows={3}
          onChange={(e) => update({ content: e.target.value })}
          onBlur={pushHistory}
          className="w-full bg-neutral-800 text-xs text-neutral-200 px-2 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Font family */}
      <div>
        <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Font</label>
        <select
          value={clip.fontFamily}
          onChange={(e) => { update({ fontFamily: e.target.value }); pushHistory(); }}
          className="w-full bg-neutral-800 text-xs text-neutral-200 px-2 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500"
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Font size + weight */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Size</label>
          <input
            type="number" min={8} max={300} step={1}
            value={clip.fontSize}
            onChange={(e) => update({ fontSize: parseInt(e.target.value) || 24 })}
            onBlur={pushHistory}
            className="w-full bg-neutral-800 text-xs text-neutral-200 px-2 py-1 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Weight</label>
          <select
            value={clip.fontWeight}
            onChange={(e) => { update({ fontWeight: parseInt(e.target.value) }); pushHistory(); }}
            className="w-full bg-neutral-800 text-xs text-neutral-200 px-2 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500"
          >
            {[300, 400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {/* Style */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Style</label>
          <select
            value={clip.fontStyle}
            onChange={(e) => { update({ fontStyle: e.target.value as TextClip['fontStyle'] }); pushHistory(); }}
            className="w-full bg-neutral-800 text-xs text-neutral-200 px-2 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Align</label>
          <div className="flex gap-1">
            {ALIGNS.map((a) => (
              <button key={a}
                onClick={() => { update({ textAlign: a }); pushHistory(); }}
                className={`flex-1 py-1 text-xs rounded border transition-colors ${
                  clip.textAlign === a
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {a[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Color</label>
          <input type="color" value={clip.color}
            onChange={(e) => update({ color: e.target.value })}
            onBlur={pushHistory}
            className="w-full h-7 rounded border border-neutral-700 bg-neutral-800 cursor-pointer"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Background</label>
          <input type="color" value={clip.backgroundColor || '#00000000'}
            onChange={(e) => update({ backgroundColor: e.target.value })}
            onBlur={pushHistory}
            className="w-full h-7 rounded border border-neutral-700 bg-neutral-800 cursor-pointer"
          />
        </div>
      </div>

      <TransformControls clip={clip} />
    </div>
  );
}
