/**
 * Shared geometry helpers for the "Prato Orgânico" mold: a closed, freeform
 * (non-round, non-rectangular) flat outline with a flared lip around it.
 *
 * Kept in one place because the cone's planification math taught us the hard
 * way that duplicating the same geometry across SVG/Canvas/3D renderers lets
 * them silently drift apart. Every renderer should compute through
 * `computeOrganicOutline` instead of re-deriving points on its own.
 */

export interface OrganicPoint {
  x: number;
  y: number;
}

// Uniformly scales a set of points (e.g. custom control points authored at
// fired/desired size) up to mold/wet size by the same 1/shrinkFactor every
// other dimension on the shape already uses.
export function scalePoints(points: OrganicPoint[], factor: number): OrganicPoint[] {
  return points.map((p) => ({ x: p.x * factor, y: p.y * factor }));
}

// Deterministic seeded RNG (mulberry32) so a given seed always reproduces the
// exact same outline — needed so the mold doesn't reshuffle on every render.
function mulberry32(seed: number) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// N control points around a circle of baseRadius, each perturbed radially by
// up to +/-45% at irregularity=100, smoothly connected afterwards.
export function generateOrganicControlPoints(
  seed: number,
  irregularity: number,
  baseRadius: number,
  numPoints: number = 9
): OrganicPoint[] {
  const rand = mulberry32(seed);
  const amplitude = Math.max(0, Math.min(100, irregularity)) / 100 * 0.45;
  const points: OrganicPoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusMultiplier = 1 + (rand() * 2 - 1) * amplitude;
    const r = baseRadius * radiusMultiplier;
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return points;
}

// Catmull-Rom closed spline: turns N control points into a smooth closed polyline.
export function sampleClosedSpline(points: OrganicPoint[], samplesPerSegment: number = 20): OrganicPoint[] {
  const n = points.length;
  if (n < 3) return points.slice();
  const get = (i: number) => points[((i % n) + n) % n];
  const result: OrganicPoint[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t, t3 = t2 * t;
      const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      result.push({ x, y });
    }
  }
  return result;
}

// Offsets a closed polyline outward (away from its centroid) by `distance`,
// using each point's local tangent to estimate the outward normal.
export function offsetClosedPolyline(points: OrganicPoint[], distance: number): OrganicPoint[] {
  const n = points.length;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len;
    let ny = tx / len;
    // Flip the normal if it points toward the centroid instead of away from it.
    if (nx * p.x + ny * p.y < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x: p.x + nx * distance, y: p.y + ny * distance };
  });
}

export function polygonArea(points: OrganicPoint[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

export function polygonPerimeter(points: OrganicPoint[]): number {
  let perimeter = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    perimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  return perimeter;
}

export interface OrganicOutlineResult {
  innerPoints: OrganicPoint[];
  outerPoints: OrganicPoint[];
  rimFlat: number;
  bboxMinX: number;
  bboxMaxX: number;
  bboxMinY: number;
  bboxMaxY: number;
  bboxW: number;
  bboxH: number;
  baseArea: number;
  basePerimeter: number;
}

// One-stop computation: control points -> smooth base outline -> offset rim
// outline -> bounding box + area/perimeter, all in the same local coordinate
// space (centered roughly on the shape's centroid).
//
// Pass `customControlPoints` (from the manual point editor) to use those
// instead of the seed-generated ones; otherwise falls back to the random
// generator. Both paths share every downstream calculation, so "auto" and
// "manual" shapes behave identically once the base outline is decided.
export function computeOrganicOutline(
  baseRadius: number,
  irregularity: number,
  seed: number,
  lipHeight: number,
  lipAngleDeg: number,
  numControlPoints: number = 9,
  samplesPerSegment: number = 20,
  customControlPoints?: OrganicPoint[]
): OrganicOutlineResult {
  const controlPoints = customControlPoints && customControlPoints.length >= 3
    ? customControlPoints
    : generateOrganicControlPoints(seed, irregularity, baseRadius, numControlPoints);
  const innerPoints = sampleClosedSpline(controlPoints, samplesPerSegment);
  const angleRad = (lipAngleDeg * Math.PI) / 180;
  const rimFlat = lipHeight / Math.sin(angleRad);
  const outerPoints = offsetClosedPolyline(innerPoints, rimFlat);

  let bboxMinX = Infinity, bboxMaxX = -Infinity, bboxMinY = Infinity, bboxMaxY = -Infinity;
  for (const p of outerPoints) {
    if (p.x < bboxMinX) bboxMinX = p.x;
    if (p.x > bboxMaxX) bboxMaxX = p.x;
    if (p.y < bboxMinY) bboxMinY = p.y;
    if (p.y > bboxMaxY) bboxMaxY = p.y;
  }

  return {
    innerPoints,
    outerPoints,
    rimFlat,
    bboxMinX,
    bboxMaxX,
    bboxMinY,
    bboxMaxY,
    bboxW: bboxMaxX - bboxMinX,
    bboxH: bboxMaxY - bboxMinY,
    baseArea: polygonArea(innerPoints),
    basePerimeter: polygonPerimeter(innerPoints),
  };
}

// Builds an SVG/Canvas-ready path string from a closed set of points, with an
// optional offset (px) and vertical flip, since callers work in different
// coordinate systems (SVG y-down vs plain cm space).
export function pointsToPathD(points: OrganicPoint[], offsetX: number = 0, offsetY: number = 0): string {
  if (points.length === 0) return '';
  let d = `M ${(points[0].x + offsetX).toFixed(2)} ${(points[0].y + offsetY).toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${(points[i].x + offsetX).toFixed(2)} ${(points[i].y + offsetY).toFixed(2)}`;
  }
  d += ' Z';
  return d;
}
