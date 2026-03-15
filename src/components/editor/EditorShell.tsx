"use client";

import { useEffect } from "react";
import TopBar from "@/components/topbar/TopBar";
import MediaPanel from "@/components/panels/MediaPanel/MediaPanel";
import CanvasPreview from "@/components/preview/CanvasPreview";
import PropertiesPanel from "@/components/panels/PropertiesPanel/PropertiesPanel";
import Timeline from "@/components/timeline/Timeline";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useProjectStore } from "@/stores/projectStore";
import { createProject } from "@/lib/api/projects";

export default function EditorShell() {
  useAutoSave();

  // On mount, register this project with the server so uploads have a valid projectId
  const projectName  = useProjectStore((s) => s.project.name);
  const setProjectId = useProjectStore((s) => s.setProjectId);

  useEffect(() => {
    createProject(projectName)
      .then((p) => setProjectId(p.id))
      .catch((err) => console.warn("[EditorShell] Could not register project on server:", err));
  // Run once on mount — projectName/setProjectId are stable references
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <ErrorBoundary label="Canvas">
            <CanvasPreview />
          </ErrorBoundary>
        </div>

        {/* Right: Properties Panel */}
        <div className="flex-none w-72 border-l border-neutral-700 flex flex-col overflow-hidden">
          <PropertiesPanel />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="flex-none h-64 border-t border-neutral-700">
        <ErrorBoundary label="Timeline">
          <Timeline />
        </ErrorBoundary>
      </div>
    </div>
  );
}
