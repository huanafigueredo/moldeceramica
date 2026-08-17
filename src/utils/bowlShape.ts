/**
 * Shared geometry for revolution shapes with a curved (non-straight) wall,
 * starting with the bowl. A curved wall can't be unwrapped into a single
 * flat cone sector like the straight-walled Cone shape, so we approximate
 * the curve as a stack of thin conical frustum "bands" — each band unwraps
 * with the exact same sector math the Cone shape already uses, just
 * repeated per band and printed as a stack of pattern pieces to glue.
 */

export interface BandGeometry {
  index: number;
  rBottom: number; // cm, mold-scale
  rTop: number; // cm, mold-scale
  bandHeight: number; // cm, mold-scale
  s: number; // slant height of this band
  isCylindrical: boolean; // true when rTop ≈ rBottom (degenerates to a flat rectangle)
  L_outer: number;
  L_inner: number;
  theta: number;
  theta_seam: number;
  total_theta: number;
  isTopLarger: boolean;
  bboxW: number;
  bboxH: number;
}

// Radius at height-fraction t (0 = base, 1 = rim), blending linear
// interpolation (curvature 0, same silhouette as the straight-walled Cone)
// with a fast-early-flare power curve (curvature 100, classic bowl profile
// that widens quickly near the base then rounds out toward the rim).
export function bowlRadiusAt(t: number, rBottom: number, rTop: number, curvature: number): number {
  const c = Math.max(0, Math.min(100, curvature)) / 100;
  const exponent = 1 - c * 0.82;
  const tt = Math.pow(Math.max(0, Math.min(1, t)), exponent);
  return rBottom + (rTop - rBottom) * tt;
}

function frustumBandGeometry(index: number, rBottom: number, rTop: number, bandHeight: number, seam: number): BandGeometry {
  if (Math.abs(rTop - rBottom) < 0.01) {
    const circ = Math.PI * (rTop + rBottom);
    return {
      index, rBottom, rTop, bandHeight, s: bandHeight, isCylindrical: true,
      L_outer: 0, L_inner: 0, theta: 0, theta_seam: 0, total_theta: 0, isTopLarger: false,
      bboxW: circ + seam, bboxH: bandHeight,
    };
  }

  const s = Math.sqrt(bandHeight * bandHeight + (rTop - rBottom) * (rTop - rBottom));
  const rMax = Math.max(rTop, rBottom);
  const rMin = Math.min(rTop, rBottom);
  const isTopLarger = rTop > rBottom;

  const L_outer = (s * rMax) / (rMax - rMin);
  const L_inner = L_outer - s;
  const theta = (2 * Math.PI * rMax) / L_outer;
  const theta_seam = seam / L_outer;
  const total_theta = theta + theta_seam;

  const bboxW = L_outer * 2 * Math.sin(total_theta / 2);
  const bboxH = L_outer - L_inner * Math.cos(total_theta / 2);

  return {
    index, rBottom, rTop, bandHeight, s, isCylindrical: false,
    L_outer, L_inner, theta, theta_seam, total_theta, isTopLarger,
    bboxW: Math.max(bboxW, 3), bboxH: Math.max(bboxH, 3),
  };
}

export const BOWL_PATTERN_BANDS = 6; // pieces to cut & glue for the printed template
export const BOWL_PREVIEW_RINGS = 18; // finer resolution used only for the smooth 3D preview
export const BOWL_BAND_GAP = 1.5; // cm of empty space between stacked bands in the printed layout

export function computeBowlBands(
  rBottomMold: number,
  rTopMold: number,
  heightMold: number,
  curvature: number,
  seam: number,
  bandCount: number = BOWL_PATTERN_BANDS
): BandGeometry[] {
  const bandHeight = heightMold / bandCount;
  const bands: BandGeometry[] = [];
  for (let i = 0; i < bandCount; i++) {
    const rB = bowlRadiusAt(i / bandCount, rBottomMold, rTopMold, curvature);
    const rT = bowlRadiusAt((i + 1) / bandCount, rBottomMold, rTopMold, curvature);
    bands.push(frustumBandGeometry(i, rB, rT, bandHeight, seam));
  }
  return bands;
}
