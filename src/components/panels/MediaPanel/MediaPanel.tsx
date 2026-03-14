'use client';

import UploadZone from './UploadZone';
import MediaLibrary from './MediaLibrary';

export default function MediaPanel() {
  function handleFiles(files: File[]) {
    // Full upload implementation in Phase 4
    // For Phase 1: just log
    console.log('[MediaPanel] Files selected (upload in Phase 4):', files.map((f) => f.name));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex-none px-3 py-2 border-b border-neutral-700">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Media</h2>
      </div>

      {/* Upload zone */}
      <UploadZone onFiles={handleFiles} />

      {/* Library */}
      <MediaLibrary />
    </div>
  );
}
