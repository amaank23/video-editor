import { useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useMediaStore } from '@/stores/mediaStore';
import { uploadAsset, deleteAsset } from '@/lib/api/assets';

/**
 * Returns upload and delete handlers that keep mediaStore and projectStore
 * in sync with the server.
 */
export function useMediaUpload() {
  const projectId    = useProjectStore((s) => s.project.id);
  const addAsset     = useMediaStore((s) => s.addAsset);
  const removeAsset  = useMediaStore((s) => s.removeAsset);
  const addAssetRef  = useProjectStore((s) => s.addAssetRef);
  const removeAssetRef = useProjectStore((s) => s.removeAssetRef);
  const setProgress  = useMediaStore((s) => s.setUploadProgress);
  const clearProgress = useMediaStore((s) => s.clearUploadProgress);

  const upload = useCallback(async (files: File[]) => {
    await Promise.all(files.map(async (file) => {
      setProgress(file.name, 0);
      try {
        const asset = await uploadAsset(file, projectId, (p) => setProgress(file.name, p));
        addAsset(asset);
        addAssetRef(asset.id);
      } catch (err) {
        console.error('[useMediaUpload] Upload failed:', err);
      } finally {
        clearProgress(file.name);
      }
    }));
  }, [projectId, addAsset, addAssetRef, setProgress, clearProgress]);

  const remove = useCallback(async (assetId: string) => {
    try {
      await deleteAsset(assetId);
      removeAsset(assetId);
      removeAssetRef(assetId);
    } catch (err) {
      console.error('[useMediaUpload] Delete failed:', err);
    }
  }, [removeAsset, removeAssetRef]);

  return { upload, remove };
}
