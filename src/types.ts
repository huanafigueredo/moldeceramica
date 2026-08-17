export type ShapeType = 'cylinder' | 'cone' | 'tray' | 'napkin_holder' | 'box' | 'organic_plate' | 'bowl' | 'vase';

export interface CylinderParams {
  desiredHeight: number; // in cm
  desiredDiameter: number; // in cm
  shrinkage: number; // C% (e.g. 12%)
  seamAllowance: number; // overlap in cm (e.g. 1.5cm)
  hasHoles: boolean;
  holeDiameter: number; // cm
  holeSpacing: number; // cm
  holeShape?: 'circle' | 'square' | 'flower' | 'star' | 'rectangle';
  edgeFinish?: 'straight' | 'scalloped' | 'wave';
  wallThickness?: number; // clay wall thickness (cm), used for the liquid capacity estimate
}

export interface ConeParams {
  topDiameter: number; // desired final top diameter (cm)
  bottomDiameter: number; // desired final bottom diameter (cm)
  height: number; // desired vertical height (cm)
  shrinkage: number; // C%
  seamAllowance: number; // overlap (cm)
  wallThickness?: number; // clay wall thickness (cm), used for the liquid capacity estimate
}

export interface TrayParams {
  length: number; // desired final flat length (cm)
  width: number; // desired final flat width (cm)
  lipHeight: number; // desired lip height (cm)
  lipAngle: number; // angle in degrees, e.g. 45
  shrinkage: number; // C%
}

export interface NapkinHolderParams {
  width: number; // desired outer width (cm)
  height: number; // desired outer height (cm)
  depth: number; // desired outer depth (cm)
  shrinkage: number; // C%
  thickness: number; // clay plate thickness in cm (useful for 45 deg chamfer & inner bounds)
  edgeFinish?: 'straight' | 'rounded' | 'scalloped';
}

export interface BoxParams {
  width: number; // desired outer width (cm)
  height: number; // desired outer height (cm)
  depth: number; // desired outer depth (cm)
  shrinkage: number; // C%
  thickness: number; // clay plate thickness in cm
  seamAllowance: number; // overlap/margin in cm
  hasLid: boolean; // whether to include a top lid in the 2D net pattern
}

export interface OrganicPlateParams {
  baseRadius: number; // average radius of the base footprint (cm)
  irregularity: number; // 0-100, how asymmetric/organic the outline is
  seed: number; // random seed driving the outline shape (used when customPoints is unset)
  customPoints?: { x: number; y: number }[]; // hand-edited control points (fired/desired scale, cm); overrides seed generation when present
  hasLip: boolean; // false = flat plate, no raised rim
  lipHeight: number; // desired lip height (cm), ignored when hasLip is false
  lipAngle: number; // angle in degrees, e.g. 40
  shrinkage: number; // C%
}

export interface BowlParams {
  topDiameter: number; // desired rim diameter (cm)
  bottomDiameter: number; // desired base diameter (cm)
  height: number; // desired height (cm)
  curvature: number; // 0-100: 0 = straight wall (like Cone), 100 = full rounded bowl profile
  shrinkage: number; // C%
  seamAllowance: number; // overlap per printed band (cm)
  wallThickness?: number; // clay wall thickness (cm), used for the liquid capacity estimate
}

export interface VaseParams {
  baseDiameter: number; // diameter at the foot (cm)
  shoulderDiameter: number; // widest point of the vase's belly (cm)
  neckDiameter: number; // diameter at the opening (cm)
  height: number; // desired height (cm)
  shoulderPosition: number; // 0-100: how far up the height the widest point sits
  curvature: number; // 0-100: 0 = straight segments, 100 = fully rounded belly
  shrinkage: number; // C%
  seamAllowance: number; // overlap per printed band (cm)
  wallThickness?: number; // clay wall thickness (cm), used for the liquid capacity estimate
}

export interface SavedMold {
  id: string;
  name: string;
  shapeType: ShapeType;
  params: CylinderParams | ConeParams | TrayParams | NapkinHolderParams | BoxParams | OrganicPlateParams | BowlParams | VaseParams;
  createdAt: string;
}
