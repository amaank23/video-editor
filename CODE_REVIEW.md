# Code Review Report — Video Editor
**Date:** 2026-03-15
**Reviewer:** Code Review Agent
**Phases reviewed:** Phase 1 (Setup + Backend) and Phase 2 (Timeline Engine + Interactivity)

---

## Executive Summary

The codebase is well-structured for its stage: the shared type system is thorough, the Zustand store design is clean and correctly immutable, and the backend module layout (routes → controller → service) is a solid pattern. The main risk areas are (1) a debug "Seed" button left in the production UI shell, (2) the clip-dragging system reading a stale closure over `zoomLevel` at drag-end time which will produce incorrect moves at non-default zoom levels, (3) the error handler leaking internal error messages verbatim to clients, and (4) no authentication or rate limiting on any backend endpoint, including the 2 GB file upload route.

---

## Issues by File

### [High] `src/components/editor/EditorShell.tsx` — Debug "Seed" button left in production UI
**Severity:** High
**Category:** Bug / Maintainability
**Description:** A bare `<button>Seed</button>` element that programmatically adds tracks and hard-coded clips is rendered directly inside the editor layout with no guard. It is visible to every user and will create duplicate, orphaned tracks if clicked more than once.
**Suggested fix:** Remove the button entirely. Replace with a proper "Add Track" action or a `useEffect` that seeds test data only when `process.env.NODE_ENV === 'development'` and the URL contains a `?seed=1` query param.

---

### [High] `src/components/timeline/ClipBlock.tsx` — Stale `zoomLevel` captured at drag-end produces wrong clip positions
**Severity:** High
**Category:** Bug
**Description:** `onPointerUp` reads `zoomLevel` from its render-time closure to convert the final CSS `transform: translateX()` back to milliseconds. If the user Ctrl+scrolls while a drag is in flight, `zoomLevel` in the closure differs from the value used in `onPointerMove`. Clips will be committed to the wrong time position silently.
**Suggested fix:** Capture `zoomLevel` in `dragRef` at `onPointerDown` time and use `dragRef.current.zoomLevel` in both `onPointerMove` and `onPointerUp`.
```typescript
dragRef.current = { startX: e.clientX, origStartMsMap, dragIds, zoomLevel };
```

---

### [High] `src/components/timeline/ClipBlock.tsx` — Locked tracks are not respected during drag
**Severity:** High
**Category:** Bug
**Description:** The `track.locked` flag is togglable via `TrackHeader` but `ClipBlock` performs no check before initiating a drag.
**Suggested fix:** In `onPointerDown`, read the clip's track from the store and return early if `track.locked`.

---

### [High] `server/src/middleware/errorHandler.ts` — Internal error messages exposed to clients
**Severity:** High
**Category:** Security
**Description:** The global error handler returns `err.message` verbatim. Prisma errors, FFmpeg errors, and filesystem errors can reveal table names, file paths, or SQL fragments. The status code is always 500 regardless of error type.
**Suggested fix:** Return safe generic messages for 5xx cases; log full errors server-side. Handle Multer's `LIMIT_FILE_SIZE` as 413.

---

### [High] `server/src/modules/assets/assets.service.ts` — File left on disk if DB write fails
**Severity:** High
**Category:** Bug / Error Handling
**Description:** In `createAsset`, the file is saved to disk by Multer before the function runs. If `prisma.asset.create` throws, the uploaded file remains on disk permanently.
**Suggested fix:** Wrap the Prisma call in try/catch and call `deleteFile(file.path)` in the catch before re-throwing.

---

### [High] `server/src/modules/assets/assets.controller.ts` — No validation that `projectId` references a real project
**Severity:** High
**Category:** Bug
**Description:** `uploadAsset` checks that `projectId` is present but does not verify it corresponds to an existing project record. The subsequent `prisma.asset.create` will throw a foreign-key violation surfaced as a leaky 500.
**Suggested fix:** Check that the project exists before calling `createAsset`; return 404 if not.

---

### [Medium] `src/components/timeline/ClipTrimHandle.tsx` — `trimEndMs` can exceed source asset duration
**Severity:** Medium
**Category:** Bug
**Description:** When trimming the right edge, `trimEndMs` is computed with no upper-bound clamp against the source asset's actual duration.
**Suggested fix:** Clamp `trimEndMs` to the source asset's duration (stored on the clip or looked up from `mediaStore`).

---

### [Medium] `src/stores/projectStore.ts` — `splitClip` reads stale project state outside `set()`
**Severity:** Medium
**Category:** Bug
**Description:** `splitClip` calls `get()` to read the current project at the top of the function, then calls `set()` later. This creates a TOCTOU window if another store action fires in between. All other store actions correctly do computation inside the `set()` callback.
**Suggested fix:** Move all `splitClip` computation inside the `set()` callback using the guaranteed-fresh state parameter.

---

### [Medium] `src/components/timeline/Timeline.tsx` — `onWheel` may silently fail to call `preventDefault()`
**Severity:** Medium
**Category:** Performance
**Description:** React 19 attaches wheel listeners as passive by default. Calling `e.preventDefault()` inside a passive listener is silently ignored, breaking Ctrl+scroll zoom in some browsers.
**Suggested fix:** Attach the wheel listener manually via `useEffect` with `{ passive: false }`.

---

### [Medium] `src/components/timeline/ClipBlock.tsx` — DOM query approach for multi-clip dragging is fragile
**Severity:** Medium
**Category:** Architecture / Maintainability
**Description:** `setTransformOnClips` uses `document.querySelector('[data-clip-id="..."]')` to imperatively transform other clips. If a clip is virtualised off-screen it silently fails, and the pattern is untestable.
**Suggested fix:** Long-term, move dragging offset into a ref or transient store slice each `ClipBlock` reads from directly.

---

### [Medium] `src/components/timeline/Timeline.tsx` — Ruler tick count is unbounded at very low zoom
**Severity:** Medium
**Category:** Performance
**Description:** The tick generation loop has no upper-bound guard. At minimum zoom with a long project, hundreds of React elements can be created per wheel event.
**Suggested fix:** Add `if (ticks.length > 200) break;` inside the tick loop.

---

### [Medium] `server/src/shared/ffmpeg.ts` — Thumbnail extraction spawns N concurrent FFmpeg processes
**Severity:** Medium
**Category:** Performance
**Description:** `extractThumbnails` uses `Promise.all` over 20 individual FFmpeg processes simultaneously. On limited CPU this saturates the process pool and blocks other requests.
**Suggested fix:** Use a single FFmpeg command with multiple output frames, or apply a concurrency limiter (`p-limit`).

---

### [Medium] `server/src/index.ts` — CORS `origin` is a single hard-coded value
**Severity:** Medium
**Category:** Security / Architecture
**Description:** `cors({ origin: CLIENT_URL })` blocks staging/preview environments with multiple frontend URLs.
**Suggested fix:** Parse `CLIENT_URL` as a comma-separated list or use a function-based origin validator.

---

### [Medium] `src/components/panels/MediaPanel/AssetCard.tsx` — Unvalidated server-supplied URL in `img src`
**Severity:** Medium
**Category:** Security
**Description:** `asset.thumbnails[0]` is rendered directly as `<img src>` without validating it is a safe JPEG data URI.
**Suggested fix:** Validate that thumbnail strings start with `data:image/jpeg;base64,` before rendering.

---

### [Low] `src/stores/projectStore.ts` — `updateClip` does not push undo history
**Severity:** Low
**Category:** Maintainability
**Description:** `updateClip` is intentionally history-free for live trim preview, but any future property-panel edits that call it without a paired `pushHistory()` will be silently un-undoable.
**Suggested fix:** Document this contract with a JSDoc comment above `updateClip`, or add an optional `{ skipHistory?: boolean }` flag.

---

### [Low] `src/components/timeline/ClipBlock.tsx` — Clip culling uses hard-coded pixel magic numbers
**Severity:** Low
**Category:** Maintainability
**Description:** `if (left + width < -200 || left > 4000) return null;` does not adapt to container width.
**Suggested fix:** Derive cull bounds from the container's measured width (ResizeObserver).

---

### [Low] `server/src/modules/projects/projects.service.ts` — `updateProject` does not handle P2025 gracefully
**Severity:** Low
**Category:** Error Handling
**Description:** If the project ID does not exist, Prisma throws `P2025` which surfaces as a 500 with a Prisma error message.
**Suggested fix:** Catch `P2025` and return a typed 404.

---

### [Low] `server/src/shared/storage.ts` — `cleanOldExports` uses synchronous fs calls on the main thread
**Severity:** Low
**Category:** Performance
**Description:** `fs.readdirSync`, `fs.statSync`, and `fs.unlinkSync` block the event loop.
**Suggested fix:** Replace with `fs.promises.*` equivalents.

---

### [Low] Duplicate export type definitions across `shared/types/export.ts` and `server/src/modules/export/export.types.ts`
**Severity:** Low
**Category:** Maintainability
**Description:** `ExportFormat`, `ExportResolution`, and job status interfaces are defined in both places and will diverge.
**Suggested fix:** Import and re-export the shared types in the server module rather than redefining them.

---

### [Low] `src/components/timeline/Playhead.tsx` — `scrollLeftMs` prop declared but never used
**Severity:** Low
**Category:** Maintainability
**Description:** `scrollLeftMs` is declared in `PlayheadProps` and passed from `Timeline.tsx` but never referenced inside the component.
**Suggested fix:** Remove the unused prop from both the interface and the call site.

---

### [Low] `src/app/globals.css` — `bg-neutral-850` defined as a plain CSS class instead of a Tailwind v4 theme colour
**Severity:** Low
**Category:** Maintainability
**Description:** Not registered via `@theme {}`, so it won't compose with Tailwind variants and won't be purged correctly.
**Suggested fix:** Register as `--color-neutral-850: #1c1c1c;` inside an `@theme {}` block.

---

## Architecture Observations

- **Strong state normalisation.** Storing clips in a flat `Record<ClipId, Clip>` map with ordered `clipIds` on tracks is the correct approach for O(1) lookups. Consistency is maintained well across all store mutations.

- **No auto-save hook yet.** The backend has a fully functional `PUT /api/projects/:id` route, but the frontend never calls it. The project is lost on every page refresh. An auto-save hook is a prerequisite for reliable Phase 3 testing.

- **Frontend/backend model mismatch.** The frontend uses a flat `clips: Record<ClipId, Clip>` map; the database uses relational `Track → Clip[]`. There is no serialisation layer yet — this must be built before any project load/save flow can work.

- **Transient UI state is correctly separated from persistent project state.** Playback, zoom, scroll, and selection live in `editorStore`; the document model lives in `projectStore`. This will make it straightforward to persist only `projectStore`.

- **No authentication on any route.** Every API endpoint — including 2 GB file upload, project deletion, and asset deletion — is openly accessible to any process that can reach port 4000.

---

## Production Readiness Checklist

- [ ] **Error boundaries** — No React `ErrorBoundary` wraps the editor shell, timeline, or canvas. An uncaught render error will white-screen the entire app.
- [ ] **Input validation** — Backend request bodies are cast directly without schema validation (no Zod/Joi).
- [x] **File upload MIME type filter** — Multer `fileFilter` checks MIME type against an allowlist.
- [ ] **File upload size error handling** — Multer's size error surfaces as 500 instead of 413.
- [ ] **CORS config** — Single-origin only; no support for multiple preview/staging URLs.
- [ ] **Authentication / Authorization** — No auth on any backend route.
- [ ] **Rate limiting** — No rate limiting on upload or project creation endpoints.
- [x] **Structured logging** — Basic `console.error` logging present; sufficient for development.
- [x] **Environment config** — `dotenv` used; all key vars are configurable via `.env`.
- [ ] **Database connection error handling** — Prisma startup errors are not caught; the server crashes silently if the DB is unreachable.
- [ ] **Tests** — Zero unit or integration tests across frontend and backend.
- [ ] **`.env.example`** — Required env vars are not documented for new contributors.

---

## Phase 3 Prerequisites (fix before Canvas Rendering & Playback)

1. **Remove the Seed button** from `EditorShell.tsx` — it will create ghost tracks on every click during playback testing.
2. **Fix stale `zoomLevel` in `ClipBlock` `onPointerUp`** — once the playback engine drives zoom, every drag will silently place clips at wrong positions.
3. **Add `{ passive: false }` wheel listener in `Timeline.tsx`** — Ctrl+scroll zoom may break silently in production browsers.
4. **Implement an auto-save hook** — without it, every hot-reload during Phase 3 development loses the timeline state under test.
5. **Add a serialisation layer** between the frontend flat-map format and the backend relational format before the canvas renderer loads a real project.
6. **Add `ErrorBoundary`** around `<CanvasPreview>` and `<Timeline>` so canvas errors don't white-screen the whole editor.
