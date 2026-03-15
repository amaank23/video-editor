import os from 'os';
import { prisma } from '../../lib/prisma';
import { probeFile, extractThumbnails } from '../../shared/ffmpeg';
import { getServeUrl, deleteFile } from '../../shared/storage';
import type { AssetType, CreateAssetInput, AssetResponse } from './assets.types';

function resolveAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'image';
}

export async function createAsset({ projectId, file }: CreateAssetInput): Promise<AssetResponse> {
  const assetType = resolveAssetType(file.mimetype);

  let probeResult = null;
  if (assetType !== 'image') {
    probeResult = await probeFile(file.path);
  }

  let thumbnails: string[] = [];
  if (assetType === 'video') {
    try {
      thumbnails = await extractThumbnails(file.path, 20, os.tmpdir());
    } catch {
      console.warn('Thumbnail extraction failed for', file.filename);
    }
  }

  try {
    const asset = await prisma.asset.create({
      data: {
        projectId,
        name: file.originalname,
        type: assetType,
        mimeType: file.mimetype,
        filePath: file.path,
        serveUrl: getServeUrl(file.filename),
        fileSizeBytes: BigInt(file.size),
        durationMs: probeResult?.durationMs ?? null,
        width: probeResult?.width ?? null,
        height: probeResult?.height ?? null,
        fps: probeResult?.fps ?? null,
        thumbnails,
      },
    });

    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      mimeType: asset.mimeType,
      fileSizeBytes: asset.fileSizeBytes.toString(),
      serveUrl: asset.serveUrl,
      durationMs: asset.durationMs,
      width: asset.width,
      height: asset.height,
      fps: asset.fps,
      thumbnails: asset.thumbnails as string[],
      createdAt: asset.createdAt.getTime(),
    };
  } catch (err) {
    // Clean up the uploaded file so it doesn't orphan on disk
    deleteFile(file.path);
    throw err;
  }
}

export async function findAssetById(id: string) {
  return prisma.asset.findUnique({ where: { id } });
}

export async function removeAsset(id: string): Promise<void> {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return;
  deleteFile(asset.filePath);
  await prisma.asset.delete({ where: { id } });
}
