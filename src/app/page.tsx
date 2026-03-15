'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listProjects, deleteProjectApi, type ProjectListItem } from '@/lib/api/projects';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  function handleOpen(id: string) {
    router.push(`/editor?id=${id}`);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteProjectApi(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  const res = (p: ProjectListItem) =>
    (p.settings as { width?: number; height?: number } | null) ?? {};

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
          <span className="font-semibold">Video Editor</span>
        </div>
        <button
          onClick={() => router.push('/editor')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
          New Project
        </button>
      </header>

      {/* Body */}
      <main className="px-8 py-8 max-w-5xl mx-auto">
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <h1 className="text-xl font-semibold mb-6">Projects</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-500">
            <svg className="w-16 h-16 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
            </svg>
            <p className="text-sm">No projects yet</p>
            <button
              onClick={() => router.push('/editor')}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => handleOpen(p.id)}
                className="group relative cursor-pointer rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-900/20"
              >
                {/* Thumbnail placeholder */}
                <div className="aspect-video bg-neutral-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-neutral-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium truncate text-neutral-100">{p.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {res(p).width ?? 1920}×{res(p).height ?? 1080}
                    {' · '}
                    {p._count.assets} asset{p._count.assets !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {new Date(p.updatedAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, p.id)}
                  disabled={deleting === p.id}
                  className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all"
                  title="Delete project"
                >
                  {deleting === p.id ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
