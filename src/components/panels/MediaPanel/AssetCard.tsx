'use client';

import type { MediaAsset } from '@shared/types/media';
import { msToTimecode } from '@/lib/utils/time';

interface AssetCardProps {
  asset: MediaAsset;
  onDelete?: (id: string) => void;
}

const TYPE_ICONS = {
  video: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  audio: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  image: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
};

export default function AssetCard({ asset, onDelete }: AssetCardProps) {
  const thumbnail = asset.thumbnails[0];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-asset-id', asset.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="group relative rounded-md overflow-hidden bg-neutral-800 hover:bg-neutral-700 cursor-grab active:cursor-grabbing border border-neutral-700 hover:border-neutral-500 transition-colors"
      title={asset.name}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-neutral-900 flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-neutral-600">{TYPE_ICONS[asset.type]}</span>
        )}
      </div>

      {/* Info */}
      <div className="px-2 py-1.5">
        <p className="text-xs text-neutral-200 truncate leading-tight">{asset.name}</p>
        <div className="flex items-center gap-1 mt-0.5 text-neutral-500">
          <span className="text-neutral-500">{TYPE_ICONS[asset.type]}</span>
          {asset.durationMs != null && (
            <span className="text-xs">{msToTimecode(asset.durationMs)}</span>
          )}
        </div>
      </div>

      {/* Delete button (appears on hover) */}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
          className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete asset"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
