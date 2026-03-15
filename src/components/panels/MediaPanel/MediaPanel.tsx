'use client';

import UploadZone from './UploadZone';
import MediaLibrary from './MediaLibrary';
import { useMediaUpload } from '@/hooks/useMediaUpload';

export default function MediaPanel() {
  const { upload, remove } = useMediaUpload();

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex-none px-3 py-2 border-b border-neutral-700">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Media</h2>
      </div>

      {/* Upload zone */}
      <UploadZone onFiles={upload} />

      {/* Library */}
      <MediaLibrary onDelete={remove} />
    </div>
  );
}
