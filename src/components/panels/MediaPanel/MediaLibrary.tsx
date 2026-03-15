'use client';

import { useMediaStore } from '@/stores/mediaStore';
import AssetCard from './AssetCard';

interface MediaLibraryProps {
  onDelete?: (assetId: string) => void;
}

export default function MediaLibrary({ onDelete }: MediaLibraryProps) {
  // Select raw objects by reference — Zustand only creates new references on mutation,
  // so these selectors are stable between renders and safe for useSyncExternalStore.
  // Object.values/entries are called during render, not inside getSnapshot.
  const assetsMap      = useMediaStore((s) => s.assets);
  const progressMap    = useMediaStore((s) => s.uploadProgress);
  const errorsMap      = useMediaStore((s) => s.uploadErrors);
  const clearError     = useMediaStore((s) => s.clearUploadError);

  const assets    = Object.values(assetsMap);
  const uploading = Object.entries(progressMap);
  const errors    = Object.entries(errorsMap);

  if (assets.length === 0 && uploading.length === 0 && errors.length === 0) {
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
      {uploading.map(([key, progress]) => {
        const label = key.split('-').slice(0, -2).join('-') || key;
        return (
          <div key={key} className="mb-2 px-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-400 truncate max-w-40">{label}</span>
              <span className="text-xs text-neutral-500">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-1 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Upload error banners */}
      {errors.map(([key, message]) => {
        const label = key.split('-').slice(0, -2).join('-') || key;
        return (
          <div key={key} className="mb-2 px-1 py-1.5 bg-red-950/40 border border-red-800/50 rounded flex items-start gap-2">
            <svg className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-400 truncate font-medium">{label}</p>
              <p className="text-xs text-red-500/80 truncate">{message}</p>
            </div>
            <button onClick={() => clearError(key)} className="text-red-500 hover:text-red-300 shrink-0">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        );
      })}

      {/* Asset grid */}
      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
