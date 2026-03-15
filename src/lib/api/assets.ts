import type { MediaAsset } from '@shared/types/media';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type UploadProgressCallback = (progress: number) => void;

/**
 * Upload a single file as a media asset linked to a project.
 * Uses XHR so we get upload progress events (fetch doesn't support this).
 */
export function uploadAsset(
  file: File,
  projectId: string,
  onProgress?: UploadProgressCallback,
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd  = new FormData();
    fd.append('file', file);
    fd.append('projectId', projectId);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          // Server returns fileSizeBytes as a string (BigInt serialization)
          const asset: MediaAsset = {
            ...data,
            fileSizeBytes: Number(data.fileSizeBytes),
          };
          resolve(asset);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror   = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout   = 300_000; // 5 minutes
    xhr.open('POST', `${API}/api/assets/upload`);
    xhr.send(fd);
  });
}

export async function deleteAsset(id: string): Promise<void> {
  const res = await fetch(`${API}/api/assets/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Delete failed (${res.status})`);
  }
}
