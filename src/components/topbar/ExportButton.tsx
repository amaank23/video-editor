'use client';

import { useEditorStore } from '@/stores/editorStore';

export default function ExportButton() {
  const setExportModalOpen = useEditorStore((s) => s.setExportModalOpen);
  const exportProgress = useEditorStore((s) => s.exportProgress);

  const isExporting = exportProgress !== null;

  return (
    <button
      onClick={() => setExportModalOpen(true)}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
    >
      {isExporting ? (
        <>
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" strokeOpacity={0.3} />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          {Math.round(exportProgress * 100)}%
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
          </svg>
          Export
        </>
      )}
    </button>
  );
}
