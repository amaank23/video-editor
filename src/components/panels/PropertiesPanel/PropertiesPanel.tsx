'use client';

import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import VideoProperties from './VideoProperties';
import AudioProperties from './AudioProperties';
import ImageProperties from './ImageProperties';
import TextProperties  from './TextProperties';
import type { VideoClip, AudioClip, ImageClip, TextClip } from '@shared/types/clips';

export default function PropertiesPanel() {
  const selectedClipIds = useEditorStore((s) => s.selection.clipIds);
  const clips = useProjectStore((s) => s.project.clips);

  const selectedClip = selectedClipIds.length === 1 ? clips[selectedClipIds[0]] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex-none px-3 py-2 border-b border-neutral-700">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedClip ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-600 px-4 text-center">
            <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            <p className="text-xs">Select a clip to edit its properties</p>
          </div>
        ) : selectedClip.type === 'video' ? (
          <VideoProperties clip={selectedClip as VideoClip} />
        ) : selectedClip.type === 'audio' ? (
          <AudioProperties clip={selectedClip as AudioClip} />
        ) : selectedClip.type === 'image' ? (
          <ImageProperties clip={selectedClip as ImageClip} />
        ) : selectedClip.type === 'text' ? (
          <TextProperties clip={selectedClip as TextClip} />
        ) : null}
      </div>
    </div>
  );
}
