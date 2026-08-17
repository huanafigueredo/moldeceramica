/**
 * Liquid capacity estimate for hollow revolution shapes (mugs, cups, vases).
 * All inputs are the piece's FINISHED (fired) dimensions in cm; 1 cm3 = 1 mL.
 */

import { bowlRadiusAt } from './bowlShape';

const ML_PER_OZ = 29.5735;
// How far below the rim a piece is realistically filled to before it risks
// spilling when carried/tilted (a fixed pour margin, not user-configurable).
const POUR_MARGIN_CM = 1.25;

export interface CapacityEstimate {
  brimFullMl: number;
  practicalMl: number;
}

// Exact frustum-of-cone volume; degenerates to a plain cylinder when the two
// radii are equal, so cylinder and cone capacity share this one formula.
const frustumVolume = (rBottom: number, rTop: number, height: number): number => {
  if (height <= 0) return 0;
  return (Math.PI * height / 3) * (rBottom * rBottom + rBottom * rTop + rTop * rTop);
};

const estimateFromRadii = (rBottom: number, rTop: number, innerHeight: number): CapacityEstimate => {
  if (innerHeight <= 0) return { brimFullMl: 0, practicalMl: 0 };

  const practicalHeight = Math.max(0, innerHeight - POUR_MARGIN_CM);
  const rAtPracticalHeight = rBottom + (rTop - rBottom) * (practicalHeight / innerHeight);

  return {
    brimFullMl: frustumVolume(rBottom, rTop, innerHeight),
    practicalMl: frustumVolume(rBottom, rAtPracticalHeight, practicalHeight),
  };
};

export function computeCylinderCapacity(
  desiredDiameter: number,
  desiredHeight: number,
  wallThickness: number
): CapacityEstimate {
  const innerRadius = Math.max(0, desiredDiameter / 2 - wallThickness);
  const innerHeight = Math.max(0, desiredHeight - wallThickness); // base thickness eats into interior height
  return estimateFromRadii(innerRadius, innerRadius, innerHeight);
}

export function computeConeCapacity(
  topDiameter: number,
  bottomDiameter: number,
  height: number,
  wallThickness: number
): CapacityEstimate {
  const innerTopR = Math.max(0, topDiameter / 2 - wallThickness);
  const innerBottomR = Math.max(0, bottomDiameter / 2 - wallThickness);
  const innerHeight = Math.max(0, height - wallThickness);
  return estimateFromRadii(innerBottomR, innerTopR, innerHeight);
}

export function computeBowlCapacity(
  topDiameter: number,
  bottomDiameter: number,
  height: number,
  curvature: number,
  wallThickness: number
): CapacityEstimate {
  const innerHeight = Math.max(0, height - wallThickness);
  if (innerHeight <= 0) return { brimFullMl: 0, practicalMl: 0 };

  const practicalHeight = Math.max(0, innerHeight - POUR_MARGIN_CM);
  const slices = 60; // fine enough to approximate the curved wall well

  const innerRadiusAt = (h: number) => {
    // h is measured from the base, over the piece's full (wall-inclusive) height
    const t = Math.min(1, h / height);
    const outerR = bowlRadiusAt(t, bottomDiameter / 2, topDiameter / 2, curvature);
    return Math.max(0, outerR - wallThickness);
  };

  const integrate = (upToHeight: number): number => {
    let volume = 0;
    const step = upToHeight / slices;
    for (let i = 0; i < slices; i++) {
      const rBottom = innerRadiusAt(i * step);
      const rTop = innerRadiusAt((i + 1) * step);
      volume += frustumVolume(rBottom, rTop, step);
    }
    return volume;
  };

  return {
    brimFullMl: integrate(innerHeight),
    practicalMl: integrate(practicalHeight),
  };
}

export const mlToOz = (ml: number): number => ml / ML_PER_OZ;
