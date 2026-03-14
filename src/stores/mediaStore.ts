import { create } from 'zustand';
import type { MediaAsset } from '@shared/types/media';
import type { AssetId } from '@shared/types/clips';

interface MediaState {
  assets: Record<AssetId, MediaAsset>;
  uploadProgress: Record<string, number>; // filename → 0-1
  isLoading: boolean;

  // Actions
  setAssets: (assets: MediaAsset[]) => void;
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (id: AssetId) => void;
  setUploadProgress: (filename: string, progress: number) => void;
  clearUploadProgress: (filename: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  assets: {},
  uploadProgress: {},
  isLoading: false,

  setAssets: (assets) =>
    set({
      assets: Object.fromEntries(assets.map((a) => [a.id, a])),
    }),

  addAsset: (asset) =>
    set((s) => ({ assets: { ...s.assets, [asset.id]: asset } })),

  removeAsset: (id) =>
    set((s) => {
      const assets = { ...s.assets };
      delete assets[id];
      return { assets };
    }),

  setUploadProgress: (filename, progress) =>
    set((s) => ({ uploadProgress: { ...s.uploadProgress, [filename]: progress } })),

  clearUploadProgress: (filename) =>
    set((s) => {
      const uploadProgress = { ...s.uploadProgress };
      delete uploadProgress[filename];
      return { uploadProgress };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
