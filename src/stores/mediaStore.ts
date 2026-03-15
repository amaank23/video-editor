import { create } from 'zustand';
import type { MediaAsset } from '@shared/types/media';
import type { AssetId } from '@shared/types/clips';

interface MediaState {
  assets: Record<AssetId, MediaAsset>;
  uploadProgress: Record<string, number>; // uploadKey → 0-1
  uploadErrors: Record<string, string>;   // uploadKey → error message
  isLoading: boolean;

  // Actions
  setAssets: (assets: MediaAsset[]) => void;
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (id: AssetId) => void;
  setUploadProgress: (key: string, progress: number) => void;
  clearUploadProgress: (key: string) => void;
  setUploadError: (key: string, message: string) => void;
  clearUploadError: (key: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  assets: {},
  uploadProgress: {},
  uploadErrors: {},
  isLoading: false,

  setAssets: (assets) =>
    set({ assets: Object.fromEntries(assets.map((a) => [a.id, a])) }),

  addAsset: (asset) =>
    set((s) => ({ assets: { ...s.assets, [asset.id]: asset } })),

  removeAsset: (id) =>
    set((s) => {
      const assets = { ...s.assets };
      delete assets[id];
      return { assets };
    }),

  setUploadProgress: (key, progress) =>
    set((s) => ({ uploadProgress: { ...s.uploadProgress, [key]: progress } })),

  clearUploadProgress: (key) =>
    set((s) => {
      const uploadProgress = { ...s.uploadProgress };
      delete uploadProgress[key];
      return { uploadProgress };
    }),

  setUploadError: (key, message) =>
    set((s) => ({ uploadErrors: { ...s.uploadErrors, [key]: message } })),

  clearUploadError: (key) =>
    set((s) => {
      const uploadErrors = { ...s.uploadErrors };
      delete uploadErrors[key];
      return { uploadErrors };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
