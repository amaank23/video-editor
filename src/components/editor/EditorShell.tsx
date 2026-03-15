"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopBar from "@/components/topbar/TopBar";
import MediaPanel from "@/components/panels/MediaPanel/MediaPanel";
import CanvasPreview from "@/components/preview/CanvasPreview";
import PropertiesPanel from "@/components/panels/PropertiesPanel/PropertiesPanel";
import Timeline from "@/components/timeline/Timeline";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ExportModal from "@/components/export/ExportModal";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useProjectStore } from "@/stores/projectStore";
import { useMediaStore } from "@/stores/mediaStore";
import { createProject, fetchProject } from "@/lib/api/projects";
import { serverProjectToStoreProject } from "@/lib/utils/projectMapper";

function EditorUI() {
  useAutoSave();

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-900 text-white overflow-hidden">
      <div className="flex-none h-12 border-b border-neutral-700">
        <TopBar />
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-none w-64 border-r border-neutral-700 flex flex-col overflow-hidden">
          <MediaPanel />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 min-w-0">
          <ErrorBoundary label="Canvas">
            <CanvasPreview />
          </ErrorBoundary>
        </div>

        <div className="flex-none w-72 border-l border-neutral-700 flex flex-col overflow-hidden">
          <PropertiesPanel />
        </div>
      </div>

      <div className="flex-none h-64 border-t border-neutral-700">
        <ErrorBoundary label="Timeline">
          <Timeline />
        </ErrorBoundary>
      </div>

      <ExportModal />
    </div>
  );
}

function EditorShellInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const existingId   = searchParams.get("id");

  const [initError, setInitError] = useState<string | null>(null);
  const [ready, setReady]         = useState(false);

  const projectName       = useProjectStore((s) => s.project.name);
  const setProjectId      = useProjectStore((s) => s.setProjectId);
  const setServerRegistered = useProjectStore((s) => s.setServerRegistered);
  const restoreProject    = useProjectStore((s) => s.restoreProject);
  const addAsset          = useMediaStore((s) => s.addAsset);
  const addAssetRef       = useProjectStore((s) => s.addAssetRef);

  useEffect(() => {
    if (existingId) {
      // Load an existing project from the server
      fetchProject(existingId)
        .then((sp) => {
          const { project, assets } = serverProjectToStoreProject(sp);
          restoreProject(project);
          for (const asset of assets) {
            addAsset(asset);
            addAssetRef(asset.id);
          }
          setReady(true);
        })
        .catch((err: unknown) => {
          setInitError(err instanceof Error ? err.message : "Failed to load project");
        });
    } else {
      // Create a brand-new project
      createProject(projectName)
        .then((p) => {
          setProjectId(p.id);
          setServerRegistered();
          router.replace(`/editor?id=${p.id}`);
          setReady(true);
        })
        .catch((err: unknown) => {
          setInitError(err instanceof Error ? err.message : "Unknown error");
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center flex-col gap-3 bg-neutral-900 text-neutral-400">
        <svg className="w-10 h-10 text-red-500 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
        </svg>
        <p className="text-red-400 text-sm font-medium">Failed to connect to server</p>
        <p className="text-xs text-neutral-500 max-w-xs text-center">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900 text-neutral-500 text-sm">
        {existingId ? "Loading project…" : "Initializing project…"}
      </div>
    );
  }

  return <EditorUI />;
}

// useSearchParams requires a Suspense boundary
export default function EditorShell() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900 text-neutral-500 text-sm">
        Loading…
      </div>
    }>
      <EditorShellInner />
    </Suspense>
  );
}
