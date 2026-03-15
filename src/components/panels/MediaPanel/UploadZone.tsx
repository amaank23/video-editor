'use client';

import { useRef, useState } from 'react';

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
}

export default function UploadZone({ onFiles }: UploadZoneProps) {
  const inputRef    = useRef<HTMLInputElement>(null);
  // Counter instead of boolean — avoids "stuck highlight" when dragging over
  // child elements causes interleaved dragenter/dragleave pairs.
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  }

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`
        mx-3 mt-3 mb-2 rounded-lg border-2 border-dashed cursor-pointer
        flex flex-col items-center justify-center gap-2 py-5 px-3 text-center
        transition-colors select-none
        ${dragging
          ? 'border-indigo-400 bg-indigo-950/30 text-indigo-300'
          : 'border-neutral-600 hover:border-neutral-500 text-neutral-400 hover:text-neutral-300'
        }
      `}
    >
      <svg className="w-7 h-7 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-xs font-medium">Drop files here</p>
        <p className="text-xs opacity-60 mt-0.5">or click to browse</p>
      </div>
      <p className="text-xs opacity-40">Video · Audio · Images</p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
