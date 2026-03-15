'use client';

import type { Track } from '@shared/types/project';
import { useProjectStore } from '@/stores/projectStore';

interface TrackHeaderProps {
  track: Track;
  height: number;
}

export default function TrackHeader({ track, height }: TrackHeaderProps) {
  const updateTrack = useProjectStore((s) => s.updateTrack);

  return (
    <div
      className="flex items-center gap-1.5 px-2 border-b border-neutral-800 bg-neutral-850 select-none"
      style={{ height }}
    >
      <button
        className={`w-5 h-5 rounded text-xs font-mono flex items-center justify-center transition-colors ${
          track.muted
            ? 'bg-yellow-600 text-white'
            : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700'
        }`}
        title={track.muted ? 'Unmute' : 'Mute'}
        onClick={() => updateTrack(track.id, { muted: !track.muted })}
      >
        M
      </button>

      <button
        className={`w-5 h-5 rounded text-xs font-mono flex items-center justify-center transition-colors ${
          track.locked
            ? 'bg-red-800 text-white'
            : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700'
        }`}
        title={track.locked ? 'Unlock' : 'Lock'}
        onClick={() => updateTrack(track.id, { locked: !track.locked })}
      >
        L
      </button>

      <span className="text-xs text-neutral-300 truncate flex-1">{track.name}</span>
    </div>
  );
}
