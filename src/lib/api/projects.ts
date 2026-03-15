const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ServerProject {
  id: string;
  name: string;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
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

export async function saveProject(
  id: string,
  patch: { name?: string; settings?: unknown },
): Promise<void> {
  const res = await fetch(`${API}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Save failed (${res.status})`);
  }
}
