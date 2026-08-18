import React, { useRef, useEffect, useState } from 'react';
import { ShapeType, CylinderParams, ConeParams, TrayParams, NapkinHolderParams, BoxParams, OrganicPlateParams, BowlParams, VaseParams, SketchParams } from '../types';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { bandStackHeight } from '../utils/bowlShape';

interface Pattern2DCanvasProps {
  shapeType: ShapeType;
  params: CylinderParams | ConeParams | TrayParams | NapkinHolderParams | BoxParams | OrganicPlateParams | BowlParams | VaseParams | SketchParams;
  data: any;
  showSeam: boolean;
  showDimensions: boolean;
}

export default function Pattern2DCanvas({ shapeType, params, data, showSeam, showDimensions }: Pattern2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Handle Resize of the container
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: width || 400,
          height: height || 400,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Reset zoom and pan when shape changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [shapeType]);

  // Main Draw Function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dimensions.width;
    const h = dimensions.height;

    // Set display size and buffer size for crisp Retina rendering
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Padding around the pattern — generous enough that the trailing summary
    // label some shapes draw a fixed ~30-40px below their own bounding box
    // (e.g. drawBowl's "Tigela: Ø Borda..." line) doesn't get clipped by the
    // canvas edge at the default fit-to-view zoom.
    const padding = 65;

    // Calculate bounding box and centering scale — use the wider view bbox
    // (body + handle strip) when present, so the whole pattern fits on screen
    const bboxW = data.viewBboxW ?? data.bboxW; // in cm
    const bboxH = data.viewBboxH ?? data.bboxH; // in cm

    // Scale calculations to fit pattern to container viewport
    const scaleX = (w - padding * 2) / bboxW;
    const scaleY = (h - padding * 2) / bboxH;
    const fitScale = Math.min(scaleX, scaleY);
    
    // Final scale in pixels per cm
    const scale = fitScale * zoom;

    // Center coordinates
    const centerX = w / 2 + pan.x;
    const centerY = h / 2 + pan.y;

    // Top-left origin of bounding box in canvas coordinates
    const originX = centerX - (bboxW * scale) / 2;
    const originY = centerY - (bboxH * scale) / 2;

    // Draw Grid Background
    drawGrid(ctx, w, h, scale, originX, originY);

    // Draw the actual shape pattern
    ctx.save();
    ctx.translate(originX, originY);

    if (shapeType === 'cylinder') {
      drawCylinder(ctx, scale, params as CylinderParams, data, showSeam, showDimensions);
    } else if (shapeType === 'cone') {
      drawCone(ctx, scale, params as ConeParams, data, showSeam, showDimensions, centerX - originX, centerY - originY);
    } else if (shapeType === 'tray') {
      drawTray(ctx, scale, params as TrayParams, data, showDimensions);
    } else if (shapeType === 'napkin_holder') {
      drawNapkinHolder(ctx, scale, params as NapkinHolderParams, data, showDimensions);
    } else if (shapeType === 'box') {
      drawBox(ctx, scale, params as BoxParams, data, showSeam, showDimensions);
    } else if (shapeType === 'organic_plate') {
      drawOrganicPlate(ctx, scale, data, showDimensions);
    } else if (shapeType === 'bowl') {
      drawBowl(ctx, scale, data, showSeam, showDimensions);
    } else if (shapeType === 'vase') {
      drawVase(ctx, scale, data, showSeam, showDimensions);
    } else if (shapeType === 'sketch') {
      drawSketchShape(ctx, scale, data, showSeam, showDimensions);
    }

    ctx.restore();

    // Draw Real-Scale Indicator in Corner
    drawScaleIndicator(ctx, w, h, scale);

  }, [dimensions, shapeType, params, data, showSeam, showDimensions, zoom, pan]);

  // Handle Dragging / Panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Helper: Draw scale indicator (e.g. 5cm bar in bottom-right corner)
  const drawScaleIndicator = (ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) => {
    const barCm = 5;
    const barPx = barCm * scale;
    const startX = w - barPx - 30;
    const startY = h - 30;

    ctx.save();
    ctx.strokeStyle = '#17171a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + barPx, startY);
    ctx.moveTo(startX, startY - 4);
    ctx.lineTo(startX, startY + 4);
    ctx.moveTo(startX + barPx, startY - 4);
    ctx.lineTo(startX + barPx, startY + 4);
    ctx.stroke();

    ctx.fillStyle = '#17171a';
    ctx.font = '500 10px "JetBrains Mono", monospace';
    // Right-align to the canvas edge rather than centering over the bar —
    // when the fitted scale is very small (e.g. a Bowl/Vase with several
    // thin bands), the 5cm bar itself shrinks to just a few px, but the
    // label text stays the same width and was overflowing past the edge.
    ctx.textAlign = 'right';
    ctx.fillText(`Escala Real: ${barCm} cm`, w - 15, startY - 7);
    ctx.restore();
  };

  // Helper: Draw dynamic background grid
  const drawGrid = (
    ctx: CanvasRenderingContext2D, 
    w: number, 
    h: number, 
    scale: number, 
    originX: number, 
    originY: number
  ) => {
    ctx.save();
    
    // Draw background
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, w, h);

    // Millimeter grid (0.1 cm)
    ctx.strokeStyle = 'rgba(44, 76, 219, 0.03)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    
    // Find grid starts based on panning and scale
    const gridSpacingMm = scale / 10;
    
    // Verticals
    for (let x = originX % scale; x < w; x += gridSpacingMm) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    // Horizontals
    for (let y = originY % scale; y < h; y += gridSpacingMm) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Centimeter grid (1.0 cm)
    ctx.strokeStyle = 'rgba(44, 76, 219, 0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = originX % scale; x < w; x += scale) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = originY % scale; y < h; y += scale) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.restore();
  };

  // Helper: Draw dimension lines with arrows
  const drawDimensionLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    text: string,
    offset: number,
    isVertical: boolean = false
  ) => {
    ctx.save();
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    let ox1 = x1, oy1 = y1, ox2 = x2, oy2 = y2;
    if (isVertical) {
      ox1 += offset;
      ox2 += offset;
    } else {
      oy1 += offset;
      oy2 += offset;
    }

    // Draw main line
    ctx.beginPath();
    ctx.moveTo(ox1, oy1);
    ctx.lineTo(ox2, oy2);
    ctx.stroke();

    // Draw arrowheads
    const angle = Math.atan2(oy2 - oy1, ox2 - ox1);
    const arrowLen = 5;

    ctx.beginPath();
    ctx.moveTo(ox1, oy1);
    ctx.lineTo(ox1 + arrowLen * Math.cos(angle + Math.PI / 6), oy1 + arrowLen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(ox1 + arrowLen * Math.cos(angle - Math.PI / 6), oy1 + arrowLen * Math.sin(angle - Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(ox2, oy2);
    ctx.lineTo(ox2 - arrowLen * Math.cos(angle + Math.PI / 6), oy2 - arrowLen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(ox2 - arrowLen * Math.cos(angle - Math.PI / 6), oy2 - arrowLen * Math.sin(angle - Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Draw extension guide lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(ox1, oy1);
    ctx.moveTo(x2, y2);
    ctx.lineTo(ox2, oy2);
    ctx.stroke();

    // Text label
    const midX = (ox1 + ox2) / 2;
    const midY = (oy1 + oy2) / 2;

    ctx.save();
    ctx.fillStyle = '#4b5563';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.translate(midX, midY);
    if (isVertical) {
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, -5);
    } else {
      ctx.fillText(text, 0, -5);
    }
    ctx.restore();

    ctx.restore();
  };

  // Helper: for a thin annular band whose theoretical cone apex sits far
  // above the printed ring itself (shallow-taper bands cut from a wide
  // radius — common on curved-wall Bowl/Vase/Sketch shapes), the reserved
  // space between the apex and the ring reads as an unexplained empty gap.
  // A faint construction line back to the apex signals "this blank space is
  // geometry, not a rendering glitch" instead of leaving it looking broken.
  const drawApexGuide = (ctx: CanvasRenderingContext2D, apexX: number, apexY: number, innerR: number) => {
    if (innerR < 24) return; // negligible gap — not worth the extra line
    ctx.save();
    ctx.strokeStyle = 'rgba(44, 76, 219, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(apexX, apexY + innerR);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(apexX, apexY, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(44, 76, 219, 0.35)';
    ctx.fill();
    ctx.restore();
  };

  // Helper: Draw stylized holes for cylinder decor
  const drawCylinderHoles = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    p: CylinderParams,
    data: any
  ) => {
    ctx.save();
    // holeDiameter/holeSpacing are the user's desired FINAL (post-firing)
    // sizes, like every other dimension here — must convert to mold-scale
    // before drawing, or the holes print smaller than promised once the
    // clay shrinks.
    const shrinkFactor = 1 - p.shrinkage / 100;
    const holeDiameter_mold = p.holeDiameter / shrinkFactor;
    const holeSpacing_mold = p.holeSpacing / shrinkFactor;
    const holeRad = (holeDiameter_mold / 2) * scale;
    const holeDist = holeSpacing_mold * scale;
    const cols = Math.max(1, Math.floor((data.bboxW - p.seamAllowance - 2) / holeSpacing_mold));
    const rows = Math.max(1, Math.floor((data.bboxH - 2) / holeSpacing_mold));

    const xStart = (data.bboxW - p.seamAllowance - (cols - 1) * holeSpacing_mold) * scale / 2;
    const yStart = (data.bboxH - (rows - 1) * holeSpacing_mold) * scale / 2;
    const shape = p.holeShape || 'circle';

    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = xStart + c * holeDist;
        const cy = yStart + r * holeDist;

        ctx.beginPath();
        if (shape === 'circle') {
          ctx.arc(cx, cy, holeRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (shape === 'square') {
          ctx.rect(cx - holeRad, cy - holeRad, holeRad * 2, holeRad * 2);
          ctx.fill();
          ctx.stroke();
        } else if (shape === 'rectangle') {
          ctx.rect(cx - holeRad / 1.8, cy - holeRad * 1.4, holeRad * 1.1, holeRad * 2.8);
          ctx.fill();
          ctx.stroke();
        } else if (shape === 'star') {
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const currRad = i % 2 === 0 ? holeRad * 1.25 : holeRad * 0.5;
            const sx = cx + currRad * Math.cos(angle);
            const sy = cy + currRad * Math.sin(angle);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (shape === 'flower') {
          // core
          ctx.arc(cx, cy, holeRad * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // petals
          const numPetals = 6;
          const petalDistance = holeRad * 0.6;
          const petalRad = holeRad * 0.45;
          for (let p_idx = 0; p_idx < numPetals; p_idx++) {
            ctx.beginPath();
            const angle = (p_idx * 2 * Math.PI) / numPetals;
            const px = cx + petalDistance * Math.cos(angle);
            const py = cy + petalDistance * Math.sin(angle);
            ctx.arc(px, py, petalRad, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  };

  // Shared handle-strip piece for Cylinder/Cone mugs: a flat strap template
  // drawn below the main body pattern, plus (for the rectangular Cylinder
  // pattern only) horizontal guides marking the two attach heights.
  const drawHandleStrip = (ctx: CanvasRenderingContext2D, scale: number, d: any, bodyBboxH: number, showDimensions: boolean) => {
    if (!d.hasHandle) return;
    ctx.save();
    const stripY = (bodyBboxH + d.handleGap) * scale;
    const stripW = d.handleStripLength_mold * scale;
    const stripH = d.handleWidth_mold * scale;

    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.roundRect(0, stripY, stripW, stripH, stripH / 2.2);
    ctx.fill();
    ctx.stroke();

    if (showDimensions) {
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Alça (tira solta): ${d.handleStripLength_mold.toFixed(1)} x ${d.handleWidth_mold.toFixed(1)} cm`, 0, stripY + stripH + 14);
    }
    ctx.restore();
  };

  // Horizontal guides on the flat Cylinder pattern marking where the handle attaches
  const drawHandleAttachGuides = (ctx: CanvasRenderingContext2D, scale: number, d: any, w_mold_px: number, h_mold_px: number) => {
    if (!d.hasHandle) return;
    const yTop = (d.h_mold - d.handleSpan_mold) / 2 * scale;
    const yBottom = h_mold_px - (d.h_mold - d.handleSpan_mold) / 2 * scale;
    ctx.save();
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    [yTop, yBottom].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w_mold_px, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Fixação da alça (topo)', 4, yTop - 3);
    ctx.fillText('Fixação da alça (base)', 4, yBottom - 3);
    ctx.restore();
  };

  // 1. CYLINDER PATTERN DRAWING
  const drawCylinder = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    p: CylinderParams,
    data: any,
    showSeam: boolean,
    showDimensions: boolean
  ) => {
    const w_mold_px = data.bboxW * scale;
    const h_mold_px = data.bboxH * scale;
    const seam_px = p.seamAllowance * scale;
    const w_active_px = w_mold_px - seam_px;
    
    const edge = p.edgeFinish || 'straight';

    // Draw main outline path
    ctx.save();
    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (edge === 'straight') {
      ctx.moveTo(0, h_mold_px);
      ctx.lineTo(0, 0);
      ctx.lineTo(w_mold_px, 0);
      ctx.lineTo(w_mold_px, h_mold_px);
      ctx.closePath();
    } else if (edge === 'scalloped') {
      const scallop_w = 4; // cm
      const n = Math.max(2, Math.round((data.bboxW - p.seamAllowance) / scallop_w));
      const scallop_w_px = w_active_px / n;
      const scallop_h_px = Math.min(18, scallop_w_px / 2.5);

      ctx.moveTo(0, h_mold_px);
      ctx.lineTo(0, scallop_h_px);
      for (let i = 0; i < n; i++) {
        const x1 = i * scallop_w_px;
        const x2 = (i + 1) * scallop_w_px;
        const x_mid = x1 + scallop_w_px / 2;
        ctx.quadraticCurveTo(x_mid, 0, x2, scallop_h_px);
      }
      if (seam_px > 0) {
        ctx.lineTo(w_mold_px, scallop_h_px);
      }
      ctx.lineTo(w_mold_px, h_mold_px);
      ctx.closePath();
    } else if (edge === 'wave') {
      const wave_amplitude = 12; // px
      const wave_offset = 15; // px
      ctx.moveTo(0, h_mold_px);
      ctx.lineTo(0, wave_offset);
      
      const cycles = Math.max(1, Math.round(data.bboxW / 6));
      for (let x = 0; x <= w_active_px; x += 4) {
        const y = wave_offset - wave_amplitude * Math.sin((x / w_active_px) * cycles * 2 * Math.PI);
        ctx.lineTo(x, y);
      }
      if (seam_px > 0) {
        ctx.lineTo(w_mold_px, wave_offset);
      }
      ctx.lineTo(w_mold_px, h_mold_px);
      ctx.closePath();
    }
    
    ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
    ctx.fill();
    ctx.stroke();

    // Draw Seam Allowance overlay
    if (showSeam && p.seamAllowance > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(44, 76, 219, 0.08)';
      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      let seamYTop = 0;
      if (edge === 'scalloped') {
        const scallop_w = 4; // cm
        const n = Math.max(2, Math.round((data.bboxW - p.seamAllowance) / scallop_w));
        const scallop_w_px = w_active_px / n;
        seamYTop = Math.min(18, scallop_w_px / 2.5);
      } else if (edge === 'wave') {
        seamYTop = 15;
      }

      ctx.beginPath();
      ctx.rect(w_active_px, seamYTop, seam_px, h_mold_px - seamYTop);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#2c4cdb';
      ctx.font = 'italic 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(w_active_px + seam_px / 2, h_mold_px / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`Sobreposição (+${p.seamAllowance}cm)`, 0, 4);
      ctx.restore();

      ctx.restore();
    }

    // Draw Holes
    if (p.hasHoles) {
      drawCylinderHoles(ctx, scale, p, data);
    }

    // Dimensions
    if (showDimensions) {
      drawDimensionLine(ctx, 0, 0, w_mold_px, 0, `L total: ${data.bboxW.toFixed(1)} cm`, -15);
      drawDimensionLine(ctx, 0, 0, 0, h_mold_px, `H total: ${data.bboxH.toFixed(1)} cm`, -15, true);
      
      if (showSeam && p.seamAllowance > 0) {
        drawDimensionLine(ctx, 0, h_mold_px, w_active_px, h_mold_px, `Circunferência: ${data.circ_mold.toFixed(1)} cm`, 15);
      }
    }

    drawHandleAttachGuides(ctx, scale, data, w_mold_px, h_mold_px);
    drawHandleStrip(ctx, scale, data, data.h_mold, showDimensions);

    ctx.restore();
  };

  // 2. CONE PATTERN DRAWING
  const drawCone = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    p: ConeParams,
    d: any,
    showSeam: boolean,
    showDimensions: boolean,
    canvasCenterX: number,
    canvasCenterY: number
  ) => {
    if (d.type !== 'cone') {
      // Cylindrical Fallback
      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
      ctx.beginPath();
      ctx.rect(0, 0, d.bboxW * scale, d.bboxH * scale);
      ctx.fill();
      ctx.stroke();

      if (showDimensions) {
        drawDimensionLine(ctx, 0, 0, d.bboxW * scale, 0, `Largura: ${d.bboxW.toFixed(1)} cm`, -15);
        drawDimensionLine(ctx, 0, 0, 0, d.bboxH * scale, `Altura: ${d.bboxH.toFixed(1)} cm`, -15, true);
      }
      drawHandleAttachGuides(ctx, scale, d, d.bboxW * scale, d.h_mold * scale);
      drawHandleStrip(ctx, scale, d, d.h_mold, showDimensions);
      return;
    }

    ctx.save();
    const L_outer_px = d.L_outer * scale;
    const L_inner_px = d.L_inner * scale;
    const total_theta = d.total_theta;
    const theta = d.theta;

    const apexX = d.bboxW * scale / 2;
    const apexY = -L_inner_px * Math.cos(total_theta/2);

    // Helpers to compute points
    const getPoint = (r: number, angleRad: number) => {
      const a = Math.PI / 2 + angleRad;
      return {
        x: apexX + r * Math.cos(a),
        y: apexY + r * Math.sin(a),
      };
    };

    const pt1_out = getPoint(L_outer_px, -total_theta / 2);
    const pt2_out = getPoint(L_outer_px, total_theta / 2);
    const pt3_in = getPoint(L_inner_px, total_theta / 2);
    const pt4_in = getPoint(L_inner_px, -total_theta / 2);

    const pt_circ_end = getPoint(L_outer_px, -total_theta / 2 + theta);
    const pt_circ_end_in = getPoint(L_inner_px, -total_theta / 2 + theta);

    // Draw main sector outline
    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
    ctx.beginPath();
    
    ctx.moveTo(pt1_out.x, pt1_out.y);
    // Outer arc
    ctx.arc(
      apexX, 
      apexY, 
      L_outer_px, 
      Math.PI / 2 - total_theta / 2, 
      Math.PI / 2 + total_theta / 2, 
      false
    );
    // Joint to inner arc
    ctx.lineTo(pt3_in.x, pt3_in.y);
    // Inner arc (drawn reverse direction)
    ctx.arc(
      apexX,
      apexY,
      L_inner_px,
      Math.PI / 2 + total_theta / 2,
      Math.PI / 2 - total_theta / 2,
      true
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw Radial Guidelines to Apex
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(pt1_out.x, pt1_out.y);
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(pt2_out.x, pt2_out.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Seam allowance
    if (showSeam && d.seam > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(44, 76, 219, 0.08)';
      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(pt_circ_end.x, pt_circ_end.y);
      ctx.arc(
        apexX,
        apexY,
        L_outer_px,
        Math.PI / 2 - total_theta / 2 + theta,
        Math.PI / 2 + total_theta / 2,
        false
      );
      ctx.lineTo(pt3_in.x, pt3_in.y);
      ctx.arc(
        apexX,
        apexY,
        L_inner_px,
        Math.PI / 2 + total_theta / 2,
        Math.PI / 2 - total_theta / 2 + theta,
        true
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Label text
      const textX = (pt_circ_end.x + pt2_out.x) / 2;
      const textY = (pt_circ_end.y + pt2_out.y) / 2 - 10;
      ctx.fillStyle = '#2c4cdb';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(total_theta / 2);
      ctx.fillText(`Costura (+${d.seam}cm)`, 0, 0);
      ctx.restore();

      ctx.restore();
    }

    // Dimensions labels & markers
    if (showDimensions) {
      ctx.save();
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Outer slant radius line
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(pt1_out.x, pt1_out.y);
      ctx.stroke();

      // Label for Outer Slant Radius
      const outerMidX = (apexX + pt1_out.x) / 2;
      const outerMidY = (apexY + pt1_out.y) / 2;
      ctx.save();
      ctx.fillStyle = '#4b5563';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.translate(outerMidX - 10, outerMidY);
      ctx.rotate(-total_theta/2);
      ctx.fillText(`R Ext: ${d.L_outer.toFixed(1)} cm`, 0, -4);
      ctx.restore();

      // Label for Inner Slant Radius
      const innerMidX = (apexX + pt4_in.x) / 2;
      const innerMidY = (apexY + pt4_in.y) / 2;
      ctx.save();
      ctx.fillStyle = '#4b5563';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.translate(innerMidX + 10, innerMidY);
      ctx.rotate(-total_theta/2);
      ctx.fillText(`R Int: ${d.L_inner.toFixed(1)} cm`, 0, -4);
      ctx.restore();

      // Bottom information label
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Ø Topo: ${d.dt_mold.toFixed(1)} cm | Ø Base: ${d.db_mold.toFixed(1)} cm`, apexX, d.bboxH * scale + 20);
      ctx.restore();
    }

    if (d.hasHandle) {
      ctx.save();
      ctx.fillStyle = '#374151';
      ctx.font = 'italic 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Meça a altura na peça montada para marcar os pontos de fixação da alça', (d.bboxW * scale) / 2, (d.bboxH * scale) + 34);
      ctx.restore();
      drawHandleStrip(ctx, scale, d, d.bboxH, showDimensions);
    }

    ctx.restore();
  };

  // BOWL PATTERN DRAWING — a stack of frustum-band sectors approximating the curved wall
  const drawBowl = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    d: any,
    showSeam: boolean,
    showDimensions: boolean
  ) => {
    ctx.save();
    const BAND_GAP = 1.5 * scale;
    let yCursor = 0;
    const centerX = (d.bboxW * scale) / 2;

    (d.bands as any[]).forEach((band, i) => {
      const bandOriginY = yCursor;
      yCursor += bandStackHeight(band) * scale + BAND_GAP;

      if (band.isCylindrical) {
        const bandW = band.bboxW * scale;
        const bandH = band.bboxH * scale;
        const x0 = centerX - bandW / 2;
        ctx.strokeStyle = '#2c4cdb';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
        ctx.beginPath();
        ctx.rect(x0, bandOriginY, bandW, bandH);
        ctx.fill();
        ctx.stroke();
        if (showDimensions) {
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Banda ${i + 1}/${d.bands.length} — Ø ${(band.rBottom * 2).toFixed(1)} cm`, centerX, bandOriginY + bandH / 2);
        }
        return;
      }

      const L_outer_px = band.L_outer * scale;
      const L_inner_px = band.L_inner * scale;
      const apexX = centerX;
      const apexY = bandOriginY; // true top of the sector — see bandStackHeight

      const getPoint = (r: number, angleRad: number) => {
        const a = Math.PI / 2 + angleRad;
        return { x: apexX + r * Math.cos(a), y: apexY + r * Math.sin(a) };
      };

      const pt1_out = getPoint(L_outer_px, -band.total_theta / 2);
      const pt3_in = getPoint(L_inner_px, band.total_theta / 2);
      const pt_circ_end = getPoint(L_outer_px, -band.total_theta / 2 + band.theta);
      const pt_circ_end_in = getPoint(L_inner_px, -band.total_theta / 2 + band.theta);

      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
      ctx.beginPath();
      ctx.moveTo(pt1_out.x, pt1_out.y);
      ctx.arc(apexX, apexY, L_outer_px, Math.PI / 2 - band.total_theta / 2, Math.PI / 2 + band.total_theta / 2, false);
      ctx.lineTo(pt3_in.x, pt3_in.y);
      ctx.arc(apexX, apexY, L_inner_px, Math.PI / 2 + band.total_theta / 2, Math.PI / 2 - band.total_theta / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawApexGuide(ctx, apexX, apexY, L_inner_px);

      if (showSeam && d.seam > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(44, 76, 219, 0.08)';
        ctx.strokeStyle = '#2c4cdb';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pt_circ_end.x, pt_circ_end.y);
        ctx.arc(apexX, apexY, L_outer_px, Math.PI / 2 - band.total_theta / 2 + band.theta, Math.PI / 2 + band.total_theta / 2, false);
        ctx.lineTo(pt3_in.x, pt3_in.y);
        ctx.arc(apexX, apexY, L_inner_px, Math.PI / 2 + band.total_theta / 2, Math.PI / 2 - band.total_theta / 2 + band.theta, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (showDimensions) {
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Banda ${i + 1}/${d.bands.length} • Ø ${(band.rBottom * 2).toFixed(1)}→${(band.rTop * 2).toFixed(1)} cm • Geratriz ${band.s.toFixed(1)} cm`,
          apexX,
          bandOriginY + bandStackHeight(band) * scale + 14
        );
      }
    });

    if (showDimensions) {
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Tigela: Ø Borda ${d.dt_mold.toFixed(1)} cm | Ø Base ${d.db_mold.toFixed(1)} cm | Altura ${d.h_mold.toFixed(1)} cm`, centerX, d.bboxH * scale + 26);
    }

    ctx.restore();
  };

  // VASE PATTERN DRAWING — same banded-frustum technique as the Bowl, plus a shoulder bend
  const drawVase = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    d: any,
    showSeam: boolean,
    showDimensions: boolean
  ) => {
    ctx.save();
    const BAND_GAP = 1.5 * scale;
    let yCursor = 0;
    const centerX = (d.bboxW * scale) / 2;

    (d.bands as any[]).forEach((band, i) => {
      const bandOriginY = yCursor;
      yCursor += bandStackHeight(band) * scale + BAND_GAP;

      if (band.isCylindrical) {
        const bandW = band.bboxW * scale;
        const bandH = band.bboxH * scale;
        const x0 = centerX - bandW / 2;
        ctx.strokeStyle = '#2c4cdb';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
        ctx.beginPath();
        ctx.rect(x0, bandOriginY, bandW, bandH);
        ctx.fill();
        ctx.stroke();
        if (showDimensions) {
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Banda ${i + 1}/${d.bands.length} — Ø ${(band.rBottom * 2).toFixed(1)} cm`, centerX, bandOriginY + bandH / 2);
        }
        return;
      }

      const L_outer_px = band.L_outer * scale;
      const L_inner_px = band.L_inner * scale;
      const apexX = centerX;
      const apexY = bandOriginY; // true top of the sector — see bandStackHeight

      const getPoint = (r: number, angleRad: number) => {
        const a = Math.PI / 2 + angleRad;
        return { x: apexX + r * Math.cos(a), y: apexY + r * Math.sin(a) };
      };

      const pt1_out = getPoint(L_outer_px, -band.total_theta / 2);
      const pt3_in = getPoint(L_inner_px, band.total_theta / 2);
      const pt_circ_end = getPoint(L_outer_px, -band.total_theta / 2 + band.theta);
      const pt_circ_end_in = getPoint(L_inner_px, -band.total_theta / 2 + band.theta);

      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
      ctx.beginPath();
      ctx.moveTo(pt1_out.x, pt1_out.y);
      ctx.arc(apexX, apexY, L_outer_px, Math.PI / 2 - band.total_theta / 2, Math.PI / 2 + band.total_theta / 2, false);
      ctx.lineTo(pt3_in.x, pt3_in.y);
      ctx.arc(apexX, apexY, L_inner_px, Math.PI / 2 + band.total_theta / 2, Math.PI / 2 - band.total_theta / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawApexGuide(ctx, apexX, apexY, L_inner_px);

      if (showSeam && d.seam > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(44, 76, 219, 0.08)';
        ctx.strokeStyle = '#2c4cdb';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pt_circ_end.x, pt_circ_end.y);
        ctx.arc(apexX, apexY, L_outer_px, Math.PI / 2 - band.total_theta / 2 + band.theta, Math.PI / 2 + band.total_theta / 2, false);
        ctx.lineTo(pt3_in.x, pt3_in.y);
        ctx.arc(apexX, apexY, L_inner_px, Math.PI / 2 + band.total_theta / 2, Math.PI / 2 - band.total_theta / 2 + band.theta, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (showDimensions) {
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Banda ${i + 1}/${d.bands.length} • Ø ${(band.rBottom * 2).toFixed(1)}→${(band.rTop * 2).toFixed(1)} cm • Geratriz ${band.s.toFixed(1)} cm`,
          apexX,
          bandOriginY + bandStackHeight(band) * scale + 14
        );
      }
    });

    if (showDimensions) {
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Jarra: Ø Base ${d.d_base_mold.toFixed(1)} cm | Ø Ombro ${d.d_shoulder_mold.toFixed(1)} cm | Ø Gargalo ${d.d_neck_mold.toFixed(1)} cm`,
        centerX,
        d.bboxH * scale + 26
      );
    }

    ctx.restore();
  };

  // Hand-drawn profile pattern — same banded-frustum technique, driven by
  // the user's straightened sketch instead of a formula.
  const drawSketchShape = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    d: any,
    showSeam: boolean,
    showDimensions: boolean
  ) => {
    ctx.save();
    const BAND_GAP = 1.5 * scale;
    let yCursor = 0;
    const centerX = (d.bboxW * scale) / 2;

    (d.bands as any[]).forEach((band, i) => {
      const bandOriginY = yCursor;
      yCursor += bandStackHeight(band) * scale + BAND_GAP;

      if (band.isCylindrical) {
        const bandW = band.bboxW * scale;
        const bandH = band.bboxH * scale;
        const x0 = centerX - bandW / 2;
        ctx.strokeStyle = '#2c4cdb';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
        ctx.beginPath();
        ctx.rect(x0, bandOriginY, bandW, bandH);
        ctx.fill();
        ctx.stroke();
        if (showDimensions) {
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Banda ${i + 1}/${d.bands.length} — Ø ${(band.rBottom * 2).toFixed(1)} cm`, centerX, bandOriginY + bandH / 2);
        }
        return;
      }

      const L_outer_px = band.L_outer * scale;
      const L_inner_px = band.L_inner * scale;
      const apexX = centerX;
      const apexY = bandOriginY; // true top of the sector — see bandStackHeight

      const getPoint = (r: number, angleRad: number) => {
        const a = Math.PI / 2 + angleRad;
        return { x: apexX + r * Math.cos(a), y: apexY + r * Math.sin(a) };
      };

      const pt1_out = getPoint(L_outer_px, -band.total_theta / 2);
      const pt3_in = getPoint(L_inner_px, band.total_theta / 2);
      const pt_circ_end = getPoint(L_outer_px, -band.total_theta / 2 + band.theta);
      const pt_circ_end_in = getPoint(L_inner_px, -band.total_theta / 2 + band.theta);

      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
      ctx.beginPath();
      ctx.moveTo(pt1_out.x, pt1_out.y);
      ctx.arc(apexX, apexY, L_outer_px, Math.PI / 2 - band.total_theta / 2, Math.PI / 2 + band.total_theta / 2, false);
      ctx.lineTo(pt3_in.x, pt3_in.y);
      ctx.arc(apexX, apexY, L_inner_px, Math.PI / 2 + band.total_theta / 2, Math.PI / 2 - band.total_theta / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawApexGuide(ctx, apexX, apexY, L_inner_px);

      if (showSeam && d.seam > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(44, 76, 219, 0.08)';
        ctx.strokeStyle = '#2c4cdb';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pt_circ_end.x, pt_circ_end.y);
        ctx.arc(apexX, apexY, L_outer_px, Math.PI / 2 - band.total_theta / 2 + band.theta, Math.PI / 2 + band.total_theta / 2, false);
        ctx.lineTo(pt3_in.x, pt3_in.y);
        ctx.arc(apexX, apexY, L_inner_px, Math.PI / 2 + band.total_theta / 2, Math.PI / 2 - band.total_theta / 2 + band.theta, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (showDimensions) {
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Banda ${i + 1}/${d.bands.length} • Ø ${(band.rBottom * 2).toFixed(1)}→${(band.rTop * 2).toFixed(1)} cm • Geratriz ${band.s.toFixed(1)} cm`,
          apexX,
          bandOriginY + bandStackHeight(band) * scale + 14
        );
      }
    });

    if (showDimensions) {
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Molde Desenhado: Ø Máx ${d.d_max_mold.toFixed(1)} cm | Altura ${d.h_mold.toFixed(1)} cm`, centerX, d.bboxH * scale + 26);
    }

    ctx.restore();
  };

  // 3. TRAY PATTERN DRAWING
  const drawTray = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    p: TrayParams,
    d: any,
    showDimensions: boolean
  ) => {
    ctx.save();
    const l_base = d.l_mold * scale;
    const w_base = d.w_mold * scale;
    const r_flat = d.rim_flat * scale;
    const r_ext = d.rim_ext * scale;

    // Drawing outer boundary path
    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
    
    ctx.beginPath();
    ctx.moveTo(r_flat, 0);
    ctx.lineTo(r_flat + l_base, 0);
    ctx.lineTo(r_flat + l_base + r_ext, r_flat);
    ctx.lineTo(r_flat * 2 + l_base, r_flat + w_base);
    ctx.lineTo(r_flat + l_base, r_flat * 2 + w_base);
    ctx.lineTo(r_flat, r_flat * 2 + w_base);
    ctx.lineTo(0, r_flat + w_base);
    ctx.lineTo(r_ext, r_flat);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fold fold dashed lines (Base rectangle folds)
    ctx.save();
    ctx.strokeStyle = '#5a72e4';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(r_flat, r_flat, l_base, w_base);
    ctx.restore();

    // Additional side guideline notches (fold limit markers)
    ctx.save();
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(r_flat, 0); ctx.lineTo(r_flat, r_flat);
    ctx.moveTo(r_flat + l_base, 0); ctx.lineTo(r_flat + l_base, r_flat);
    ctx.stroke();
    ctx.restore();

    // Draw central Face Label
    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`BASE DE CORTE`, r_flat + l_base / 2, r_flat + w_base / 2 - 4);
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px monospace';
    ctx.fillText(`${d.l_mold.toFixed(1)} x ${d.w_mold.toFixed(1)} cm`, r_flat + l_base / 2, r_flat + w_base / 2 + 8);

    // Dimension Annotations
    if (showDimensions) {
      drawDimensionLine(ctx, 0, 0, d.total_l * scale, 0, `Comprimento Total: ${d.total_l.toFixed(1)} cm`, -15);
      drawDimensionLine(ctx, 0, 0, 0, d.total_w * scale, `Largura Total: ${d.total_w.toFixed(1)} cm`, -15, true);
      
      // Flange / rim height
      drawDimensionLine(ctx, r_flat + l_base / 2, 0, r_flat + l_base / 2, r_flat, `Aba: ${d.rim_flat.toFixed(1)} cm`, 0, true);
    }

    ctx.restore();
  };

  // 4. NAPKIN HOLDER DRAWING
  const drawNapkinHolder = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    p: NapkinHolderParams,
    d: any,
    showDimensions: boolean
  ) => {
    ctx.save();
    const w = d.w_mold * scale;
    const h = d.h_mold * scale;
    const db = d.d_mold * scale;
    const t = d.thick_mold * scale;
    const sp = d.spacing * scale;

    const finish = p.edgeFinish || 'straight';

    // Helper to generate path for a single plate (curved or scalloped top)
    const drawPlatePerimeter = (plateH: number) => {
      ctx.beginPath();
      if (finish === 'straight') {
        ctx.rect(0, 0, w, plateH);
      } else if (finish === 'rounded') {
        const r_arch = Math.min(w / 2, plateH);
        ctx.moveTo(0, plateH);
        ctx.lineTo(0, plateH - r_arch);
        ctx.arcTo(w / 2, plateH - r_arch - r_arch, w, plateH - r_arch, r_arch);
        ctx.lineTo(w, plateH);
        ctx.closePath();
      } else {
        // scalloped
        const n = Math.max(2, Math.round(w / (4 * scale)));
        const scallop_w_px = w / n;
        const scallop_h_px = Math.min(18, scallop_w_px / 2.5);
        ctx.moveTo(0, plateH);
        ctx.lineTo(0, scallop_h_px);
        for (let i = 0; i < n; i++) {
          const x1 = i * scallop_w_px;
          const x2 = (i + 1) * scallop_w_px;
          const x_mid = x1 + scallop_w_px / 2;
          ctx.quadraticCurveTo(x_mid, 0, x2, scallop_h_px);
        }
        ctx.lineTo(w, plateH);
        ctx.closePath();
      }
      ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
      ctx.fill();
      ctx.stroke();
    };

    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 2;

    // 1. Draw Plate 1: Side Panel 1 (Top)
    ctx.save();
    drawPlatePerimeter(h);
    
    // Draw 45 degree bevel score line at the bottom base connection
    ctx.save();
    ctx.strokeStyle = '#5a72e4';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, h - t);
    ctx.lineTo(w, h - t);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAREDE LATERAL 1', w / 2, h / 2 - 4);
    ctx.fillStyle = '#6b7280';
    ctx.font = '8.5px monospace';
    ctx.fillText(`${d.w_mold.toFixed(1)} x ${d.h_mold.toFixed(1)} cm`, w / 2, h / 2 + 8);
    ctx.fillStyle = '#5a72e4';
    ctx.fillText(`Corte Chanfrado 45° (${d.thick_mold.toFixed(2)}cm)`, w / 2, h - t - 5);
    ctx.restore();


    // 2. Draw Plate 2: Base Plate (Center)
    ctx.save();
    ctx.translate(0, h + sp);
    ctx.beginPath();
    ctx.rect(0, 0, w, db);
    ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
    ctx.fill();
    ctx.stroke();

    // 45 degree bevel score lines on both sides of base joint
    ctx.save();
    ctx.strokeStyle = '#5a72e4';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, t); ctx.lineTo(w, t);
    ctx.moveTo(0, db - t); ctx.lineTo(w, db - t);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PLACA DA BASE', w / 2, db / 2 + 3);
    ctx.fillStyle = '#5a72e4';
    ctx.font = '8px monospace';
    ctx.fillText('Chanfro 45°', w / 2, t - 2);
    ctx.fillText('Chanfro 45°', w / 2, db - t + 8);
    ctx.restore();


    // 3. Draw Plate 3: Side Panel 2 (Bottom)
    ctx.save();
    ctx.translate(0, h + db + sp * 2);
    drawPlatePerimeter(h);

    ctx.save();
    ctx.strokeStyle = '#5a72e4';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, h - t);
    ctx.lineTo(w, h - t);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAREDE LATERAL 2', w / 2, h / 2 - 4);
    ctx.fillStyle = '#6b7280';
    ctx.font = '8.5px monospace';
    ctx.fillText(`${d.w_mold.toFixed(1)} x ${d.h_mold.toFixed(1)} cm`, w / 2, h / 2 + 8);
    ctx.fillStyle = '#5a72e4';
    ctx.fillText(`Corte Chanfrado 45° (${d.thick_mold.toFixed(2)}cm)`, w / 2, h - t - 5);
    ctx.restore();

    // Overall dimension guides
    if (showDimensions) {
      drawDimensionLine(ctx, 0, 0, w, 0, `Largura: ${d.w_mold.toFixed(1)} cm`, -15);
      drawDimensionLine(ctx, 0, 0, 0, h, `H lateral: ${d.h_mold.toFixed(1)} cm`, -15, true);
      drawDimensionLine(ctx, 0, h + sp, 0, h + sp + db, `Prof. Base: ${d.d_mold.toFixed(1)} cm`, -15, true);
    }

    ctx.restore();
  };

  // 5. BOX PATTERN DRAWING
  const drawBox = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    p: BoxParams,
    d: any,
    showSeam: boolean,
    showDimensions: boolean
  ) => {
    ctx.save();
    const wM = d.w_mold * scale;
    const hM = d.h_mold * scale;
    const dM = d.d_mold * scale;
    const thick = d.thick_mold * scale;
    const hasLid = d.hasLid;

    // Centering coordinates
    const bX = hM;
    const bY = hM + (hasLid ? dM : 0);

    // Build box outer layout net path
    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
    
    ctx.beginPath();
    if (hasLid) {
      ctx.moveTo(bX, bY - hM - dM);
      ctx.lineTo(bX + wM, bY - hM - dM);
      ctx.lineTo(bX + wM, bY);
      ctx.lineTo(bX + wM + hM, bY);
      ctx.lineTo(bX + wM + hM, bY + dM);
      ctx.lineTo(bX + wM, bY + dM);
      ctx.lineTo(bX + wM, bY + dM + hM);
      ctx.lineTo(bX, bY + dM + hM);
      ctx.lineTo(bX, bY + dM);
      ctx.lineTo(bX - hM, bY + dM);
      ctx.lineTo(bX - hM, bY);
      ctx.lineTo(bX, bY);
    } else {
      ctx.moveTo(bX, bY - hM);
      ctx.lineTo(bX + wM, bY - hM);
      ctx.lineTo(bX + wM, bY);
      ctx.lineTo(bX + wM + hM, bY);
      ctx.lineTo(bX + wM + hM, bY + dM);
      ctx.lineTo(bX + wM, bY + dM);
      ctx.lineTo(bX + wM, bY + dM + hM);
      ctx.lineTo(bX, bY + dM + hM);
      ctx.lineTo(bX, bY + dM);
      ctx.lineTo(bX - hM, bY + dM);
      ctx.lineTo(bX - hM, bY);
      ctx.lineTo(bX, bY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw fold lines inside
    ctx.save();
    ctx.strokeStyle = '#5a72e4';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    // Base Fold lines
    ctx.beginPath();
    ctx.moveTo(bX, bY); ctx.lineTo(bX + wM, bY);
    ctx.moveTo(bX, bY + dM); ctx.lineTo(bX + wM, bY + dM);
    ctx.moveTo(bX, bY); ctx.lineTo(bX, bY + dM);
    ctx.moveTo(bX + wM, bY); ctx.lineTo(bX + wM, bY + dM);
    
    if (hasLid) {
      ctx.moveTo(bX, bY - hM);
      ctx.lineTo(bX + wM, bY - hM);
    }
    ctx.stroke();
    ctx.restore();

    // Draw thickness guide lines for 45-degree chamfers
    if (thick > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(90, 114, 228, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.strokeRect(bX + thick, bY + thick, wM - 2 * thick, dM - 2 * thick);
      ctx.restore();
    }

    // Label each box panel
    ctx.fillStyle = '#2c4cdb';
    ctx.textAlign = 'center';

    // Base Panel
    ctx.font = 'bold 9.5px monospace';
    ctx.fillText('BASE', bX + wM/2, bY + dM/2 - 3);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`${d.w_mold.toFixed(1)}x${d.d_mold.toFixed(1)} cm`, bX + wM/2, bY + dM/2 + 7);

    // Front Panel
    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 9.5px monospace';
    ctx.fillText('FRENTE', bX + wM/2, bY + dM + hM/2 - 3);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`${d.w_mold.toFixed(1)}x${d.h_mold.toFixed(1)} cm`, bX + wM/2, bY + dM + hM/2 + 7);

    // Back Panel
    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 9.5px monospace';
    ctx.fillText('ATRÁS', bX + wM/2, bY - hM/2 - 3);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`${d.w_mold.toFixed(1)}x${d.h_mold.toFixed(1)} cm`, bX + wM/2, bY - hM/2 + 7);

    // Left Panel
    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 9.5px monospace';
    ctx.fillText('ESQ', bX - hM/2, bY + dM/2 - 3);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`${d.h_mold.toFixed(1)}x${d.d_mold.toFixed(1)} cm`, bX - hM/2, bY + dM/2 + 7);

    // Right Panel
    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 9.5px monospace';
    ctx.fillText('DIR', bX + wM + hM/2, bY + dM/2 - 3);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`${d.h_mold.toFixed(1)}x${d.d_mold.toFixed(1)} cm`, bX + wM + hM/2, bY + dM/2 + 7);

    // Lid Panel
    if (hasLid) {
      ctx.fillStyle = '#2c4cdb';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText('TAMPA', bX + wM/2, bY - hM - dM/2 - 3);
      ctx.font = '8px monospace';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${d.w_mold.toFixed(1)}x${d.d_mold.toFixed(1)} cm`, bX + wM/2, bY - hM - dM/2 + 7);
    }

    // Dimensions Cotas overlays
    if (showDimensions) {
      // Overall width guideline
      drawDimensionLine(ctx, bX, bY - hM - (hasLid ? dM : 0), bX + wM, bY - hM - (hasLid ? dM : 0), `Largura: ${d.w_mold.toFixed(1)} cm`, -15);
      // Overall depth guideline
      drawDimensionLine(ctx, bX + wM, bY, bX + wM, bY + dM, `Prof.: ${d.d_mold.toFixed(1)} cm`, 15, true);
      // Overall height guideline
      drawDimensionLine(ctx, bX, bY, bX, bY - hM, `Alt: ${d.h_mold.toFixed(1)} cm`, -15, true);
    }

    ctx.restore();
  };

  // 6. ORGANIC PLATE DRAWING (freeform closed outline + offset rim)
  const drawOrganicPlate = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    d: any,
    showDimensions: boolean
  ) => {
    ctx.save();
    const toPx = (p: { x: number; y: number }) => ({
      x: (p.x - d.bboxMinX) * scale,
      y: (p.y - d.bboxMinY) * scale,
    });
    const innerPx: { x: number; y: number }[] = d.innerPoints.map(toPx);
    const outerPx: { x: number; y: number }[] = d.outerPoints.map(toPx);

    // Outer cut line
    ctx.strokeStyle = '#2c4cdb';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(90, 114, 228, 0.04)';
    ctx.beginPath();
    outerPx.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner fold guide (where the base ends and the rim rises) — only meaningful when there's a rim
    if (d.hasLip) {
      ctx.save();
      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      innerPx.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Central label
    const cx = (d.bboxW * scale) / 2;
    const cy = (d.bboxH * scale) / 2;
    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    if (d.hasLip) {
      ctx.fillText(`Base: ${d.baseArea.toFixed(0)} cm²`, cx, cy - 5);
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px monospace';
      ctx.fillText(`Aba: ${d.rimFlat.toFixed(1)} cm`, cx, cy + 8);
    } else {
      ctx.fillText(`Prato Plano: ${d.baseArea.toFixed(0)} cm²`, cx, cy);
    }

    if (showDimensions) {
      drawDimensionLine(ctx, 0, 0, d.bboxW * scale, 0, `L total: ${d.bboxW.toFixed(1)} cm`, -15);
      drawDimensionLine(ctx, 0, 0, 0, d.bboxH * scale, `H total: ${d.bboxH.toFixed(1)} cm`, -15, true);
    }

    ctx.restore();
  };

  return (
    <div className="relative flex flex-col h-full w-full select-none" ref={containerRef}>
      {/* Canvas Drawing Area */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full rounded-xl cursor-grab active:cursor-grabbing border border-terracotta-100/30"
        title="Arraste para mover o molde. Use os botões de controle para zoom."
      />

      {/* Floating Canvas Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm border border-terracotta-100/40 p-1.5 rounded-xl shadow-md no-print">
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.15))}
          className="p-1.5 hover:bg-terracotta-50 rounded-lg text-clay-900/70 hover:text-terracotta-600 transition"
          title="Aumentar Zoom"
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
          className="p-1.5 hover:bg-terracotta-50 rounded-lg text-clay-900/70 hover:text-terracotta-600 transition"
          title="Diminuir Zoom"
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 hover:bg-stone-100 rounded-lg text-clay-900/50 hover:text-clay-900 transition border-t border-stone-100 mt-1"
          title="Resetar Visualização"
          aria-label="Resetar visualização do molde"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Hint Text */}
      <div className="absolute bottom-3 left-3 bg-[#fafaf9]/95 border border-[#2c4cdb]/10 px-2 py-1 rounded-md text-[9px] font-mono text-[#2c4cdb]/60 shadow-sm pointer-events-none no-print">
        🖱️ Arraste o canvas para mover o molde • 🔍 Zoom ativo: {(zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
}
