"use client";

import TopBar from "@/components/topbar/TopBar";
import MediaPanel from "@/components/panels/MediaPanel/MediaPanel";
import CanvasPreview from "@/components/preview/CanvasPreview";
import PropertiesPanel from "@/components/panels/PropertiesPanel/PropertiesPanel";
import Timeline from "@/components/timeline/Timeline";

export default function EditorShell() {
  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-900 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex-none h-12 border-b border-neutral-700">
        <TopBar />
      </div>

      {/* Main workspace: three columns */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Media Panel */}
        <div className="flex-none w-64 border-r border-neutral-700 flex flex-col overflow-hidden">
          <MediaPanel />
        </div>

        {/* Center: Canvas Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 min-w-0">
          <CanvasPreview />
        </div>

        {/* Right: Properties Panel */}
        <div className="flex-none w-72 border-l border-neutral-700 flex flex-col overflow-hidden">
          <PropertiesPanel />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="flex-none h-64 border-t border-neutral-700">
        <Timeline />
      </div>
    </div>
  );
}
