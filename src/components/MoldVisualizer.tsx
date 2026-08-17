import React, { useRef, useState, useEffect } from 'react';
import { ShapeType, CylinderParams, ConeParams, TrayParams, NapkinHolderParams, BoxParams, OrganicPlateParams, BowlParams, VaseParams } from '../types';
import { Download, Printer, Layers, Sliders, Check, Settings, Scissors, Sparkles, HelpCircle } from 'lucide-react';
import Interactive3DPreview from './Interactive3DPreview';
import Pattern2DCanvas from './Pattern2DCanvas';
import { computeOrganicOutline, pointsToPathD, scalePoints } from '../utils/organicShape';
import { computeBowlBands, BOWL_BAND_GAP } from '../utils/bowlShape';
import { computeVaseBands, VASE_BAND_GAP } from '../utils/vaseShape';

// Shared handle-strip sizing for Cylinder/Cone mugs: derives the flat strip
// piece's dimensions and how much extra bbox space it needs below the main
// pattern, so the same numbers stay consistent across the SVG/canvas/3D views.
function getHandleData(
  p: { hasHandle?: boolean; handleWidth?: number; handleProjection?: number; handleSpanPercent?: number },
  h_mold: number,
  shrinkFactor: number
) {
  if (!p.hasHandle) {
    return { hasHandle: false, handleWidth_mold: 0, handleProjection_mold: 0, handleSpan_mold: 0, handleStripLength_mold: 0, handleGap: 0, extraH: 0 };
  }
  const handleWidth_mold = (p.handleWidth ?? 2.2) / shrinkFactor;
  const handleProjection_mold = (p.handleProjection ?? 5) / shrinkFactor;
  const handleSpan_mold = h_mold * ((p.handleSpanPercent ?? 55) / 100);
  const handleStripLength_mold = handleSpan_mold + 2 * handleProjection_mold;
  const handleGap = 1.5;
  return {
    hasHandle: true,
    handleWidth_mold,
    handleProjection_mold,
    handleSpan_mold,
    handleStripLength_mold,
    handleGap,
    extraH: handleWidth_mold + handleGap,
  };
}

// Flat handle-strap template piece, drawn below the main Cylinder/Cone
// pattern in the print SVG.
function HandleStripSVG({ scale, data, bodyBboxH, showDimensions }: { scale: number; data: any; bodyBboxH: number; showDimensions: boolean }) {
  if (!data.hasHandle) return null;
  const stripY = (bodyBboxH + data.handleGap) * scale;
  const stripW = data.handleStripLength_mold * scale;
  const stripH = data.handleWidth_mold * scale;
  return (
    <g>
      <rect x={0} y={stripY} width={stripW} height={stripH} rx={stripH / 2.2} className="stroke-[#2c4cdb] stroke-[1.5] fill-[#5a72e4]/[0.04]" />
      {showDimensions && (
        <text x={0} y={stripY + stripH + 14} className="fill-[#374151] font-sans text-[9px] font-bold" textAnchor="start">
          Alça (tira solta): {data.handleStripLength_mold.toFixed(1)} x {data.handleWidth_mold.toFixed(1)} cm
        </text>
      )}
    </g>
  );
}

// Horizontal dashed guides on the flat, rectangular Cylinder pattern marking
// the two heights where the handle should be attached.
function HandleAttachGuidesSVG({ scale, data, wPx }: { scale: number; data: any; wPx: number }) {
  if (!data.hasHandle) return null;
  const marginY = ((data.h_mold - data.handleSpan_mold) / 2) * scale;
  const yTop = marginY;
  const yBottom = data.h_mold * scale - marginY;
  return (
    <g className="stroke-[#c2410c] stroke-[1] stroke-dasharray-[5,3]">
      <line x1={0} y1={yTop} x2={wPx} y2={yTop} />
      <line x1={0} y1={yBottom} x2={wPx} y2={yBottom} />
      <text x={4} y={yTop - 3} className="fill-[#c2410c] font-mono text-[8px] font-bold" stroke="none">Fixação da alça (topo)</text>
      <text x={4} y={yBottom - 3} className="fill-[#c2410c] font-mono text-[8px] font-bold" stroke="none">Fixação da alça (base)</text>
    </g>
  );
}

interface MoldVisualizerProps {
  shapeType: ShapeType;
  params: CylinderParams | ConeParams | TrayParams | NapkinHolderParams | BoxParams | OrganicPlateParams | BowlParams | VaseParams;
  onPrintRequest: (svgString: string, boundingBox: { width: number; height: number }) => void;
  onChangeParams?: (newParams: any) => void;
}

export default function MoldVisualizer({ shapeType, params, onPrintRequest, onChangeParams }: MoldVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, padding: 40 });
  const [showSeam, setShowSeam] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | '2d_canvas' | '2d_svg'>('2d_canvas');

  // Drag State for interactive handles
  interface DragState {
    handle: string;
    startX: number;
    startY: number;
    startParams: any;
  }
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Math helper: pixels per cm (at standard 96 DPI, 1 inch = 2.54cm, so 96/2.54 = 37.795 px/cm)
  const pxPerCm = 37.795;

  // Compute mold dimensions based on shape type
  const getCalculatedData = () => {
    const C = params.shrinkage;
    const shrinkFactor = 1 - C / 100;

    if (shapeType === 'cylinder') {
      const p = params as CylinderParams;
      const h_mold = p.desiredHeight / shrinkFactor;
      const d_mold = p.desiredDiameter / shrinkFactor;
      const circ_mold = Math.PI * d_mold;
      const seam = showSeam ? p.seamAllowance : 0;
      const total_w = circ_mold + seam;
      const handle = getHandleData(p, h_mold, shrinkFactor);

      return {
        type: 'cylinder',
        h_mold,
        d_mold,
        circ_mold,
        seam,
        total_w,
        ...handle,
        // For drawing, bounding box in cm (body only — the handle strip
        // extends the viewport via viewBboxW/H, but must not inflate the
        // body outline itself, which is drawn directly from bboxW/bboxH)
        bboxW: total_w,
        bboxH: h_mold,
        viewBboxW: Math.max(total_w, handle.handleStripLength_mold),
        viewBboxH: h_mold + handle.extraH,
      };
    } else if (shapeType === 'cone') {
      const p = params as ConeParams;
      const dt_mold = p.topDiameter / shrinkFactor;
      const db_mold = p.bottomDiameter / shrinkFactor;
      const h_mold = p.height / shrinkFactor;
      const seam = showSeam ? p.seamAllowance : 0;

      const rt = dt_mold / 2;
      const rb = db_mold / 2;

      // Handle pure cylinder inside cone input to avoid division by zero
      if (Math.abs(rt - rb) < 0.001) {
        const circ = Math.PI * dt_mold;
        const total_w = circ + seam;
        const handleCyl = getHandleData(p, h_mold, shrinkFactor);
        return {
          type: 'cone_cylindrical',
          h_mold,
          d_mold: dt_mold,
          circ,
          seam,
          total_w,
          ...handleCyl,
          bboxW: total_w,
          bboxH: h_mold,
          viewBboxW: Math.max(total_w, handleCyl.handleStripLength_mold),
          viewBboxH: h_mold + handleCyl.extraH,
        };
      }

      const s = Math.sqrt(h_mold * h_mold + (rt - rb) * (rt - rb));
      const rMax = Math.max(rt, rb);
      const rMin = Math.min(rt, rb);
      const isTopLarger = rt > rb;

      const L_outer = (s * rMax) / (rMax - rMin);
      const L_inner = L_outer - s;

      // Angle of sector in radians
      const theta = (2 * Math.PI * rMax) / L_outer;

      // Seam allowance on cone: we add angular width representing the overlap
      // Overlap width = seam (cm). At L_outer, this corresponds to an angle = seam / L_outer (radians)
      const theta_seam = seam / L_outer;
      const total_theta = theta + theta_seam;

      // Bounding box calculation for SVG scaling
      // We will draw the sector pointing down or up. Let's center the apex at (0, 0)
      // The angles will span from -total_theta/2 to total_theta/2
      const xMin = -L_outer;
      const xMax = L_outer;
      const yMin = 0; // Apex is at top (0,0)
      const yMax = L_outer;

      const bboxW = L_outer * 2 * Math.sin(total_theta / 2);
      const bboxH = L_outer - L_inner * Math.cos(total_theta / 2);
      const handleCone = getHandleData(p, h_mold, shrinkFactor);

      return {
        type: 'cone',
        dt_mold,
        db_mold,
        h_mold,
        s,
        L_outer,
        L_inner,
        theta,
        theta_seam,
        total_theta,
        isTopLarger,
        seam,
        ...handleCone,
        bboxW: Math.max(bboxW, 10),
        bboxH: Math.max(bboxH, 10),
        viewBboxW: Math.max(bboxW, 10, handleCone.handleStripLength_mold),
        viewBboxH: Math.max(bboxH, 10) + (handleCone.hasHandle ? handleCone.extraH + 2.5 : 0),
      };
    } else if (shapeType === 'tray') {
      const p = params as TrayParams;
      const l_mold = p.length / shrinkFactor;
      const w_mold = p.width / shrinkFactor;
      const h_lip = p.lipHeight / shrinkFactor;
      const angleRad = (p.lipAngle * Math.PI) / 180;

      // Width of the rim on flat plane (lip height along the surface)
      const rim_flat = h_lip / Math.sin(angleRad);
      // Project of rim extension outwards (notching guide)
      const rim_ext = h_lip / Math.tan(angleRad);

      const total_w = w_mold + 2 * rim_flat;
      const total_l = l_mold + 2 * rim_flat;

      return {
        type: 'tray',
        l_mold,
        w_mold,
        h_lip,
        rim_flat,
        rim_ext,
        total_w,
        total_l,
        bboxW: total_l,
        bboxH: total_w,
      };
    } else if (shapeType === 'napkin_holder') {
      const p = params as NapkinHolderParams;
      const w_mold = p.width / shrinkFactor;
      const h_mold = p.height / shrinkFactor;
      const d_mold = p.depth / shrinkFactor;
      const thick_mold = p.thickness / shrinkFactor;

      // We have: 2 Side plates (w_mold x h_mold) and 1 Base plate (w_mold x d_mold)
      // Let's lay them out in a grid:
      // Side 1 (w_mold x h_mold), space of 2cm, Base (w_mold x d_mold), space of 2cm, Side 2 (w_mold x h_mold)
      const spacing = 2; // cm
      const total_w = w_mold;
      const total_h = h_mold * 2 + d_mold + spacing * 2;

      return {
        type: 'napkin_holder',
        w_mold,
        h_mold,
        d_mold,
        thick_mold,
        spacing,
        bboxW: total_w,
        bboxH: total_h,
      };
    } else if (shapeType === 'box') {
      const p = params as BoxParams;
      const w_mold = p.width / shrinkFactor;
      const h_mold = p.height / shrinkFactor;
      const d_mold = p.depth / shrinkFactor;
      const thick_mold = p.thickness / shrinkFactor;
      const seam = showSeam ? p.seamAllowance : 0;
      const hasLid = p.hasLid || false;

      // Cross layout:
      // Width: h_mold + w_mold + h_mold
      // Height: (hasLid ? d_mold : 0) + h_mold + d_mold + h_mold
      const total_w = w_mold + 2 * h_mold;
      const total_h = d_mold + 2 * h_mold + (hasLid ? d_mold : 0);

      return {
        type: 'box',
        w_mold,
        h_mold,
        d_mold,
        thick_mold,
        seam,
        hasLid,
        bboxW: total_w,
        bboxH: total_h,
      };
    } else if (shapeType === 'bowl') {
      const p = params as BowlParams;
      const rt_mold = p.topDiameter / 2 / shrinkFactor;
      const rb_mold = p.bottomDiameter / 2 / shrinkFactor;
      const h_mold = p.height / shrinkFactor;
      const seam = showSeam ? p.seamAllowance : 0;

      const bands = computeBowlBands(rb_mold, rt_mold, h_mold, p.curvature, seam);
      const bboxW = Math.max(...bands.map((b) => b.bboxW));
      const bboxH = bands.reduce((sum, b) => sum + b.bboxH, 0) + BOWL_BAND_GAP * (bands.length - 1);

      return {
        type: 'bowl',
        bands,
        h_mold,
        rt_mold,
        rb_mold,
        dt_mold: rt_mold * 2,
        db_mold: rb_mold * 2,
        seam,
        bboxW,
        bboxH,
      };
    } else if (shapeType === 'vase') {
      const p = params as VaseParams;
      const rBase_mold = p.baseDiameter / 2 / shrinkFactor;
      const rShoulder_mold = p.shoulderDiameter / 2 / shrinkFactor;
      const rNeck_mold = p.neckDiameter / 2 / shrinkFactor;
      const h_mold = p.height / shrinkFactor;
      const seam = showSeam ? p.seamAllowance : 0;
      const shoulderT = p.shoulderPosition / 100;

      const bands = computeVaseBands(rBase_mold, rShoulder_mold, rNeck_mold, h_mold, shoulderT, p.curvature, seam);
      const bboxW = Math.max(...bands.map((b) => b.bboxW));
      const bboxH = bands.reduce((sum, b) => sum + b.bboxH, 0) + VASE_BAND_GAP * (bands.length - 1);

      return {
        type: 'vase',
        bands,
        h_mold,
        rBase_mold,
        rShoulder_mold,
        rNeck_mold,
        d_base_mold: rBase_mold * 2,
        d_shoulder_mold: rShoulder_mold * 2,
        d_neck_mold: rNeck_mold * 2,
        seam,
        bboxW,
        bboxH,
      };
    } else {
      // organic_plate
      const p = params as OrganicPlateParams;
      const baseRadius_mold = p.baseRadius / shrinkFactor;
      const hasLip = p.hasLip !== false;
      const lipHeight_mold = (hasLip ? p.lipHeight : 0) / shrinkFactor;
      const customPoints_mold = p.customPoints ? scalePoints(p.customPoints, 1 / shrinkFactor) : undefined;
      const outline = computeOrganicOutline(baseRadius_mold, p.irregularity, p.seed, lipHeight_mold, p.lipAngle, 9, 20, customPoints_mold);

      return {
        type: 'organic_plate',
        ...outline,
        hasLip,
        lipHeight_mold,
        bboxW: outline.bboxW,
        bboxH: outline.bboxH,
      };
    }
  };

  const data = getCalculatedData();

  // Dynamic scale & padding variables for drag coordinate calculation
  const scale = pxPerCm;
  const pad = 40;
  const w_px = ((data as any).viewBboxW ?? data.bboxW) * scale;
  const h_px = ((data as any).viewBboxH ?? data.bboxH) * scale;
  const vbW = w_px + pad * 2;
  const vbH = h_px + pad * 2;

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!svgRef.current || !onChangeParams) return;
      const rect = svgRef.current.getBoundingClientRect();
      
      // Calculate scale ratio between screen element and SVG coordinate system
      const scaleX = vbW / rect.width;
      const scaleY = vbH / rect.height;
      
      const deltaX_px = (e.clientX - dragState.startX) * scaleX;
      const deltaY_px = (e.clientY - dragState.startY) * scaleY;
      
      const deltaX_cm = deltaX_px / scale;
      const deltaY_cm = deltaY_px / scale;
      
      const C = params.shrinkage;
      const shrinkFactor = 1 - C / 100;
      const updated = { ...dragState.startParams };
      
      if (dragState.handle === 'cylinderWidth') {
        // Horizontal drag to change desiredDiameter
        const start_circ_mold = Math.PI * (dragState.startParams.desiredDiameter / shrinkFactor);
        const new_circ_mold = Math.max(3, start_circ_mold + deltaX_cm);
        updated.desiredDiameter = Math.round(((new_circ_mold / Math.PI) * shrinkFactor) * 10) / 10;
      }
      else if (dragState.handle === 'cylinderHeight') {
        // Vertical drag to change desiredHeight
        const start_h_mold = dragState.startParams.desiredHeight / shrinkFactor;
        const new_h_mold = Math.max(3, start_h_mold + deltaY_cm);
        updated.desiredHeight = Math.round((new_h_mold * shrinkFactor) * 10) / 10;
      }
      else if (dragState.handle === 'coneTopDia') {
        // Horizontal drag to change topDiameter
        const start_val = dragState.startParams.topDiameter;
        const new_val = Math.max(dragState.startParams.bottomDiameter + 1, start_val + deltaX_cm * shrinkFactor);
        updated.topDiameter = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'coneBotDia') {
        // Horizontal drag to change bottomDiameter
        const start_val = dragState.startParams.bottomDiameter;
        const new_val = Math.max(1, Math.min(dragState.startParams.topDiameter - 1, start_val + deltaX_cm * shrinkFactor));
        updated.bottomDiameter = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'coneHeight') {
        // Vertical drag to change height
        const start_val = dragState.startParams.height;
        const new_val = Math.max(2, start_val + deltaY_cm * shrinkFactor);
        updated.height = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'trayLength') {
        const start_val = dragState.startParams.length;
        const new_val = Math.max(4, start_val + deltaX_cm * shrinkFactor);
        updated.length = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'trayWidth') {
        const start_val = dragState.startParams.width;
        const new_val = Math.max(4, start_val + deltaY_cm * shrinkFactor);
        updated.width = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'trayLipHeight') {
        const start_val = dragState.startParams.lipHeight;
        const new_val = Math.max(1, start_val - deltaY_cm * shrinkFactor); // drag upwards to increase lip height
        updated.lipHeight = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'napkinWidth') {
        const start_val = dragState.startParams.width;
        const new_val = Math.max(4, start_val + deltaX_cm * shrinkFactor);
        updated.width = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'napkinHeight') {
        const start_val = dragState.startParams.height;
        const new_val = Math.max(3, start_val - deltaY_cm * shrinkFactor); // drag upwards to increase height
        updated.height = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'napkinDepth') {
        const start_val = dragState.startParams.depth;
        const new_val = Math.max(2, start_val + deltaY_cm * shrinkFactor);
        updated.depth = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'boxWidth') {
        const start_val = dragState.startParams.width;
        const new_val = Math.max(4, start_val + deltaX_cm * shrinkFactor);
        updated.width = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'boxHeight') {
        const start_val = dragState.startParams.height;
        const new_val = Math.max(3, start_val - deltaY_cm * shrinkFactor); // drag upwards to increase height
        updated.height = Math.round(new_val * 10) / 10;
      }
      else if (dragState.handle === 'boxDepth') {
        const start_val = dragState.startParams.depth;
        const new_val = Math.max(4, start_val + deltaY_cm * shrinkFactor);
        updated.depth = Math.round(new_val * 10) / 10;
      }
      
      onChangeParams(updated);
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, params, onChangeParams, vbW, vbH, scale]);

  // Handle Export SVG File
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceramold-${shapeType}-${new Date().getTime()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!svgRef.current) return;
    // Bounding box in cm
    const bbox = {
      width: data.bboxW,
      height: data.bboxH,
    };
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    onPrintRequest(svgString, bbox);
  };

  // Generate SVG Path & Elements based on current shape
  const renderSVGElements = () => {
    // Canvas sizing
    const scale = pxPerCm; // 1cm = 37.795px
    const pad = 40; // px padding

    // Sizing of actual viewport based on bounding box (widened to include
    // the handle strip below the body, when present)
    const w_px = ((data as any).viewBboxW ?? data.bboxW) * scale;
    const h_px = ((data as any).viewBboxH ?? data.bboxH) * scale;

    // Center coordinates for rendering
    const centerX = w_px / 2 + pad;
    const centerY = h_px / 2 + pad;

    // ViewBox values
    const vbW = w_px + pad * 2;
    const vbH = h_px + pad * 2;

    const lineStyle = "stroke-[#2c4cdb] stroke-[1.5] fill-none";
    const dashStyle = "stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[4,4] fill-none";
    const textStyle = "fill-[#17171a] font-sans text-xs select-none";
    const dimLineStyle = "stroke-gray-400 stroke-[1] marker-end-[url(#arrow)] marker-start-[url(#arrow)] fill-none";
    const dimTextStyle = "fill-gray-500 font-mono text-[10px] text-center";

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${vbH}`}
        width="100%"
        height="100%"
        className="w-full h-full bg-[#fafaf9]/50 rounded-xl border border-terracotta-100/50"
      >
        <defs>
          {/* Arrow marker for dimension lines */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#9ca3af" />
          </marker>
          {/* Subtle grid pattern */}
          <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#2c4cdb" strokeWidth="0.5" strokeOpacity="0.08" />
            {/* Subdivisions of 1mm */}
            <path d={`M ${scale/2} 0 L ${scale/2} ${scale} M 0 ${scale/2} L ${scale} ${scale/2}`} fill="none" stroke="#2c4cdb" strokeWidth="0.25" strokeOpacity="0.04" />
          </pattern>
        </defs>

        {/* Grid Background */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Dynamic Scale Indicator (5cm bar) in corner */}
        <g transform={`translate(${pad}, ${vbH - pad + 15})`} className="no-print">
          <line x1="0" y1="0" x2={5 * scale} y2="0" stroke="#17171a" strokeWidth="2" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#17171a" strokeWidth="2" />
          <line x1={5 * scale} y1="-3" x2={5 * scale} y2="3" stroke="#17171a" strokeWidth="2" />
          <text x={2.5 * scale} y="-6" className={`${textStyle} text-[9px] font-mono`} textAnchor="middle">
            Escala Real: 5 cm
          </text>
        </g>

        {shapeType === 'cylinder' && (
          <g transform={`translate(${pad}, ${pad})`}>
            {/* Main outline of the flat mold - can be straight, scalloped, or wave */}
            {(() => {
              const p = params as CylinderParams;
              const w_mold_px = data.bboxW * scale;
              const h_mold_px = data.bboxH * scale;
              const seam_px = p.seamAllowance * scale;
              const w_active_px = w_mold_px - seam_px;
              
              const edge = p.edgeFinish || 'straight';
              let pathD = "";
              
              if (edge === 'straight') {
                pathD = `M 0 ${h_mold_px} L 0 0 L ${w_mold_px} 0 L ${w_mold_px} ${h_mold_px} Z`;
              } else if (edge === 'scalloped') {
                const scallop_w = 4; // cm
                const n = Math.max(2, Math.round((data.bboxW - p.seamAllowance) / scallop_w));
                const scallop_w_px = w_active_px / n;
                const scallop_h_px = Math.min(18, scallop_w_px / 2.5);
                
                pathD = `M 0 ${h_mold_px} L 0 ${scallop_h_px}`;
                for (let i = 0; i < n; i++) {
                  const x1 = i * scallop_w_px;
                  const x2 = (i + 1) * scallop_w_px;
                  const x_mid = x1 + scallop_w_px / 2;
                  pathD += ` Q ${x_mid} 0 ${x2} ${scallop_h_px}`;
                }
                if (seam_px > 0) {
                  pathD += ` L ${w_mold_px} ${scallop_h_px}`;
                }
                pathD += ` L ${w_mold_px} ${h_mold_px} Z`;
              } else if (edge === 'wave') {
                const wave_amplitude = 12; // px
                const wave_offset = 15; // px
                pathD = `M 0 ${h_mold_px} L 0 ${wave_offset}`;
                
                const cycles = Math.max(1, Math.round(data.bboxW / 6));
                for (let x = 0; x <= w_active_px; x += 4) {
                  const y = wave_offset - wave_amplitude * Math.sin((x / w_active_px) * cycles * 2 * Math.PI);
                  pathD += ` L ${x} ${y}`;
                }
                if (seam_px > 0) {
                  pathD += ` L ${w_mold_px} ${wave_offset}`;
                }
                pathD += ` L ${w_mold_px} ${h_mold_px} Z`;
              }
              
              return (
                <path d={pathD} className={lineStyle} />
              );
            })()}

            {/* Seam Allowance Overlay */}
            {showSeam && (params as CylinderParams).seamAllowance > 0 && (
              <g>
                {/* Visual hatch representing seam */}
                {(() => {
                  const p = params as CylinderParams;
                  const w_mold_px = data.bboxW * scale;
                  const h_mold_px = data.bboxH * scale;
                  const seam_px = p.seamAllowance * scale;
                  const w_active_px = w_mold_px - seam_px;
                  const edge = p.edgeFinish || 'straight';
                  
                  let seamYTop = 0;
                  if (edge === 'scalloped') {
                    const scallop_w = 4; // cm
                    const n = Math.max(2, Math.round((data.bboxW - p.seamAllowance) / scallop_w));
                    const scallop_w_px = w_active_px / n;
                    seamYTop = Math.min(18, scallop_w_px / 2.5);
                  } else if (edge === 'wave') {
                    seamYTop = 15;
                  }

                  return (
                    <rect
                      x={w_active_px}
                      y={seamYTop}
                      width={seam_px}
                      height={h_mold_px - seamYTop}
                      fill="#2c4cdb"
                      fillOpacity="0.08"
                      className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[2,2]"
                    />
                  );
                })()}
                <text
                  x={(data.bboxW - (params as CylinderParams).seamAllowance / 2) * scale}
                  y={(data.bboxH / 2) * scale}
                  className={`${textStyle} text-[10px] font-mono italic`}
                  textAnchor="middle"
                  writingMode="vertical-rl"
                >
                  Sobreposição (+{(params as CylinderParams).seamAllowance}cm)
                </text>
              </g>
            )}

            {/* Decorative holes grid representation */}
            {(params as CylinderParams).hasHoles && (
              <g>
                {/* Draw some stylized holes to represent pattern */}
                {(() => {
                  const p = params as CylinderParams;
                  const holeRad = (p.holeDiameter / 2) * scale;
                  const holeDist = p.holeSpacing * scale;
                  const cols = Math.max(1, Math.floor((data.bboxW - p.seamAllowance - 2) / p.holeSpacing));
                  const rows = Math.max(1, Math.floor((data.bboxH - 2) / p.holeSpacing));
                  const elements = [];

                  const xStart = (data.bboxW - p.seamAllowance - (cols - 1) * p.holeSpacing) * scale / 2;
                  const yStart = (data.bboxH - (rows - 1) * p.holeSpacing) * scale / 2;
                  const shape = p.holeShape || 'circle';

                  for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                      const cx = xStart + c * holeDist;
                      const cy = yStart + r * holeDist;
                      const key = `hole-${r}-${c}`;

                      if (shape === 'circle') {
                        elements.push(
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={holeRad}
                            className="stroke-[#2c4cdb] stroke-[1] fill-[#fafaf9]"
                          />
                        );
                      } else if (shape === 'square') {
                        elements.push(
                          <rect
                            key={key}
                            x={cx - holeRad}
                            y={cy - holeRad}
                            width={holeRad * 2}
                            height={holeRad * 2}
                            rx="1.5"
                            className="stroke-[#2c4cdb] stroke-[1] fill-[#fafaf9]"
                          />
                        );
                      } else if (shape === 'rectangle') {
                        elements.push(
                          <rect
                            key={key}
                            x={cx - holeRad / 1.8}
                            y={cy - holeRad * 1.4}
                            width={holeRad * 1.1}
                            height={holeRad * 2.8}
                            rx="1"
                            className="stroke-[#2c4cdb] stroke-[1] fill-[#fafaf9]"
                          />
                        );
                      } else if (shape === 'star') {
                        const starPoints = [];
                        for (let i = 0; i < 10; i++) {
                          const angle = (i * Math.PI) / 5 - Math.PI / 2;
                          const currRad = i % 2 === 0 ? holeRad * 1.25 : holeRad * 0.5;
                          const sx = cx + currRad * Math.cos(angle);
                          const sy = cy + currRad * Math.sin(angle);
                          starPoints.push(`${sx},${sy}`);
                        }
                        const starD = `M ${starPoints.join(' L ')} Z`;
                        elements.push(
                          <path
                            key={key}
                            d={starD}
                            className="stroke-[#2c4cdb] stroke-[1] fill-[#fafaf9]"
                          />
                        );
                      } else if (shape === 'flower') {
                        const petals = [];
                        const numPetals = 6;
                        const petalDistance = holeRad * 0.6;
                        const petalRad = holeRad * 0.45;
                        
                        petals.push(
                          <circle
                            key={`flower-core-${r}-${c}`}
                            cx={cx}
                            cy={cy}
                            r={holeRad * 0.4}
                            className="stroke-[#2c4cdb] stroke-[0.8] fill-[#fafaf9]"
                          />
                        );
                        
                        for (let p_idx = 0; p_idx < numPetals; p_idx++) {
                          const angle = (p_idx * 2 * Math.PI) / numPetals;
                          const px = cx + petalDistance * Math.cos(angle);
                          const py = cy + petalDistance * Math.sin(angle);
                          petals.push(
                            <circle
                              key={`flower-petal-${r}-${c}-${p_idx}`}
                              cx={px}
                              cy={py}
                              r={petalRad}
                              className="stroke-[#2c4cdb] stroke-[0.6] fill-[#fafaf9]"
                            />
                          );
                        }
                        elements.push(
                          <g key={key}>
                            {petals}
                          </g>
                        );
                      }
                    }
                  }
                  return elements;
                })()}
              </g>
            )}

            {/* Dimensions annotations */}
            {showDimensions && (
              <g>
                {/* Horizontal width line */}
                <g transform={`translate(0, ${-15})`}>
                  <line x1="0" y1="0" x2={data.bboxW * scale} y2="0" className={dimLineStyle} />
                  <text x={(data.bboxW * scale) / 2} y="-6" className={dimTextStyle} textAnchor="middle">
                    L total: {data.bboxW.toFixed(1)} cm
                  </text>
                </g>
                {/* Horizontal circ line (excluding seam) */}
                {showSeam && (params as CylinderParams).seamAllowance > 0 && (
                  <g transform={`translate(0, ${data.bboxH * scale + 15})`}>
                    <line x1="0" y1="0" x2={(data.bboxW - (params as CylinderParams).seamAllowance) * scale} y2="0" className={dimLineStyle} />
                    <text x={((data.bboxW - (params as CylinderParams).seamAllowance) * scale) / 2} y="12" className={dimTextStyle} textAnchor="middle">
                      Circunferência: {((data as any).circ_mold).toFixed(1)} cm
                    </text>
                  </g>
                )}
                {/* Vertical height line */}
                <g transform={`translate(${-15}, 0)`}>
                  <line x1="0" y1="0" x2="0" y2={data.bboxH * scale} className={dimLineStyle} />
                  <text x="-6" y={(data.bboxH * scale) / 2} className={dimTextStyle} textAnchor="middle" transform={`rotate(-90, -6, ${(data.bboxH * scale) / 2})`}>
                    H total: {data.bboxH.toFixed(1)} cm
                  </text>
                </g>
              </g>
            )}

            {/* Cylinder Interactive Resizing Handles */}
            {onChangeParams && (
              <g className="no-print">
                {/* Horizontal Adjust (Diameter/Width) */}
                <g
                  className="cursor-ew-resize select-none"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDragState({
                      handle: 'cylinderWidth',
                      startX: e.clientX,
                      startY: e.clientY,
                      startParams: { ...params },
                    });
                  }}
                >
                  <circle cx={data.bboxW * scale} cy={(data.bboxH * scale) / 2} r="18" fill="transparent" />
                  <circle cx={data.bboxW * scale} cy={(data.bboxH * scale) / 2} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                  <circle cx={data.bboxW * scale} cy={(data.bboxH * scale) / 2} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                  <text x={data.bboxW * scale + 14} y={(data.bboxH * scale) / 2 + 4} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="start">
                    ↔ Diâmetro
                  </text>
                </g>

                {/* Vertical Adjust (Height) */}
                <g
                  className="cursor-ns-resize select-none"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDragState({
                      handle: 'cylinderHeight',
                      startX: e.clientX,
                      startY: e.clientY,
                      startParams: { ...params },
                    });
                  }}
                >
                  <circle cx={(data.bboxW * scale) / 2} cy={data.bboxH * scale} r="18" fill="transparent" />
                  <circle cx={(data.bboxW * scale) / 2} cy={data.bboxH * scale} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                  <circle cx={(data.bboxW * scale) / 2} cy={data.bboxH * scale} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                  <text x={(data.bboxW * scale) / 2} y={data.bboxH * scale + 18} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="middle">
                    ↕ Altura
                  </text>
                </g>
              </g>
            )}

            <HandleAttachGuidesSVG scale={scale} data={data} wPx={data.bboxW * scale} />
            <HandleStripSVG scale={scale} data={data} bodyBboxH={data.bboxH} showDimensions={showDimensions} />
          </g>
        )}

        {shapeType === 'cone' && (
          <g>
            {data.type === 'cone' ? (
              (() => {
                const d = data as any;
                const scale = pxPerCm;

                // Sector parameters
                const L_outer_px = d.L_outer * scale;
                const L_inner_px = d.L_inner * scale;
                const total_theta = d.total_theta;
                const theta = d.theta;

                // Center coordinates such that the curved template fits inside our bounding box nicely
                // Apex is centered at top, but we offset it so the arc sits centered in the view
                const visualBboxW = d.bboxW * scale;
                const apexX = centerX;
                const apexY = pad - L_inner_px * Math.cos(total_theta/2);

                // Helper to get arc point from apex
                const getArcPoint = (r: number, angleRad: number) => {
                  // Angle is centered pointing straight down (angle = PI/2)
                  // So the span is from PI/2 - total_theta/2 to PI/2 + total_theta/2
                  const a = Math.PI / 2 + angleRad;
                  return {
                    x: apexX + r * Math.cos(a),
                    y: apexY + r * Math.sin(a),
                  };
                };

                // Main sector points
                const pt1_out = getArcPoint(L_outer_px, -total_theta / 2);
                const pt2_out = getArcPoint(L_outer_px, total_theta / 2);
                const pt3_in = getArcPoint(L_inner_px, total_theta / 2);
                const pt4_in = getArcPoint(L_inner_px, -total_theta / 2);

                const pt_circ_end = getArcPoint(L_outer_px, -total_theta/2 + theta);
                const pt_circ_end_in = getArcPoint(L_inner_px, -total_theta/2 + theta);

                // Cone Path
                const mainPath = `
                  M ${pt1_out.x} ${pt1_out.y}
                  A ${L_outer_px} ${L_outer_px} 0 ${total_theta > Math.PI ? 1 : 0} 1 ${pt2_out.x} ${pt2_out.y}
                  L ${pt3_in.x} ${pt3_in.y}
                  A ${L_inner_px} ${L_inner_px} 0 ${total_theta > Math.PI ? 1 : 0} 0 ${pt4_in.x} ${pt4_in.y}
                  Z
                `;

                return (
                  <g>
                    {/* Radial Guides */}
                    <line x1={apexX} y1={apexY} x2={pt1_out.x} y2={pt1_out.y} className="stroke-gray-300 stroke-[1] stroke-dasharray-[2,2]" />
                    <line x1={apexX} y1={apexY} x2={pt2_out.x} y2={pt2_out.y} className="stroke-gray-300 stroke-[1] stroke-dasharray-[2,2]" />

                    {/* Actual Cone Template */}
                    <path d={mainPath} className={lineStyle} />

                    {/* Seam Allowance Overlay (drawn as a sub-sector of the cone) */}
                    {showSeam && d.seam > 0 && (
                      <g>
                        {/* Seam hatch path representing the seam allowance block at the end */}
                        {(() => {
                          const seamPath = `
                            M ${pt_circ_end.x} ${pt_circ_end.y}
                            A ${L_outer_px} ${L_outer_px} 0 0 1 ${pt2_out.x} ${pt2_out.y}
                            L ${pt3_in.x} ${pt3_in.y}
                            A ${L_inner_px} ${L_inner_px} 0 0 0 ${pt_circ_end_in.x} ${pt_circ_end_in.y}
                            Z
                          `;
                          return (
                            <path
                              d={seamPath}
                              fill="#2c4cdb"
                              fillOpacity="0.08"
                              className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[2,2]"
                            />
                          );
                        })()}
                        <text
                          x={(pt_circ_end.x + pt2_out.x) / 2}
                          y={(pt_circ_end.y + pt2_out.y) / 2 - 10}
                          className={`${textStyle} text-[9px] font-mono`}
                          textAnchor="middle"
                          transform={`rotate(${(total_theta/2 * 180)/Math.PI}, ${(pt_circ_end.x + pt2_out.x) / 2}, ${(pt_circ_end.y + pt2_out.y) / 2 - 10})`}
                        >
                          Costura (+{d.seam}cm)
                        </text>
                      </g>
                    )}

                    {/* Dimension Markers */}
                    {showDimensions && (
                      <g>
                        {/* Outer Slant radius marker */}
                        <line x1={apexX} y1={apexY} x2={pt1_out.x} y2={pt1_out.y} className={dimLineStyle} />
                        <text
                          x={(apexX + pt1_out.x) / 2 - 15}
                          y={(apexY + pt1_out.y) / 2}
                          className={dimTextStyle}
                          textAnchor="middle"
                          transform={`rotate(${(-total_theta/2 * 180)/Math.PI - 90}, ${(apexX + pt1_out.x) / 2 - 15}, ${(apexY + pt1_out.y) / 2})`}
                        >
                          R Ext: {d.L_outer.toFixed(1)} cm
                        </text>

                        {/* Inner Slant radius marker */}
                        <text
                          x={(apexX + pt4_in.x) / 2 + 15}
                          y={(apexY + pt4_in.y) / 2}
                          className={dimTextStyle}
                          textAnchor="middle"
                          transform={`rotate(${(-total_theta/2 * 180)/Math.PI - 90}, ${(apexX + pt4_in.x) / 2 + 15}, ${(apexY + pt4_in.y) / 2})`}
                        >
                          R Int: {d.L_inner.toFixed(1)} cm
                        </text>

                        {/* Slant Height (geratriz) */}
                        <g transform="translate(10, 10)">
                          <path
                            d={`M ${pt1_out.x + 10} ${pt1_out.y} L ${pt4_in.x + 10} ${pt4_in.y}`}
                            className={dimLineStyle}
                          />
                          <text
                            x={(pt1_out.x + pt4_in.x) / 2 + 25}
                            y={(pt1_out.y + pt4_in.y) / 2}
                            className={dimTextStyle}
                            textAnchor="middle"
                          >
                            Geratriz: {d.s.toFixed(1)} cm
                          </text>
                        </g>

                        {/* Labels for Top & Bottom Diameters */}
                        <text x={apexX} y={pad + d.bboxH * scale + 20} className={`${textStyle} text-center`} textAnchor="middle">
                          Ø Topo do Molde: {d.dt_mold.toFixed(1)} cm | Ø Base do Molde: {d.db_mold.toFixed(1)} cm
                        </text>
                      </g>
                    )}

                    {/* Cone Interactive Resizing Handles */}
                    {onChangeParams && (
                      <g className="no-print">
                        {/* Top Diameter Handle at pt2_out */}
                        <g
                          className="cursor-ew-resize select-none"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setDragState({
                              handle: 'coneTopDia',
                              startX: e.clientX,
                              startY: e.clientY,
                              startParams: { ...params },
                            });
                          }}
                        >
                          <circle cx={pt2_out.x} cy={pt2_out.y} r="18" fill="transparent" />
                          <circle cx={pt2_out.x} cy={pt2_out.y} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                          <circle cx={pt2_out.x} cy={pt2_out.y} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                          <text x={pt2_out.x + 12} y={pt2_out.y + 4} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="start">
                            ↔ Ø Topo
                          </text>
                        </g>

                        {/* Bottom Diameter Handle at pt3_in */}
                        <g
                          className="cursor-ew-resize select-none"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setDragState({
                              handle: 'coneBotDia',
                              startX: e.clientX,
                              startY: e.clientY,
                              startParams: { ...params },
                            });
                          }}
                        >
                          <circle cx={pt3_in.x} cy={pt3_in.y} r="18" fill="transparent" />
                          <circle cx={pt3_in.x} cy={pt3_in.y} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                          <circle cx={pt3_in.x} cy={pt3_in.y} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                          <text x={pt3_in.x + 12} y={pt3_in.y + 4} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="start">
                            ↔ Ø Base
                          </text>
                        </g>

                        {/* Height Handle at getArcPoint(L_outer_px, 0) */}
                        {(() => {
                          const pt_mid = getArcPoint(L_outer_px, 0);
                          return (
                            <g
                              className="cursor-ns-resize select-none"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                setDragState({
                                  handle: 'coneHeight',
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  startParams: { ...params },
                                });
                              }}
                            >
                              <circle cx={pt_mid.x} cy={pt_mid.y} r="18" fill="transparent" />
                              <circle cx={pt_mid.x} cy={pt_mid.y} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                              <circle cx={pt_mid.x} cy={pt_mid.y} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                              <text x={pt_mid.x} y={pt_mid.y + 18} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="middle">
                                ↕ Altura
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    )}

                    {(data as any).hasHandle && (
                      <g transform={`translate(${apexX - (data.bboxW * scale) / 2}, ${pad + d.bboxH * scale + 10})`}>
                        {showDimensions && (
                          <text x={(data.bboxW * scale) / 2} y={0} className={`${textStyle} text-[9px] italic`} textAnchor="middle">
                            Meça a altura na peça montada para marcar os pontos de fixação da alça
                          </text>
                        )}
                        <HandleStripSVG scale={scale} data={data} bodyBboxH={0} showDimensions={showDimensions} />
                      </g>
                    )}
                  </g>
                );
              })()
            ) : (
              // Cylindrical fallback
              <g transform={`translate(${pad}, ${pad})`}>
                <rect x="0" y="0" width={data.bboxW * scale} height={data.bboxH * scale} className={lineStyle} />
                {showSeam && (data as any).seam > 0 && (
                  <rect
                    x={(data.bboxW - (data as any).seam) * scale}
                    y="0"
                    width={(data as any).seam * scale}
                    height={data.bboxH * scale}
                    fill="#2c4cdb"
                    fillOpacity="0.08"
                    className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[2,2]"
                  />
                )}
                {showDimensions && (
                  <g>
                    <line x1="0" y1={-15} x2={data.bboxW * scale} y2={-15} className={dimLineStyle} />
                    <text x={(data.bboxW * scale) / 2} y="-20" className={dimTextStyle} textAnchor="middle">
                      Largura: {data.bboxW.toFixed(1)} cm
                    </text>
                    <line x1={-15} y1="0" x2={-15} y2={data.bboxH * scale} className={dimLineStyle} />
                    <text x="-25" y={(data.bboxH * scale) / 2} className={dimTextStyle} textAnchor="middle" transform={`rotate(-90, -25, ${(data.bboxH * scale) / 2})`}>
                      Altura: {data.bboxH.toFixed(1)} cm
                    </text>
                  </g>
                )}
                <HandleAttachGuidesSVG scale={scale} data={data} wPx={data.bboxW * scale} />
                <HandleStripSVG scale={scale} data={data} bodyBboxH={data.bboxH} showDimensions={showDimensions} />
              </g>
            )}
          </g>
        )}

        {shapeType === 'bowl' && (
          <g transform={`translate(${pad}, ${pad})`}>
            {(() => {
              const bowlData = data as any;
              const bands = bowlData.bands as import('../utils/bowlShape').BandGeometry[];
              let yCursor = 0;
              return bands.map((band, i) => {
                const bandOriginY = yCursor;
                yCursor += (band.bboxH + 1.5) * scale; // BOWL_BAND_GAP in px

                if (band.isCylindrical) {
                  const bandW = band.bboxW * scale;
                  const bandH = band.bboxH * scale;
                  const x0 = (bowlData.bboxW * scale - bandW) / 2;
                  return (
                    <g key={i} transform={`translate(${x0}, ${bandOriginY})`}>
                      <rect x="0" y="0" width={bandW} height={bandH} className={lineStyle} />
                      {showSeam && band.rTop > 0 && data.seam > 0 && (
                        <rect x={bandW - data.seam * scale} y="0" width={data.seam * scale} height={bandH} fill="#2c4cdb" fillOpacity="0.08" className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[2,2]" />
                      )}
                      {showDimensions && (
                        <text x={bandW / 2} y={bandH / 2} className={textStyle} textAnchor="middle">
                          Banda {i + 1}/{bands.length} — Ø {(band.rBottom * 2).toFixed(1)} cm
                        </text>
                      )}
                    </g>
                  );
                }

                const L_outer_px = band.L_outer * scale;
                const L_inner_px = band.L_inner * scale;
                const apexX = bowlData.bboxW * scale / 2;
                const apexY = bandOriginY - L_inner_px * Math.cos(band.total_theta / 2);

                const getArcPoint = (r: number, angleRad: number) => {
                  const a = Math.PI / 2 + angleRad;
                  return { x: apexX + r * Math.cos(a), y: apexY + r * Math.sin(a) };
                };

                const pt1_out = getArcPoint(L_outer_px, -band.total_theta / 2);
                const pt2_out = getArcPoint(L_outer_px, band.total_theta / 2);
                const pt3_in = getArcPoint(L_inner_px, band.total_theta / 2);
                const pt4_in = getArcPoint(L_inner_px, -band.total_theta / 2);
                const pt_circ_end = getArcPoint(L_outer_px, -band.total_theta / 2 + band.theta);
                const pt_circ_end_in = getArcPoint(L_inner_px, -band.total_theta / 2 + band.theta);

                const mainPath = `
                  M ${pt1_out.x} ${pt1_out.y}
                  A ${L_outer_px} ${L_outer_px} 0 ${band.total_theta > Math.PI ? 1 : 0} 1 ${pt2_out.x} ${pt2_out.y}
                  L ${pt3_in.x} ${pt3_in.y}
                  A ${L_inner_px} ${L_inner_px} 0 ${band.total_theta > Math.PI ? 1 : 0} 0 ${pt4_in.x} ${pt4_in.y}
                  Z
                `;

                return (
                  <g key={i}>
                    <path d={mainPath} className={lineStyle} />

                    {showSeam && bowlData.seam > 0 && (
                      <path
                        d={`M ${pt_circ_end.x} ${pt_circ_end.y} A ${L_outer_px} ${L_outer_px} 0 0 1 ${pt2_out.x} ${pt2_out.y} L ${pt3_in.x} ${pt3_in.y} A ${L_inner_px} ${L_inner_px} 0 0 0 ${pt_circ_end_in.x} ${pt_circ_end_in.y} Z`}
                        fill="#2c4cdb"
                        fillOpacity="0.08"
                        className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[2,2]"
                      />
                    )}

                    {showDimensions && (
                      <text
                        x={apexX}
                        y={bandOriginY + band.bboxH * scale + 14}
                        className={`${textStyle} text-[9px]`}
                        textAnchor="middle"
                      >
                        Banda {i + 1}/{bands.length} • Ø {(band.rBottom * 2).toFixed(1)}→{(band.rTop * 2).toFixed(1)} cm • Geratriz {band.s.toFixed(1)} cm
                      </text>
                    )}
                  </g>
                );
              });
            })()}
            {showDimensions && (
              <text x={(data.bboxW * scale) / 2} y={data.bboxH * scale + 26} className={textStyle} textAnchor="middle">
                Tigela: Ø Borda {(data as any).dt_mold.toFixed(1)} cm | Ø Base {(data as any).db_mold.toFixed(1)} cm | Altura {(data as any).h_mold.toFixed(1)} cm — corte e cole as {(data as any).bands.length} bandas em sequência
              </text>
            )}
          </g>
        )}

        {shapeType === 'vase' && (
          <g transform={`translate(${pad}, ${pad})`}>
            {(() => {
              const vaseData = data as any;
              const bands = vaseData.bands as import('../utils/bowlShape').BandGeometry[];
              let yCursor = 0;
              return bands.map((band, i) => {
                const bandOriginY = yCursor;
                yCursor += (band.bboxH + 1.5) * scale; // VASE_BAND_GAP in px

                if (band.isCylindrical) {
                  const bandW = band.bboxW * scale;
                  const bandH = band.bboxH * scale;
                  const x0 = (vaseData.bboxW * scale - bandW) / 2;
                  return (
                    <g key={i} transform={`translate(${x0}, ${bandOriginY})`}>
                      <rect x="0" y="0" width={bandW} height={bandH} className={lineStyle} />
                      {showSeam && vaseData.seam > 0 && (
                        <rect x={bandW - vaseData.seam * scale} y="0" width={vaseData.seam * scale} height={bandH} fill="#2c4cdb" fillOpacity="0.08" className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[2,2]" />
                      )}
                      {showDimensions && (
                        <text x={bandW / 2} y={bandH / 2} className={textStyle} textAnchor="middle">
                          Banda {i + 1}/{bands.length} — Ø {(band.rBottom * 2).toFixed(1)} cm
                        </text>
                      )}
                    </g>
                  );
                }

                const L_outer_px = band.L_outer * scale;
                const L_inner_px = band.L_inner * scale;
                const apexX = vaseData.bboxW * scale / 2;
                const apexY = bandOriginY - L_inner_px * Math.cos(band.total_theta / 2);

                const getArcPoint = (r: number, angleRad: number) => {
                  const a = Math.PI / 2 + angleRad;
                  return { x: apexX + r * Math.cos(a), y: apexY + r * Math.sin(a) };
                };

                const pt1_out = getArcPoint(L_outer_px, -band.total_theta / 2);
                const pt2_out = getArcPoint(L_outer_px, band.total_theta / 2);
                const pt3_in = getArcPoint(L_inner_px, band.total_theta / 2);
                const pt4_in = getArcPoint(L_inner_px, -band.total_theta / 2);
                const pt_circ_end = getArcPoint(L_outer_px, -band.total_theta / 2 + band.theta);
                const pt_circ_end_in = getArcPoint(L_inner_px, -band.total_theta / 2 + band.theta);

                const mainPath = `
                  M ${pt1_out.x} ${pt1_out.y}
                  A ${L_outer_px} ${L_outer_px} 0 ${band.total_theta > Math.PI ? 1 : 0} 1 ${pt2_out.x} ${pt2_out.y}
                  L ${pt3_in.x} ${pt3_in.y}
                  A ${L_inner_px} ${L_inner_px} 0 ${band.total_theta > Math.PI ? 1 : 0} 0 ${pt4_in.x} ${pt4_in.y}
                  Z
                `;

                return (
                  <g key={i}>
                    <path d={mainPath} className={lineStyle} />

                    {showSeam && vaseData.seam > 0 && (
                      <path
                        d={`M ${pt_circ_end.x} ${pt_circ_end.y} A ${L_outer_px} ${L_outer_px} 0 0 1 ${pt2_out.x} ${pt2_out.y} L ${pt3_in.x} ${pt3_in.y} A ${L_inner_px} ${L_inner_px} 0 0 0 ${pt_circ_end_in.x} ${pt_circ_end_in.y} Z`}
                        fill="#2c4cdb"
                        fillOpacity="0.08"
                        className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[2,2]"
                      />
                    )}

                    {showDimensions && (
                      <text
                        x={apexX}
                        y={bandOriginY + band.bboxH * scale + 14}
                        className={`${textStyle} text-[9px]`}
                        textAnchor="middle"
                      >
                        Banda {i + 1}/{bands.length} • Ø {(band.rBottom * 2).toFixed(1)}→{(band.rTop * 2).toFixed(1)} cm • Geratriz {band.s.toFixed(1)} cm
                      </text>
                    )}
                  </g>
                );
              });
            })()}
            {showDimensions && (
              <text x={(data.bboxW * scale) / 2} y={data.bboxH * scale + 26} className={textStyle} textAnchor="middle">
                Jarra: Ø Base {(data as any).d_base_mold.toFixed(1)} cm | Ø Ombro {(data as any).d_shoulder_mold.toFixed(1)} cm | Ø Gargalo {(data as any).d_neck_mold.toFixed(1)} cm — corte e cole as {(data as any).bands.length} bandas em sequência
              </text>
            )}
          </g>
        )}

        {shapeType === 'tray' && (
          <g transform={`translate(${pad}, ${pad})`}>
            {/* Draw flat layout of folded tray */}
            {(() => {
              const d = data as any;
              const scale = pxPerCm;

              const l_base = d.l_mold * scale;
              const w_base = d.w_mold * scale;
              const r_flat = d.rim_flat * scale;
              const r_ext = d.rim_ext * scale;

              // Corner notched tray path
              // The central base rectangle is at (r_flat, r_flat) with size (l_base, w_base)
              // The flanges flare out. The outer notches go in by (r_flat - r_ext)
              // We'll draw the outer perimeter, and dashed lines showing the folds!
              
              const p_outer = `
                M ${r_flat} 0
                L ${r_flat + l_base} 0
                L ${r_flat + l_base + r_ext} ${r_flat}
                L ${r_flat * 2 + l_base} ${r_flat + w_base}
                L ${r_flat + l_base} ${r_flat * 2 + w_base}
                L ${r_flat} ${r_flat * 2 + w_base}
                L 0 ${r_flat + w_base}
                L ${r_ext} ${r_flat}
                Z
              `;

              return (
                <g>
                  {/* Outer cut perimeter */}
                  <path d={p_outer} className={lineStyle} />

                  {/* Fold fold dashed lines */}
                  <rect
                    x={r_flat}
                    y={r_flat}
                    width={l_base}
                    height={w_base}
                    className={dashStyle}
                  />

                  {/* Fold lines indicators */}
                  <line x1={r_flat} y1="0" x2={r_flat} y2={r_flat} className="stroke-gray-300 stroke-[1] stroke-dasharray-[2,2]" />
                  <line x1={r_flat + l_base} y1="0" x2={r_flat + l_base} y2={r_flat} className="stroke-gray-300 stroke-[1] stroke-dasharray-[2,2]" />
                  <line x1={r_flat * 2 + l_base} y1={r_flat + w_base} x2={r_flat + l_base} y2={r_flat + w_base} className="stroke-gray-300 stroke-[1] stroke-dasharray-[2,2]" />
                  
                  {/* Inner Base Label */}
                  <text x={r_flat + l_base/2} y={r_flat + w_base/2} className={`${textStyle} text-center text-[10px] font-mono`} textAnchor="middle">
                    BASE: {d.l_mold.toFixed(1)}x{d.w_mold.toFixed(1)} cm
                  </text>

                  {showDimensions && (
                    <g>
                      {/* Overall width */}
                      <g transform={`translate(${-15}, 0)`}>
                        <line x1="0" y1="0" x2="0" y2={d.total_w * scale} className={dimLineStyle} />
                        <text x="-6" y={(d.total_w * scale) / 2} className={dimTextStyle} textAnchor="middle" transform={`rotate(-90, -6, ${(d.total_w * scale) / 2})`}>
                          W total: {d.total_w.toFixed(1)} cm
                        </text>
                      </g>

                      {/* Overall length */}
                      <g transform={`translate(0, ${-15})`}>
                        <line x1="0" y1="0" x2={d.total_l * scale} y2="0" className={dimLineStyle} />
                        <text x={(d.total_l * scale) / 2} y="-6" className={dimTextStyle} textAnchor="middle">
                          L total: {d.total_l.toFixed(1)} cm
                        </text>
                      </g>

                      {/* Flange height */}
                      <g transform={`translate(${r_flat + l_base/2}, ${0})`}>
                        <line x1="0" y1="0" x2="0" y2={r_flat} className={dimLineStyle} />
                        <text x="6" y={r_flat/2} className={`${dimTextStyle} text-[8px]`} textAnchor="start">
                          Aba: {d.rim_flat.toFixed(1)} cm
                        </text>
                      </g>
                    </g>
                  )}

                  {/* Tray Interactive Resizing Handles */}
                  {onChangeParams && (
                    <g className="no-print">
                      {/* Length Handle at x = r_flat + l_base, y = r_flat + w_base / 2 */}
                      <g
                        className="cursor-ew-resize select-none"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setDragState({
                            handle: 'trayLength',
                            startX: e.clientX,
                            startY: e.clientY,
                            startParams: { ...params },
                          });
                        }}
                      >
                        <circle cx={r_flat + l_base} cy={r_flat + w_base / 2} r="18" fill="transparent" />
                        <circle cx={r_flat + l_base} cy={r_flat + w_base / 2} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                        <circle cx={r_flat + l_base} cy={r_flat + w_base / 2} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                        <text x={r_flat + l_base + 12} y={r_flat + w_base / 2 + 4} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="start">
                          ↔ Comprimento
                        </text>
                      </g>

                      {/* Width Handle at x = r_flat + l_base / 2, y = r_flat + w_base */}
                      <g
                        className="cursor-ns-resize select-none"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setDragState({
                            handle: 'trayWidth',
                            startX: e.clientX,
                            startY: e.clientY,
                            startParams: { ...params },
                          });
                        }}
                      >
                        <circle cx={r_flat + l_base / 2} cy={r_flat + w_base} r="18" fill="transparent" />
                        <circle cx={r_flat + l_base / 2} cy={r_flat + w_base} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                        <circle cx={r_flat + l_base / 2} cy={r_flat + w_base} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                        <text x={r_flat + l_base / 2} y={r_flat + w_base + 18} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="middle">
                          ↕ Largura
                        </text>
                      </g>

                      {/* Lip Height Handle (Aba) at x = r_flat + l_base / 2, y = 0 */}
                      <g
                        className="cursor-ns-resize select-none"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setDragState({
                            handle: 'trayLipHeight',
                            startX: e.clientX,
                            startY: e.clientY,
                            startParams: { ...params },
                          });
                        }}
                      >
                        <circle cx={r_flat + l_base / 2} cy={0} r="18" fill="transparent" />
                        <circle cx={r_flat + l_base / 2} cy={0} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                        <circle cx={r_flat + l_base / 2} cy={0} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                        <text x={r_flat + l_base / 2} y={-12} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="middle">
                          ↕ Altura da Aba
                        </text>
                      </g>
                    </g>
                  )}
                </g>
              );
            })()}
          </g>
        )}

        {shapeType === 'napkin_holder' && (
          <g transform={`translate(${pad}, ${pad})`}>
            {/* Draw 3 plates separated in a layout */}
            {(() => {
              const d = data as any;
              const scale = pxPerCm;

              const w = d.w_mold * scale;
              const h = d.h_mold * scale;
              const db = d.d_mold * scale;
              const t = d.thick_mold * scale;
              const sp = d.spacing * scale;

              const finish = (params as NapkinHolderParams).edgeFinish || 'straight';
              const getPlatePath = () => {
                if (finish === 'straight') {
                  return `M 0 ${h} L 0 0 L ${w} 0 L ${w} ${h} Z`;
                } else if (finish === 'rounded') {
                  const r_arch = Math.min(w / 2, h);
                  return `M 0 ${h} L 0 ${h - r_arch} A ${r_arch} ${r_arch} 0 0 1 ${w} ${h - r_arch} L ${w} ${h} Z`;
                } else {
                  // scalloped
                  const n = Math.max(2, Math.round(w / (4 * scale)));
                  const scallop_w_px = w / n;
                  const scallop_h_px = Math.min(18, scallop_w_px / 2.5);
                  let pathD = `M 0 ${h} L 0 ${scallop_h_px}`;
                  for (let i = 0; i < n; i++) {
                    const x1 = i * scallop_w_px;
                    const x2 = (i + 1) * scallop_w_px;
                    const x_mid = x1 + scallop_w_px / 2;
                    pathD += ` Q ${x_mid} 0 ${x2} ${scallop_h_px}`;
                  }
                  pathD += ` L ${w} ${h} Z`;
                  return pathD;
                }
              };

              return (
                <g>
                  {/* Plate 1: Side Panel 1 */}
                  <g transform={`translate(0, 0)`}>
                    <path d={getPlatePath()} className={lineStyle} />
                    {/* Bevel cut mark lines at bottom edge (45 degree chamfer helper) */}
                    <line x1="0" y1={h - t} x2={w} y2={h - t} className={dashStyle} />
                    <text x={w/2} y={h - 14} className={`${textStyle} text-center`} textAnchor="middle">
                      Placa Lateral 1 ({d.w_mold.toFixed(1)}x{d.h_mold.toFixed(1)} cm)
                    </text>
                    <text x={w/2} y={h - t - 4} className={`${textStyle} text-[9px] font-mono fill-terracotta-500/80`} textAnchor="middle">
                      Corte Chanfrado 45° de {d.thick_mold.toFixed(2)}cm
                    </text>
                  </g>

                  {/* Plate 2: Base Plate */}
                  <g transform={`translate(0, ${h + sp})`}>
                    <rect x="0" y="0" width={w} height={db} className={lineStyle} />
                    {/* Bevel cut mark lines at top and bottom edge */}
                    <line x1="0" y1={t} x2={w} y2={t} className={dashStyle} />
                    <line x1="0" y1={db - t} x2={w} y2={db - t} className={dashStyle} />
                    <text x={w/2} y={db/2 + 3} className={`${textStyle} text-center`} textAnchor="middle">
                      Placa Base ({d.w_mold.toFixed(1)}x{d.d_mold.toFixed(1)} cm)
                    </text>
                    <text x={w/2} y={t - 2} className={`${textStyle} text-[8px] font-mono fill-terracotta-500/80`} textAnchor="middle">
                      Chanfro 45°
                    </text>
                    <text x={w/2} y={db - t + 8} className={`${textStyle} text-[8px] font-mono fill-terracotta-500/80`} textAnchor="middle">
                      Chanfro 45°
                    </text>
                  </g>

                  {/* Plate 3: Side Panel 2 */}
                  <g transform={`translate(0, ${h + db + sp * 2})`}>
                    <path d={getPlatePath()} className={lineStyle} />
                    <line x1="0" y1={h - t} x2={w} y2={h - t} className={dashStyle} />
                    <text x={w/2} y={h - 14} className={`${textStyle} text-center`} textAnchor="middle">
                      Placa Lateral 2 ({d.w_mold.toFixed(1)}x{d.h_mold.toFixed(1)} cm)
                    </text>
                    <text x={w/2} y={h - t - 4} className={`${textStyle} text-[9px] font-mono fill-terracotta-500/80`} textAnchor="middle">
                      Corte Chanfrado 45° de {d.thick_mold.toFixed(2)}cm
                    </text>
                  </g>

                  {showDimensions && (
                    <g>
                      {/* Height guide side 1 */}
                      <g transform={`translate(${-15}, 0)`}>
                        <line x1="0" y1="0" x2="0" y2={h} className={dimLineStyle} />
                        <text x="-6" y={h/2} className={dimTextStyle} textAnchor="middle" transform={`rotate(-90, -6, ${h/2})`}>
                          H: {d.h_mold.toFixed(1)} cm
                        </text>
                      </g>
                      {/* Width guide base */}
                      <g transform={`translate(0, ${-15})`}>
                        <line x1="0" y1="0" x2={w} y2="0" className={dimLineStyle} />
                        <text x={w/2} y="-6" className={dimTextStyle} textAnchor="middle">
                          Largura: {d.w_mold.toFixed(1)} cm
                        </text>
                      </g>
                    </g>
                  )}

                  {/* Napkin Holder Interactive Resizing Handles */}
                  {onChangeParams && (
                    <g className="no-print">
                      {/* Width Handle on Side Panel 1 right edge */}
                      <g
                        className="cursor-ew-resize select-none"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setDragState({
                            handle: 'napkinWidth',
                            startX: e.clientX,
                            startY: e.clientY,
                            startParams: { ...params },
                          });
                        }}
                      >
                        <circle cx={w} cy={h / 2} r="18" fill="transparent" />
                        <circle cx={w} cy={h / 2} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                        <circle cx={w} cy={h / 2} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                        <text x={w + 12} y={h / 2 + 4} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="start">
                          ↔ Largura
                        </text>
                      </g>

                      {/* Height Handle on Side Panel 1 top edge */}
                      <g
                        className="cursor-ns-resize select-none"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setDragState({
                            handle: 'napkinHeight',
                            startX: e.clientX,
                            startY: e.clientY,
                            startParams: { ...params },
                          });
                        }}
                      >
                        <circle cx={w / 2} cy={0} r="18" fill="transparent" />
                        <circle cx={w / 2} cy={0} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                        <circle cx={w / 2} cy={0} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                        <text x={w / 2} y={-12} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="middle">
                          ↕ Altura
                        </text>
                      </g>

                      {/* Depth Handle on Base Plate bottom edge */}
                      <g
                        className="cursor-ns-resize select-none"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setDragState({
                            handle: 'napkinDepth',
                            startX: e.clientX,
                            startY: e.clientY,
                            startParams: { ...params },
                          });
                        }}
                      >
                        <circle cx={w / 2} cy={h + sp + db} r="18" fill="transparent" />
                        <circle cx={w / 2} cy={h + sp + db} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                        <circle cx={w / 2} cy={h + sp + db} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                        <text x={w / 2} y={h + sp + db + 18} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="middle">
                          ↕ Profundidade
                        </text>
                      </g>
                    </g>
                  )}
                </g>
              );
            })()}
          </g>
        )}

        {shapeType === 'box' && (
          <g>
            {data.type === 'box' ? (
              (() => {
                const d = data as any;
                const scale = pxPerCm;
                
                const wM = d.w_mold * scale;
                const hM = d.h_mold * scale;
                const dM = d.d_mold * scale;
                const thick = d.thick_mold * scale;
                const seam = d.seam * scale;
                const hasLid = d.hasLid;

                // Origin coordinates for centering
                const bX = hM;
                const bY = hM + (hasLid ? dM : 0);

                // Closed outer boundary path
                const outerPath = hasLid
                  ? `M ${bX} ${bY - hM - dM} 
                     L ${bX + wM} ${bY - hM - dM} 
                     L ${bX + wM} ${bY} 
                     L ${bX + wM + hM} ${bY} 
                     L ${bX + wM + hM} ${bY + dM} 
                     L ${bX + wM} ${bY + dM} 
                     L ${bX + wM} ${bY + dM + hM} 
                     L ${bX} ${bY + dM + hM} 
                     L ${bX} ${bY + dM} 
                     L ${bX - hM} ${bY + dM} 
                     L ${bX - hM} ${bY} 
                     L ${bX} ${bY} Z`
                  : `M ${bX} ${bY - hM} 
                     L ${bX + wM} ${bY - hM} 
                     L ${bX + wM} ${bY} 
                     L ${bX + wM + hM} ${bY} 
                     L ${bX + wM + hM} ${bY + dM} 
                     L ${bX + wM} ${bY + dM} 
                     L ${bX + wM} ${bY + dM + hM} 
                     L ${bX} ${bY + dM + hM} 
                     L ${bX} ${bY + dM} 
                     L ${bX - hM} ${bY + dM} 
                     L ${bX - hM} ${bY} 
                     L ${bX} ${bY} Z`;

                return (
                  <g>
                    {/* Main net outer cut outline */}
                    <path d={outerPath} className={lineStyle} />

                    {/* Inner Fold Lines (dashes) */}
                    {/* Base Top Fold */}
                    <line x1={bX} y1={bY} x2={bX + wM} y2={bY} className={dashStyle} />
                    {/* Base Bottom Fold */}
                    <line x1={bX} y1={bY + dM} x2={bX + wM} y2={bY + dM} className={dashStyle} />
                    {/* Base Left Fold */}
                    <line x1={bX} y1={bY} x2={bX} y2={bY + dM} className={dashStyle} />
                    {/* Base Right Fold */}
                    <line x1={bX + wM} y1={bY} x2={bX + wM} y2={bY + dM} className={dashStyle} />
                    
                    {/* Lid Fold (if hasLid) */}
                    {hasLid && (
                      <line x1={bX} y1={bY - hM} x2={bX + wM} y2={bY - hM} className={dashStyle} />
                    )}

                    {/* Labels for each face */}
                    {/* Base */}
                    <g transform={`translate(${bX + wM/2}, ${bY + dM/2})`}>
                      <text className={`${textStyle} font-bold`} textAnchor="middle" y="-4">
                        BASE
                      </text>
                      <text className={`${textStyle} text-[9px]`} textAnchor="middle" y="8">
                        {d.w_mold.toFixed(1)}x{d.d_mold.toFixed(1)} cm
                      </text>
                    </g>

                    {/* Back Wall */}
                    <g transform={`translate(${bX + wM/2}, ${bY - hM/2})`}>
                      <text className={`${textStyle} font-bold`} textAnchor="middle" y="-4">
                        ATRÁS
                      </text>
                      <text className={`${textStyle} text-[9px]`} textAnchor="middle" y="8">
                        {d.w_mold.toFixed(1)}x{d.h_mold.toFixed(1)} cm
                      </text>
                    </g>

                    {/* Front Wall */}
                    <g transform={`translate(${bX + wM/2}, ${bY + dM + hM/2})`}>
                      <text className={`${textStyle} font-bold`} textAnchor="middle" y="-4">
                        FRENTE
                      </text>
                      <text className={`${textStyle} text-[9px]`} textAnchor="middle" y="8">
                        {d.w_mold.toFixed(1)}x{d.h_mold.toFixed(1)} cm
                      </text>
                    </g>

                    {/* Left Wall */}
                    <g transform={`translate(${bX - hM/2}, ${bY + dM/2})`}>
                      <text className={`${textStyle} font-bold`} textAnchor="middle" y="-4">
                        ESQ
                      </text>
                      <text className={`${textStyle} text-[9px]`} textAnchor="middle" y="8">
                        {d.h_mold.toFixed(1)}x{d.d_mold.toFixed(1)} cm
                      </text>
                    </g>

                    {/* Right Wall */}
                    <g transform={`translate(${bX + wM + hM/2}, ${bY + dM/2})`}>
                      <text className={`${textStyle} font-bold`} textAnchor="middle" y="-4">
                        DIR
                      </text>
                      <text className={`${textStyle} text-[9px]`} textAnchor="middle" y="8">
                        {d.h_mold.toFixed(1)}x{d.d_mold.toFixed(1)} cm
                      </text>
                    </g>

                    {/* Lid Wall */}
                    {hasLid && (
                      <g transform={`translate(${bX + wM/2}, ${bY - hM - dM/2})`}>
                        <text className={`${textStyle} font-bold`} textAnchor="middle" y="-4">
                          TAMPA
                        </text>
                        <text className={`${textStyle} text-[9px]`} textAnchor="middle" y="8">
                          {d.w_mold.toFixed(1)}x{d.d_mold.toFixed(1)} cm
                        </text>
                      </g>
                    )}

                    {/* Bevel cut mark lines at corners (thickness guide for 45 deg) */}
                    {thick > 0 && (
                      <g className="opacity-40">
                        {/* 45 degree helpers */}
                        <line x1={bX + thick} y1={bY + thick} x2={bX + thick} y2={bY + dM - thick} className={dashStyle} stroke="#5a72e4" />
                        <line x1={bX + wM - thick} y1={bY + thick} x2={bX + wM - thick} y2={bY + dM - thick} className={dashStyle} stroke="#5a72e4" />
                        <line x1={bX + thick} y1={bY + thick} x2={bX + wM - thick} y2={bY + thick} className={dashStyle} stroke="#5a72e4" />
                        <line x1={bX + thick} y1={bY + dM - thick} x2={bX + wM - thick} y2={bY + dM - thick} className={dashStyle} stroke="#5a72e4" />
                      </g>
                    )}

                    {/* 2D Dimension guidelines overlay (Cotas) */}
                    {showDimensions && (
                      <g>
                        {/* Overall Width Guideline at top of Back Wall */}
                        <g transform={`translate(0, ${bY - hM - 15})`}>
                          <line x1={bX} y1="0" x2={bX + wM} y2="0" className={dimLineStyle} />
                          <line x1={bX} y1="-3" x2={bX} y2="3" className={dimLineStyle} />
                          <line x1={bX + wM} y1="-3" x2={bX + wM} y2="3" className={dimLineStyle} />
                          <text x={bX + wM/2} y="-6" className={dimTextStyle} textAnchor="middle">
                            Largura: {d.w_mold.toFixed(1)} cm
                          </text>
                        </g>

                        {/* Overall Depth Guideline for Base */}
                        <g transform={`translate(${bX + wM + 15}, ${bY})`}>
                          <line x1="0" y1="0" x2="0" y2={dM} className={dimLineStyle} />
                          <line x1="-3" y1="0" x2="3" y2="0" className={dimLineStyle} />
                          <line x1="-3" y1={dM} x2="3" y2={dM} className={dimLineStyle} />
                          <text x="6" y={dM/2 + 3} className={dimTextStyle} textAnchor="start">
                            Prof.: {d.d_mold.toFixed(1)} cm
                          </text>
                        </g>

                        {/* Overall Height Guideline for Walls */}
                        <g transform={`translate(${bX - 15}, ${bY})`}>
                          <line x1="0" y1="0" x2="0" y2={-hM} className={dimLineStyle} />
                          <line x1="-3" y1="0" x2="3" y2="0" className={dimLineStyle} />
                          <line x1="-3" y1={-hM} x2="3" y2={-hM} className={dimLineStyle} />
                          <text x="-6" y={-hM/2 + 3} className={dimTextStyle} textAnchor="end">
                            Alt.: {d.h_mold.toFixed(1)} cm
                          </text>
                        </g>
                      </g>
                    )}

                    {/* Interactive Drag Handles */}
                    {onChangeParams && (
                      <g className="no-print">
                        {/* Width Adjuster Handle (Right edge of Front wall) */}
                        <g
                          className="cursor-ew-resize select-none"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setDragState({
                              handle: 'boxWidth',
                              startX: e.clientX,
                              startY: e.clientY,
                              startParams: { ...params },
                            });
                          }}
                        >
                          <circle cx={bX + wM} cy={bY + dM + hM/2} r="18" fill="transparent" />
                          <circle cx={bX + wM} cy={bY + dM + hM/2} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                          <circle cx={bX + wM} cy={bY + dM + hM/2} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                          <text x={bX + wM + 12} y={bY + dM + hM/2 + 4} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="start">
                            ↔ Largura
                          </text>
                        </g>

                        {/* Height Adjuster Handle (Bottom edge of Front wall) */}
                        <g
                          className="cursor-ns-resize select-none"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setDragState({
                              handle: 'boxHeight',
                              startX: e.clientX,
                              startY: e.clientY,
                              startParams: { ...params },
                            });
                          }}
                        >
                          <circle cx={bX + wM/2} cy={bY + dM + hM} r="18" fill="transparent" />
                          <circle cx={bX + wM/2} cy={bY + dM + hM} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                          <circle cx={bX + wM/2} cy={bY + dM + hM} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                          <text x={bX + wM/2} y={bY + dM + hM + 18} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="middle">
                            ↕ Altura
                          </text>
                        </g>

                        {/* Depth Adjuster Handle (Right edge of Right wall) */}
                        <g
                          className="cursor-ew-resize select-none"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setDragState({
                              handle: 'boxDepth',
                              startX: e.clientX,
                              startY: e.clientY,
                              startParams: { ...params },
                            });
                          }}
                        >
                          <circle cx={bX + wM + hM} cy={bY + dM/2} r="18" fill="transparent" />
                          <circle cx={bX + wM + hM} cy={bY + dM/2} r="10" fill="#2c4cdb" fillOpacity="0.15" stroke="#2c4cdb" strokeWidth="1" className="animate-pulse" />
                          <circle cx={bX + wM + hM} cy={bY + dM/2} r="6" fill="#2c4cdb" stroke="#ffffff" strokeWidth="2" />
                          <text x={bX + wM + hM + 12} y={bY + dM/2 + 4} className="fill-[#2c4cdb] font-sans font-bold text-[9px] select-none" textAnchor="start">
                            ↕ Profundidade
                          </text>
                        </g>
                      </g>
                    )}
                  </g>
                );
              })()
            ) : null}
          </g>
        )}

        {shapeType === 'organic_plate' && (
          <g transform={`translate(${pad}, ${pad})`}>
            {(() => {
              const d = data as any;
              const scale = pxPerCm;
              const toPx = (p: { x: number; y: number }) => ({
                x: (p.x - d.bboxMinX) * scale,
                y: (p.y - d.bboxMinY) * scale,
              });
              const innerD = pointsToPathD(d.innerPoints.map(toPx));
              const outerD = pointsToPathD(d.outerPoints.map(toPx));

              return (
                <g>
                  {/* Outer cut line */}
                  <path d={outerD} className={lineStyle} />
                  {/* Inner fold guide (where the base ends and the rim rises) — only meaningful when there's a rim */}
                  {d.hasLip && (
                    <path d={innerD} className="stroke-[#2c4cdb] stroke-[1] stroke-dasharray-[4,4] fill-none" />
                  )}

                  <text x={(d.bboxW * scale) / 2} y={(d.bboxH * scale) / 2} className={`${textStyle} text-[10px] font-mono`} textAnchor="middle">
                    {d.hasLip ? `Base: ${d.baseArea.toFixed(0)} cm² · Aba: ${d.rimFlat.toFixed(1)} cm` : `Prato Plano: ${d.baseArea.toFixed(0)} cm²`}
                  </text>

                  {showDimensions && (
                    <g>
                      <g transform={`translate(0, ${-15})`}>
                        <line x1="0" y1="0" x2={d.bboxW * scale} y2="0" className={dimLineStyle} />
                        <text x={(d.bboxW * scale) / 2} y="-6" className={dimTextStyle} textAnchor="middle">
                          L total: {d.bboxW.toFixed(1)} cm
                        </text>
                      </g>
                      <g transform={`translate(${-15}, 0)`}>
                        <line x1="0" y1="0" x2="0" y2={d.bboxH * scale} className={dimLineStyle} />
                        <text x="-6" y={(d.bboxH * scale) / 2} className={dimTextStyle} textAnchor="middle" transform={`rotate(-90, -6, ${(d.bboxH * scale) / 2})`}>
                          H total: {d.bboxH.toFixed(1)} cm
                        </text>
                      </g>
                    </g>
                  )}
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* 2D / 3D Mode Selector */}
      <div className="flex bg-clay-50/80 p-1.5 rounded-2xl border border-terracotta-100/30 w-fit mx-auto sm:mx-0">
        <button
          onClick={() => setViewMode('3d')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            viewMode === '3d'
              ? 'bg-white text-terracotta-600 shadow-sm'
              : 'text-clay-900/30 hover:text-clay-900/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          3D
        </button>
        <button
          onClick={() => setViewMode('2d_canvas')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            viewMode === '2d_canvas'
              ? 'bg-white text-terracotta-600 shadow-sm'
              : 'text-clay-900/30 hover:text-clay-900/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Canvas 2D
        </button>
        <button
          onClick={() => setViewMode('2d_svg')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            viewMode === '2d_svg'
              ? 'bg-white text-terracotta-600 shadow-sm'
              : 'text-clay-900/30 hover:text-clay-900/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          SVG 2D
        </button>
      </div>

      {viewMode === '3d' ? (
        <div className="flex-1 bg-white rounded-3xl border border-terracotta-100 overflow-hidden shadow-sm">
          <Interactive3DPreview shapeType={shapeType} params={params} />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-terracotta-100 p-8 shadow-sm flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-terracotta-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-clay-900">
                    {viewMode === '2d_canvas' ? 'Molde Interativo' : 'Molde Vetorial'}
                  </h3>
                  <p className="text-[10px] text-clay-900/40 uppercase font-bold tracking-wider">Visualização 2D</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSeam(!showSeam)}
                  className={`p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                    showSeam
                      ? 'bg-terracotta-50 border-terracotta-200 text-terracotta-600'
                      : 'bg-white border-gray-100 text-clay-900/30'
                  }`}
                  title="Alternar Margem de Costura"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Margens</span>
                </button>
                <button
                  onClick={() => setShowDimensions(!showDimensions)}
                  className={`p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                    showDimensions
                      ? 'bg-terracotta-50 border-terracotta-200 text-terracotta-600'
                      : 'bg-white border-gray-100 text-clay-900/30'
                  }`}
                  title="Alternar Linhas de Cota"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cotas</span>
                </button>
              </div>
            </div>

            {/* Scaled canvas frame */}
            <div className="relative aspect-square md:aspect-video w-full flex items-center justify-center p-4 rounded-2xl bg-clay-50 border border-clay-100 shadow-inner overflow-hidden mb-6">
              {viewMode === '2d_canvas' ? (
                <Pattern2DCanvas
                  shapeType={shapeType}
                  params={params}
                  data={data}
                  showSeam={showSeam}
                  showDimensions={showDimensions}
                />
              ) : (
                renderSVGElements()
              )}
            </div>
          </div>

          {/* Export / Print Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-dashed border-clay-200">
            <button
              onClick={handleExportSVG}
              className="py-4 px-6 bg-white hover:bg-clay-50 border border-terracotta-100 text-terracotta-600 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar SVG
            </button>

            <button
              onClick={handlePrint}
              className="py-4 px-6 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Printer className="w-4.5 h-4.5" />
              Preparar Impressão
            </button>
          </div>

          {/* Hidden SVG wrapper to ensure exporting and printing works fine when using Canvas view */}
          {viewMode === '2d_canvas' && (
            <div className="hidden" aria-hidden="true">
              {renderSVGElements()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
