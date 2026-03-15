import type { Track } from '@shared/types/project';
import type { Clip } from '@shared/types/clips';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ServerProject {
  id: string;
  name: string;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ServerProjectFull extends ServerProject {
  tracks: ServerTrack[];
  assets: ServerAsset[];
}

export interface ServerTrack {
  id: string;
  type: string;
  name: string;
  order: number;
  locked: boolean;
  muted: boolean;
  collapsed: boolean;
  clips: ServerClip[];
}

export interface ServerClip {
  id: string;
  trackId: string;
  type: string;
  startTimeMs: number;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  transform: unknown;
  animations: unknown;
  name: string;
  locked: boolean;
  visible: boolean;
  properties: unknown;
}

export interface ServerAsset {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  fileSizeBytes: string; // BigInt serialised as string
  serveUrl: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  thumbnails: string[];
  createdAt: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
  _count: { assets: number };
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function listProjects(): Promise<ProjectListItem[]> {
  const res = await fetch(`${API}/api/projects`);
  if (!res.ok) throw new Error(`Failed to list projects (${res.status})`);
  return res.json();
}

export async function createProject(name: string): Promise<ServerProject> {
  const res = await fetch(`${API}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create project (${res.status})`);
  return res.json();
}

export async function fetchProject(id: string): Promise<ServerProjectFull> {
  const res = await fetch(`${API}/api/projects/${id}`);
  if (!res.ok) throw new Error(`Failed to load project (${res.status})`);
  return res.json();
}

export async function saveProject(
  id: string,
  patch: {
    name?: string;
    settings?: unknown;
    tracks?: Track[];
    clips?: Record<string, Clip>;
  },
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Save failed (${res.status})`);
  }
}

export async function deleteProjectApi(id: string): Promise<void> {
  const res = await fetch(`${API}/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete project (${res.status})`);
}

// ── Export API ─────────────────────────────────────────────────────────────

export interface ExportJobStatus {
  jobId: string;
  projectId: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  outputUrl?: string;
  error?: string;
}

export async function startExportJob(
  projectId: string,
  opts: {
    format?: string;
    resolution?: string;
    fps?: number;
    quality?: number;
    includeAudio?: boolean;
    startTimeMs?: number;
    endTimeMs?: number;
  },
): Promise<ExportJobStatus> {
  const res = await fetch(`${API}/api/export/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`Export failed to start (${res.status})`);
  return res.json();
}

export async function pollExportJob(jobId: string): Promise<ExportJobStatus> {
  const res = await fetch(`${API}/api/export/status/${jobId}`);
  if (!res.ok) throw new Error(`Failed to poll export (${res.status})`);
  return res.json();
}

export function getExportDownloadUrl(jobId: string): string {
  return `${API}/api/export/download/${jobId}`;
}
