/**
 * Shared geometry for the Jarra/Vase shape: a wide "shoulder" partway up
 * the piece, necking in toward a narrower opening. Reuses the same
 * frustum-band unwrap technique as the Bowl shape (see bowlShape.ts) —
 * two profile segments (base→shoulder, shoulder→neck) instead of one.
 */

import { BandGeometry, frustumBandGeometry } from './bowlShape';

const easeT = (t: number, exponent: number) => Math.pow(Math.max(0, Math.min(1, t)), exponent);

// Radius at height-fraction t (0 = base, 1 = neck opening). Widens from the
// base to the shoulder (at shoulderT), then narrows from the shoulder to
// the neck. curvature 0 = straight-line segments (like a two-part Cone),
// curvature 100 = fully rounded belly.
export function vaseRadiusAt(
  t: number,
  rBase: number,
  rShoulder: number,
  rNeck: number,
  shoulderT: number,
  curvature: number
): number {
  const c = Math.max(0, Math.min(100, curvature)) / 100;
  const exponent = 1 - c * 0.7;
  const st = Math.max(0.05, Math.min(0.95, shoulderT));

  if (t <= st) {
    const localT = easeT(t / st, exponent);
    return rBase + (rShoulder - rBase) * localT;
  }
  const localT = easeT((t - st) / (1 - st), 1 / exponent);
  return rShoulder + (rNeck - rShoulder) * localT;
}

export const VASE_PATTERN_BANDS = 7; // one extra band vs. Bowl: the shoulder bend needs it
export const VASE_PREVIEW_RINGS = 22;
export const VASE_BAND_GAP = 1.5;

export function computeVaseBands(
  rBaseMold: number,
  rShoulderMold: number,
  rNeckMold: number,
  heightMold: number,
  shoulderT: number,
  curvature: number,
  seam: number,
  bandCount: number = VASE_PATTERN_BANDS
): BandGeometry[] {
  const bandHeight = heightMold / bandCount;
  const bands: BandGeometry[] = [];
  for (let i = 0; i < bandCount; i++) {
    const rB = vaseRadiusAt(i / bandCount, rBaseMold, rShoulderMold, rNeckMold, shoulderT, curvature);
    const rT = vaseRadiusAt((i + 1) / bandCount, rBaseMold, rShoulderMold, rNeckMold, shoulderT, curvature);
    bands.push(frustumBandGeometry(i, rB, rT, bandHeight, seam));
  }
  return bands;
}
