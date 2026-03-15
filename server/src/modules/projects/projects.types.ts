export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface CreateProjectInput {
  name: string;
  settings?: JsonValue;
}

export interface TrackInput {
  id: string;
  type: string;
  name: string;
  order: number;
  locked: boolean;
  muted: boolean;
  collapsed: boolean;
  clipIds: string[]; // clip ordering reference (not persisted separately)
}

export interface ClipInput {
  id: string;
  trackId: string;
  type: string;
  startTimeMs: number;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  transform: JsonValue;
  animations: JsonValue;
  name: string;
  locked: boolean;
  visible: boolean;
  // All remaining type-specific fields (assetId, volume, content, etc.)
  [key: string]: JsonValue | undefined;
}

export interface UpdateProjectInput {
  name?: string;
  settings?: JsonValue;
  tracks?: TrackInput[];
  clips?: Record<string, ClipInput>;
}
