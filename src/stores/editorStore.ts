import { create } from 'zustand';
import type { ClipId, TrackId } from '@shared/types/clips';

export type ActivePanel = 'media' | 'text' | 'effects' | 'audio';

export interface TimelineViewport {
  scrollLeftMs: number;  // leftmost visible time in ms
  zoomLevel: number;     // pixels per second e.g. 100
}

export interface PlaybackState {
  isPlaying: boolean;
  playheadMs: number;
  loopEnabled: boolean;
  inPointMs: number | null;
  outPointMs: number | null;
}

export interface SelectionState {
  clipIds: ClipId[];
  trackId: TrackId | null;
}

interface EditorState {
  // Playback
  playback: PlaybackState;

  // Selection
  selection: SelectionState;

  // Timeline viewport
  timelineViewport: TimelineViewport;

  // Panel state
  activePanel: ActivePanel;
  propertiesPanelOpen: boolean;

  // Export
  exportModalOpen: boolean;
  exportProgress: number | null;  // 0-1, null = not exporting

  // Auto-save status
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;

  // Actions
  setPlaying: (playing: boolean) => void;
  setPlayheadMs: (ms: number) => void;
  toggleLoop: () => void;
  setInPoint: (ms: number | null) => void;
  setOutPoint: (ms: number | null) => void;

  selectClip: (id: ClipId, additive?: boolean) => void;
  selectTrack: (id: TrackId | null) => void;
  clearSelection: () => void;

  setZoom: (level: number) => void;
  setScrollLeftMs: (ms: number) => void;

  setActivePanel: (panel: ActivePanel) => void;
  setPropertiesPanelOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setExportProgress: (progress: number | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  playback: {
    isPlaying: false,
    playheadMs: 0,
    loopEnabled: false,
    inPointMs: null,
    outPointMs: null,
  },

  selection: {
    clipIds: [],
    trackId: null,
  },

  timelineViewport: {
    scrollLeftMs: 0,
    zoomLevel: 100, // pixels per second
  },

  activePanel: 'media',
  propertiesPanelOpen: true,
  exportModalOpen: false,
  exportProgress: null,
  saveStatus: 'idle',

  setPlaying: (playing) =>
    set((s) => ({ playback: { ...s.playback, isPlaying: playing } })),

  setPlayheadMs: (ms) =>
    set((s) => ({ playback: { ...s.playback, playheadMs: Math.max(0, ms) } })),

  toggleLoop: () =>
    set((s) => ({ playback: { ...s.playback, loopEnabled: !s.playback.loopEnabled } })),

  setInPoint: (ms) =>
    set((s) => ({ playback: { ...s.playback, inPointMs: ms } })),

  setOutPoint: (ms) =>
    set((s) => ({ playback: { ...s.playback, outPointMs: ms } })),

  selectClip: (id, additive = false) =>
    set((s) => ({
      selection: {
        ...s.selection,
        clipIds: additive
          ? s.selection.clipIds.includes(id)
            ? s.selection.clipIds.filter((c) => c !== id)
            : [...s.selection.clipIds, id]
          : [id],
      },
    })),

  selectTrack: (id) =>
    set((s) => ({ selection: { ...s.selection, trackId: id } })),

  clearSelection: () =>
    set({ selection: { clipIds: [], trackId: null } }),

  setZoom: (level) =>
    set((s) => ({
      timelineViewport: {
        ...s.timelineViewport,
        zoomLevel: Math.max(10, Math.min(1000, level)),
      },
    })),

  setScrollLeftMs: (ms) =>
    set((s) => ({
      timelineViewport: {
        ...s.timelineViewport,
        scrollLeftMs: Math.max(0, ms),
      },
    })),

  setActivePanel: (panel) => set({ activePanel: panel }),
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),
  setExportModalOpen: (open) => set({ exportModalOpen: open }),
  setExportProgress: (progress) => set({ exportProgress: progress }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
