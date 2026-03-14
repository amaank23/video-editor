export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if a point is inside a rectangle
 */
export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  );
}

/**
 * Check if two rectangles intersect
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Convert normalized (0-1) canvas coords to pixel coords
 */
export function normalizedToPixel(
  nx: number,
  ny: number,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  return { x: nx * canvasWidth, y: ny * canvasHeight };
}
