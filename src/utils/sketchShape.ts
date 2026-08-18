/**
 * Turns a freehand-drawn side profile (half-silhouette from the central
 * axis out to the rim, drawn with a finger/mouse) into a clean, precise
 * mold — reusing the same band-unwrap engine built for Tigela/Jarra
 * (see bowlShape.ts), just fed by hand-drawn points instead of a formula.
 */

import { BandGeometry, frustumBandGeometry } from './bowlShape';

export interface RawPoint {
  x: number;
  y: number;
}

export interface ProfilePoint {
  t: number; // 0 = base, 1 = rim (normalized height fraction)
  r: number; // 0-1, normalized radius fraction (relative to the sketch's own max radius)
}

// Classic Douglas-Peucker line simplification: keeps only the points needed
// to represent the stroke within `epsilon` pixels of tolerance, discarding
// the hand tremor in between. This is the "straighten" step — fewer points
// reads as straighter, cleaner lines, and each surviving segment becomes
// exactly one printed band later on.
export function simplifyPath(points: RawPoint[], epsilon: number): RawPoint[] {
  if (points.length < 3) return points;

  const perpendicularDistance = (p: RawPoint, a: RawPoint, b: RawPoint): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(p.x - projX, p.y - projY);
  };

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

// Converts a raw, simplified stroke (canvas pixel coords) into a normalized
// profile: t runs 0 (base) to 1 (rim), r runs 0 to 1 (relative to the
// sketch's own widest point). axisX is the pixel x-position of the drawn
// central axis guide; points are expected ordered base -> rim (bottom to top).
export function rawPointsToProfile(points: RawPoint[], axisX: number): ProfilePoint[] {
  if (points.length === 0) return [];
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const ySpan = Math.max(1, maxY - minY);

  const raw = points.map((p) => ({
    t: 1 - (p.y - minY) / ySpan, // base (largest y, bottom of canvas) = t 0
    rAbs: Math.max(0, p.x - axisX),
  }));

  const maxR = Math.max(...raw.map((p) => p.rAbs), 1);
  return raw.map((p) => ({ t: p.t, r: p.rAbs / maxR }));
}

// Piecewise-linear radius lookup at height-fraction t, given the (sorted,
// t-ascending) profile points.
export function sketchRadiusAt(t: number, points: ProfilePoint[]): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].r;
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= points[0].t) return points[0].r;
  if (clamped >= points[points.length - 1].t) return points[points.length - 1].r;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (clamped >= a.t && clamped <= b.t) {
      const span = b.t - a.t;
      const localT = span === 0 ? 0 : (clamped - a.t) / span;
      return a.r + (b.r - a.r) * localT;
    }
  }
  return points[points.length - 1].r;
}

export const SKETCH_PREVIEW_RINGS = 20;
export const SKETCH_BAND_GAP = 1.5; // cm of empty space between stacked bands in the printed layout

// One band per straightened segment: the whole point of simplifying the
// stroke down to N key vertices is that each surviving straight segment
// becomes exactly one physical piece to cut and glue.
export function computeSketchBands(
  profilePoints: ProfilePoint[],
  heightMold: number,
  maxRadiusMold: number,
  seam: number
): BandGeometry[] {
  if (profilePoints.length < 2) return [];
  const sorted = [...profilePoints].sort((a, b) => a.t - b.t);
  const bands: BandGeometry[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const tBottom = sorted[i].t;
    const tTop = sorted[i + 1].t;
    const rBottom = sorted[i].r * maxRadiusMold;
    const rTop = sorted[i + 1].r * maxRadiusMold;
    const bandHeight = Math.max(0.01, (tTop - tBottom) * heightMold);
    bands.push(frustumBandGeometry(i, rBottom, rTop, bandHeight, seam));
  }
  return bands;
}
