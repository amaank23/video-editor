'use client';

import { useMediaStore } from '@/stores/mediaStore';
import AssetCard from './AssetCard';

export default function MediaLibrary() {
  const assets = useMediaStore((s) => Object.values(s.assets));
  const removeAsset = useMediaStore((s) => s.removeAsset);
  const uploadProgress = useMediaStore((s) => s.uploadProgress);

  const uploading = Object.entries(uploadProgress);

  if (assets.length === 0 && uploading.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-600 px-4 text-center">
        <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-xs">No media yet</p>
        <p className="text-xs opacity-60">Upload files to get started</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-2">
      {/* Upload progress indicators */}
      {uploading.map(([filename, progress]) => (
        <div key={filename} className="mb-2 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-400 truncate max-w-40">{filename}</span>
            <span className="text-xs text-neutral-500">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      ))}

      {/* Asset grid */}
      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onDelete={removeAsset}
          />
        ))}
      </div>
    </div>
  );
}
