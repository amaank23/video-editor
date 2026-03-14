export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-neutral-400">Loading editor…</p>
      </div>
    </div>
  );
}
