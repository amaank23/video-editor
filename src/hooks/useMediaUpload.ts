import { useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useMediaStore } from '@/stores/mediaStore';
import { uploadAsset, deleteAsset } from '@/lib/api/assets';

/**
 * Returns upload and delete handlers that keep mediaStore and projectStore
 * in sync with the server.
 */
export function useMediaUpload() {
  const projectId       = useProjectStore((s) => s.project.id);
  const addAsset        = useMediaStore((s) => s.addAsset);
  const removeAsset     = useMediaStore((s) => s.removeAsset);
  const addAssetRef     = useProjectStore((s) => s.addAssetRef);
  const removeAssetRef  = useProjectStore((s) => s.removeAssetRef);
  const setProgress     = useMediaStore((s) => s.setUploadProgress);
  const clearProgress   = useMediaStore((s) => s.clearUploadProgress);
  const setUploadError  = useMediaStore((s) => s.setUploadError);

  const upload = useCallback(async (files: File[]) => {
    await Promise.all(files.map(async (file) => {
      // Unique key per upload slot so duplicate filenames don't collide
      const uploadKey = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setProgress(uploadKey, 0);
      try {
        const asset = await uploadAsset(file, projectId, (p) => setProgress(uploadKey, p));
        addAsset(asset);
        addAssetRef(asset.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadError(uploadKey, message);
      } finally {
        clearProgress(uploadKey);
      }
    }));
  }, [projectId, addAsset, addAssetRef, setProgress, clearProgress, setUploadError]);

  const remove = useCallback(async (assetId: string) => {
    // Optimistic: remove from store immediately for instant UI response
    const snapshot = useMediaStore.getState().assets[assetId];
    removeAsset(assetId);
    removeAssetRef(assetId);

    try {
      await deleteAsset(assetId);
    } catch (err) {
      // Rollback on failure — restore the asset so it's not silently lost
      if (snapshot) addAsset(snapshot);
      addAssetRef(assetId);
      console.error('[useMediaUpload] Delete failed, asset restored:', err);
    }
  }, [addAsset, removeAsset, addAssetRef, removeAssetRef]);

  return { upload, remove };
}
