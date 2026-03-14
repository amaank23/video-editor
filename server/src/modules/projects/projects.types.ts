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

export interface UpdateProjectInput {
  name?: string;
  settings?: JsonValue;
}
