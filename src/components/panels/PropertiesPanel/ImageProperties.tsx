'use client';

import type { ImageClip } from '@shared/types/clips';
import TransformControls from './TransformControls';
import ColorCorrectionControls from './ColorCorrectionControls';

interface Props { clip: ImageClip }

export default function ImageProperties({ clip }: Props) {
  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="text-sm text-neutral-200 truncate font-medium">{clip.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">Image clip</p>
      </div>
      <ColorCorrectionControls clip={clip} />
      <TransformControls clip={clip} />
    </div>
  );
}
