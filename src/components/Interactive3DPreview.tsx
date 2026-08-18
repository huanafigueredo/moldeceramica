import React, { useRef, useState, useEffect } from 'react';
import { ShapeType, CylinderParams, ConeParams, TrayParams, NapkinHolderParams, BoxParams, OrganicPlateParams, BowlParams, VaseParams, SketchParams } from '../types';
import { RotateCw, Sparkles, Package, Flame, Sliders, HelpCircle } from 'lucide-react';
import { computeOrganicOutline, scalePoints } from '../utils/organicShape';
import { bowlRadiusAt, BOWL_PREVIEW_RINGS } from '../utils/bowlShape';
import { vaseRadiusAt, VASE_PREVIEW_RINGS } from '../utils/vaseShape';
import { sketchRadiusAt, SKETCH_PREVIEW_RINGS } from '../utils/sketchShape';
import { computeBowlCapacity, computeVaseCapacity, computeSketchCapacity } from '../utils/capacity';

interface Interactive3DPreviewProps {
  shapeType: ShapeType;
  params: CylinderParams | ConeParams | TrayParams | NapkinHolderParams | BoxParams | OrganicPlateParams | BowlParams | VaseParams | SketchParams;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Face {
  indices: number[];
  color: string;
  outlineColor?: string;
  isBase?: boolean;
}

export default function Interactive3DPreview({ shapeType, params }: Interactive3DPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [rotation, setRotation] = useState({ x: -0.5, y: 0.6 }); // pitch, yaw in radians
  const [zoom, setZoom] = useState(1.1);
  const [isSpinning, setIsSpinning] = useState(true);
  const [stateMode, setStateMode] = useState<'wet' | 'fired'>('fired'); // wet (shrunk/mold dimensions) vs fired (desired final dimensions)
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });

  // Dragging states
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastRotation = useRef({ x: -0.5, y: 0.6 });

  const shrinkFactor = 1 - params.shrinkage / 100;
  const sizeMultiplier = 1 / shrinkFactor;

  // Handle Resize of the canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: width || 320,
          height: height || 320,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle Mouse / Touch interaction for rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastRotation.current = { ...rotation };
    setIsSpinning(false); // pause auto-spinning
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const deltaX = (e.clientX - dragStart.current.x) * 0.007;
    const deltaY = (e.clientY - dragStart.current.y) * 0.007;

    setRotation({
      x: Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, lastRotation.current.x - deltaY)),
      y: lastRotation.current.y + deltaX,
    });
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.4, Math.min(2.5, z - e.deltaY * 0.0015)));
  };

  // Auto-Spinning animation loop
  useEffect(() => {
    if (!isSpinning) return;
    let animId: number;
    const tick = () => {
      setRotation((r) => ({
        ...r,
        y: r.y + 0.006, // subtle rotation
      }));
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isSpinning]);

  // Main 3D Rendering logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Grid center
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Multiplier based on shrinkage factor
    const C = params.shrinkage;
    const shrinkFactor = 1 - C / 100;
    // If stateMode is 'wet', the clay object is larger (the mold/wet size)
    const sizeMultiplier = stateMode === 'wet' ? 1 / shrinkFactor : 1.0;

    // Color theme based on state
    // Wet clay is softer and lighter; Fired clay is classic rich terracotta
    const baseColor = stateMode === 'wet' ? '#c89d89' : '#ca5934';
    const edgeColor = stateMode === 'wet' ? '#b6836e' : '#b24420';

    // 1. Generate 3D Vertices and Faces
    let vertices: Point3D[] = [];
    let faces: Face[] = [];
    let holePoints: Point3D[] = []; // for decorative cylinder holes representation

    // Mug-style handle: a flat ribbon bent into a "D" arc, attached to the
    // outside wall at rBody (front, x-axis), spanning handleSpanPercent of
    // the body height, centered vertically.
    const addHandle = (
      rBody: number,
      bodyHeight: number,
      handleWidth: number,
      handleProjection: number,
      handleSpanPercent: number
    ) => {
      const steps = 14;
      const span = bodyHeight * (Math.max(10, Math.min(90, handleSpanPercent)) / 100);
      const yTop = span / 2;
      const yBottom = -span / 2;
      const startIdx = vertices.length;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const angle = t * Math.PI;
        const outward = handleProjection * Math.sin(angle);
        const xCenter = rBody + outward;
        const yCenter = yBottom + (yTop - yBottom) * t;
        vertices.push({ x: xCenter, y: yCenter, z: -handleWidth / 2 });
        vertices.push({ x: xCenter, y: yCenter, z: handleWidth / 2 });
      }

      for (let s = 0; s < steps; s++) {
        const a0 = startIdx + s * 2;
        const a1 = a0 + 1;
        const b0 = startIdx + (s + 1) * 2;
        const b1 = b0 + 1;
        // Front, back and outer-edge faces so the ribbon reads as solid from any angle
        faces.push({ indices: [a0, b0, b1, a1], color: baseColor, outlineColor: edgeColor });
        faces.push({ indices: [a1, b1, b0, a0], color: baseColor, outlineColor: edgeColor });
      }
    };

    if (shapeType === 'cylinder') {
      const p = params as CylinderParams;
      const r = (p.desiredDiameter / 2) * sizeMultiplier;
      const h = p.desiredHeight * sizeMultiplier;
      const segments = 24;

      // How far the rim dips below the flat full-height top at a given
      // angle, matching (in spirit, at this preview's coarser resolution)
      // the scalloped/wave cut drawn on the actual printed pattern in
      // Pattern2DCanvas/MoldVisualizer — otherwise the 3D preview always
      // showed a flat rim regardless of the edge finish the user picked.
      const edge = p.edgeFinish || 'straight';
      const circumference = 2 * Math.PI * r;
      let edgeDrop = (_theta: number) => 0;
      if (edge === 'scalloped') {
        const scallopW = 4 * sizeMultiplier;
        const n = Math.max(2, Math.round(circumference / scallopW));
        const scallopWActual = circumference / n;
        const scallopH = Math.min(0.48 * sizeMultiplier, scallopWActual / 2.5);
        edgeDrop = (theta: number) => {
          const pos = ((theta % (2 * Math.PI)) / (2 * Math.PI)) * n;
          const frac = pos - Math.floor(pos);
          const bump = Math.abs(frac - 0.5) * 2; // 0 at scallop center, 1 at each seam
          return bump * bump * scallopH;
        };
      } else if (edge === 'wave') {
        const amplitude = 0.32 * sizeMultiplier;
        const offset = 0.40 * sizeMultiplier;
        const cycles = Math.max(1, Math.round(circumference / (6 * sizeMultiplier)));
        edgeDrop = (theta: number) => offset - amplitude * Math.sin((theta / (2 * Math.PI)) * cycles * 2 * Math.PI);
      }

      // Top circular rim
      for (let i = 0; i < segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        vertices.push({
          x: r * Math.cos(theta),
          y: h / 2 - edgeDrop(theta),
          z: r * Math.sin(theta),
        });
      }
      // Bottom circular rim
      for (let i = 0; i < segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        vertices.push({
          x: r * Math.cos(theta),
          y: -h / 2,
          z: r * Math.sin(theta),
        });
      }

      // Center bottom vertex for the base disk
      const centerBottomIdx = vertices.length;
      vertices.push({ x: 0, y: -h / 2, z: 0 });

      // Wall faces (double sided rendering: inside and outside)
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        // Outer face
        faces.push({
          indices: [i, next, next + segments, i + segments],
          color: baseColor,
          outlineColor: edgeColor,
        });
      }

      // Bottom base disk faces
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          indices: [i + segments, next + segments, centerBottomIdx],
          color: stateMode === 'wet' ? '#bb8e7a' : '#b74c27',
          outlineColor: edgeColor,
          isBase: true,
        });
      }

      // Generate decorative hole patterns
      if (p.hasHoles) {
        const cols = Math.max(1, Math.floor((Math.PI * p.desiredDiameter) / p.holeSpacing));
        const rows = Math.max(1, Math.floor(p.desiredHeight / p.holeSpacing));
        const holeSpacingY = h / (rows + 1);

        for (let r_idx = 1; r_idx <= rows; r_idx++) {
          const y_pos = h / 2 - r_idx * holeSpacingY;
          for (let c_idx = 0; c_idx < cols; c_idx++) {
            const theta = (c_idx * 2 * Math.PI) / cols + (r_idx % 2 === 0 ? Math.PI / cols : 0);
            // Push hole centers slightly outwards from standard radius to render nicely on top
            const hR = r * 1.01;
            holePoints.push({
              x: hR * Math.cos(theta),
              y: y_pos,
              z: hR * Math.sin(theta),
            });
          }
        }
      }

      if (p.hasHandle) {
        addHandle(r, h, (p.handleWidth ?? 2.2) * sizeMultiplier, (p.handleProjection ?? 5) * sizeMultiplier, p.handleSpanPercent ?? 55);
      }
    }
    else if (shapeType === 'cone') {
      const p = params as ConeParams;
      const rt = (p.topDiameter / 2) * sizeMultiplier;
      const rb = (p.bottomDiameter / 2) * sizeMultiplier;
      const h = p.height * sizeMultiplier;
      const segments = 24;

      // Top circular rim
      for (let i = 0; i < segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        vertices.push({
          x: rt * Math.cos(theta),
          y: h / 2,
          z: rt * Math.sin(theta),
        });
      }
      // Bottom circular rim
      for (let i = 0; i < segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        vertices.push({
          x: rb * Math.cos(theta),
          y: -h / 2,
          z: rb * Math.sin(theta),
        });
      }

      // Center bottom vertex for base disk
      const centerBottomIdx = vertices.length;
      vertices.push({ x: 0, y: -h / 2, z: 0 });

      // Wall faces
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          indices: [i, next, next + segments, i + segments],
          color: baseColor,
          outlineColor: edgeColor,
        });
      }

      // Bottom disk faces
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          indices: [i + segments, next + segments, centerBottomIdx],
          color: stateMode === 'wet' ? '#bb8e7a' : '#b74c27',
          outlineColor: edgeColor,
          isBase: true,
        });
      }

      if (p.hasHandle) {
        const rMid = (rt + rb) / 2;
        addHandle(rMid, h, (p.handleWidth ?? 2.2) * sizeMultiplier, (p.handleProjection ?? 5) * sizeMultiplier, p.handleSpanPercent ?? 55);
      }
    }
    else if (shapeType === 'tray') {
      const p = params as TrayParams;
      const l_base = p.length * sizeMultiplier;
      const w_base = p.width * sizeMultiplier;
      const h_lip = p.lipHeight * sizeMultiplier;
      const angleRad = (p.lipAngle * Math.PI) / 180;

      // Lip offsets
      const offset = h_lip * Math.cos(angleRad);
      const lipY = h_lip * Math.sin(angleRad);

      // Base rectangle vertices (Y = -lipY / 2 to balance centered height)
      const baseY = -lipY / 2;
      vertices.push({ x: -l_base / 2, y: baseY, z: -w_base / 2 }); // 0
      vertices.push({ x: l_base / 2, y: baseY, z: -w_base / 2 });  // 1
      vertices.push({ x: l_base / 2, y: baseY, z: w_base / 2 });   // 2
      vertices.push({ x: -l_base / 2, y: baseY, z: w_base / 2 });  // 3

      // Flange outer vertices (folded up)
      // Front Lip (z+)
      vertices.push({ x: -l_base / 2, y: baseY + lipY, z: w_base / 2 + offset }); // 4
      vertices.push({ x: l_base / 2, y: baseY + lipY, z: w_base / 2 + offset });  // 5
      // Back Lip (z-)
      vertices.push({ x: -l_base / 2, y: baseY + lipY, z: -w_base / 2 - offset }); // 6
      vertices.push({ x: l_base / 2, y: baseY + lipY, z: -w_base / 2 - offset });  // 7
      // Right Lip (x+)
      vertices.push({ x: l_base / 2 + offset, y: baseY + lipY, z: -w_base / 2 });  // 8
      vertices.push({ x: l_base / 2 + offset, y: baseY + lipY, z: w_base / 2 });   // 9
      // Left Lip (x-)
      vertices.push({ x: -l_base / 2 - offset, y: baseY + lipY, z: -w_base / 2 }); // 10
      vertices.push({ x: -l_base / 2 - offset, y: baseY + lipY, z: w_base / 2 });  // 11

      // Central Base plate face
      faces.push({
        indices: [0, 1, 2, 3],
        color: stateMode === 'wet' ? '#bb8e7a' : '#b74c27',
        outlineColor: edgeColor,
      });

      // Front Flange
      faces.push({
        indices: [3, 2, 5, 4],
        color: baseColor,
        outlineColor: edgeColor,
      });

      // Back Flange
      faces.push({
        indices: [1, 0, 6, 7],
        color: baseColor,
        outlineColor: edgeColor,
      });

      // Right Flange
      faces.push({
        indices: [2, 1, 8, 9],
        color: baseColor,
        outlineColor: edgeColor,
      });

      // Left Flange
      faces.push({
        indices: [0, 3, 11, 10],
        color: baseColor,
        outlineColor: edgeColor,
      });

      // Corner join filler triangles (represent folds)
      faces.push({ indices: [2, 9, 5], color: stateMode === 'wet' ? '#ae7e6a' : '#aa3c18', outlineColor: edgeColor });
      faces.push({ indices: [3, 4, 11], color: stateMode === 'wet' ? '#ae7e6a' : '#aa3c18', outlineColor: edgeColor });
      faces.push({ indices: [1, 7, 8], color: stateMode === 'wet' ? '#ae7e6a' : '#aa3c18', outlineColor: edgeColor });
      faces.push({ indices: [0, 10, 6], color: stateMode === 'wet' ? '#ae7e6a' : '#aa3c18', outlineColor: edgeColor });
    } 
    else if (shapeType === 'napkin_holder') {
      const p = params as NapkinHolderParams;
      const w = p.width * sizeMultiplier;
      const h = p.height * sizeMultiplier;
      const d = p.depth * sizeMultiplier;
      const t = p.thickness * sizeMultiplier;

      // We'll generate 3 separate 3D slab boxes (cuboids)
      // Helper function to push solid cuboid vertices and faces
      const addCuboid = (cx: number, cy: number, cz: number, sizeX: number, sizeY: number, sizeZ: number, boxColor: string) => {
        const startIdx = vertices.length;
        const hx = sizeX / 2;
        const hy = sizeY / 2;
        const hz = sizeZ / 2;

        // 8 points
        vertices.push({ x: cx - hx, y: cy - hy, z: cz - hz }); // 0
        vertices.push({ x: cx + hx, y: cy - hy, z: cz - hz }); // 1
        vertices.push({ x: cx + hx, y: cy + hy, z: cz - hz }); // 2
        vertices.push({ x: cx - hx, y: cy + hy, z: cz - hz }); // 3
        vertices.push({ x: cx - hx, y: cy - hy, z: cz + hz }); // 4
        vertices.push({ x: cx + hx, y: cy - hy, z: cz + hz }); // 5
        vertices.push({ x: cx + hx, y: cy + hy, z: cz + hz }); // 6
        vertices.push({ x: cx - hx, y: cy + hy, z: cz + hz }); // 7

        // 6 faces (Back, Front, Bottom, Top, Left, Right)
        const localFaces = [
          [0, 3, 2, 1], // Back (z-)
          [4, 5, 6, 7], // Front (z+)
          [0, 1, 5, 4], // Bottom (y-)
          [3, 7, 6, 2], // Top (y+)
          [0, 4, 7, 3], // Left (x-)
          [1, 2, 6, 5], // Right (x+)
        ];

        localFaces.forEach((f) => {
          faces.push({
            indices: f.map((idx) => startIdx + idx),
            color: boxColor,
            outlineColor: edgeColor,
          });
        });
      };

      // Height profile (0..h) across the plate's width, for the top edge
      // cut — mirrors drawPlatePerimeter() in Pattern2DCanvas.tsx so the 3D
      // preview's side plates actually show the rounded/scalloped edge the
      // user picked, instead of always rendering a flat rectangle.
      const finish = p.edgeFinish || 'straight';
      const xs: number[] = [];
      const heights: number[] = [];
      if (finish === 'straight') {
        xs.push(-w / 2, w / 2);
        heights.push(h, h);
      } else if (finish === 'rounded') {
        const steps = 32;
        const rArch = Math.min(w / 2, h);
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          xs.push(-w / 2 + frac * w);
          heights.push((h - rArch) + rArch * Math.sin(frac * Math.PI));
        }
      } else {
        // scalloped
        const scallopW = 4;
        const n = Math.max(2, Math.round(w / scallopW));
        const segW = w / n;
        const segH = Math.min(0.6, segW / 2.5);
        const perScallop = 8;
        for (let i = 0; i < n; i++) {
          for (let s = 0; s <= perScallop; s++) {
            const frac = s / perScallop;
            const bump = Math.abs(frac - 0.5) * 2;
            xs.push(-w / 2 + i * segW + frac * segW);
            heights.push(h - bump * bump * segH);
          }
        }
      }

      // Extrude the profile along Z into a solid plate: bottom/top edges,
      // front/back faces, and end caps at both sides.
      const addProfiledPlate = (cz: number) => {
        const yBottom = t / 2 - h / 2;
        const zFront = cz + t / 2;
        const zBack = cz - t / 2;
        const n = xs.length;
        const base = vertices.length;

        for (let i = 0; i < n; i++) {
          const yTop = yBottom + heights[i];
          vertices.push({ x: xs[i], y: yBottom, z: zFront }); // base+i*4+0
          vertices.push({ x: xs[i], y: yTop, z: zFront });    // base+i*4+1
          vertices.push({ x: xs[i], y: yBottom, z: zBack });  // base+i*4+2
          vertices.push({ x: xs[i], y: yTop, z: zBack });     // base+i*4+3
        }

        for (let i = 0; i < n - 1; i++) {
          const a = base + i * 4;
          const b = base + (i + 1) * 4;
          faces.push({ indices: [a, a + 1, b + 1, b], color: baseColor, outlineColor: edgeColor }); // front
          faces.push({ indices: [a + 2, b + 2, b + 3, a + 3], color: baseColor, outlineColor: edgeColor }); // back
          faces.push({ indices: [a + 1, a + 3, b + 3, b + 1], color: baseColor, outlineColor: edgeColor }); // top edge
        }
        faces.push({ indices: [base, base + 2, base + (n - 1) * 4 + 2, base + (n - 1) * 4], color: baseColor, outlineColor: edgeColor }); // bottom
        faces.push({ indices: [base, base + 1, base + 3, base + 2], color: baseColor, outlineColor: edgeColor }); // left end cap
        const last = base + (n - 1) * 4;
        faces.push({ indices: [last + 2, last + 3, last + 1, last], color: baseColor, outlineColor: edgeColor }); // right end cap
      };

      // Base Plate
      addCuboid(0, -h/2 + t/2, 0, w, t, d - 2*t, stateMode === 'wet' ? '#bb8e7a' : '#b74c27');
      // Left Plate
      addProfiledPlate(-d / 2 + t / 2);
      // Right Plate
      addProfiledPlate(d / 2 - t / 2);
    }
    else if (shapeType === 'box') {
      const p = params as BoxParams;
      const w = p.width * sizeMultiplier;
      const h = p.height * sizeMultiplier;
      const d = p.depth * sizeMultiplier;
      const t = p.thickness * sizeMultiplier;
      const hasLid = p.hasLid || false;

      // Helper function to push solid cuboid vertices and faces
      const addCuboid = (cx: number, cy: number, cz: number, sizeX: number, sizeY: number, sizeZ: number, boxColor: string) => {
        const startIdx = vertices.length;
        const hx = sizeX / 2;
        const hy = sizeY / 2;
        const hz = sizeZ / 2;

        // 8 points
        vertices.push({ x: cx - hx, y: cy - hy, z: cz - hz }); // 0
        vertices.push({ x: cx + hx, y: cy - hy, z: cz - hz }); // 1
        vertices.push({ x: cx + hx, y: cy + hy, z: cz - hz }); // 2
        vertices.push({ x: cx - hx, y: cy + hy, z: cz - hz }); // 3
        vertices.push({ x: cx - hx, y: cy - hy, z: cz + hz }); // 4
        vertices.push({ x: cx + hx, y: cy - hy, z: cz + hz }); // 5
        vertices.push({ x: cx + hx, y: cy + hy, z: cz + hz }); // 6
        vertices.push({ x: cx - hx, y: cy + hy, z: cz + hz }); // 7

        // 6 faces (Back, Front, Bottom, Top, Left, Right)
        const localFaces = [
          [0, 3, 2, 1], // Back (z-)
          [4, 5, 6, 7], // Front (z+)
          [0, 1, 5, 4], // Bottom (y-)
          [3, 7, 6, 2], // Top (y+)
          [0, 4, 7, 3], // Left (x-)
          [1, 2, 6, 5], // Right (x+)
        ];

        localFaces.forEach((f) => {
          faces.push({
            indices: f.map((idx) => startIdx + idx),
            color: boxColor,
            outlineColor: edgeColor,
          });
        });
      };

      // Base Plate (positioned at bottom)
      addCuboid(0, -h/2 + t/2, 0, w - 2*t, t, d - 2*t, stateMode === 'wet' ? '#bb8e7a' : '#b74c27');
      
      // Front Plate (z+)
      addCuboid(0, 0, d/2 - t/2, w, h, t, baseColor);

      // Back Plate (z-)
      addCuboid(0, 0, -d/2 + t/2, w, h, t, baseColor);

      // Left Plate (x-)
      addCuboid(-w/2 + t/2, 0, 0, t, h, d - 2*t, baseColor);

      // Right Plate (x+)
      addCuboid(w/2 - t/2, 0, 0, t, h, d - 2*t, baseColor);

      // Optional Lid
      if (hasLid) {
        addCuboid(0, h/2 + t/2, 0, w - 2*t, t, d - 2*t, stateMode === 'wet' ? '#ae7e6a' : '#aa3c18');
      }
    }
    else if (shapeType === 'organic_plate') {
      const p = params as OrganicPlateParams;
      const hasLip3d = p.hasLip !== false;
      const baseRadius3d = p.baseRadius * sizeMultiplier;
      const lipH = (hasLip3d ? p.lipHeight : 0) * sizeMultiplier;
      // Fewer samples than the flat pattern: this shape redraws every animation frame.
      const customPoints3d = p.customPoints ? scalePoints(p.customPoints, sizeMultiplier) : undefined;
      const outline = computeOrganicOutline(baseRadius3d, p.irregularity, p.seed, lipH, p.lipAngle, 9, 8, customPoints3d);
      const n = outline.innerPoints.length;
      const baseY = -lipH / 2;

      const innerStartIdx = vertices.length;
      outline.innerPoints.forEach((pt) => {
        vertices.push({ x: pt.x, y: baseY, z: pt.y });
      });

      const centerIdx = vertices.length;
      vertices.push({ x: 0, y: baseY, z: 0 });

      const plateBaseColor = stateMode === 'wet' ? '#bb8e7a' : '#b74c27';

      // Base disk (fan triangulation from the centroid)
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        faces.push({
          indices: [innerStartIdx + i, innerStartIdx + next, centerIdx],
          color: plateBaseColor,
          outlineColor: edgeColor,
          isBase: true,
        });
      }

      // Rim wall (quads between the base ring and the raised, offset rim ring) — skipped for a flat, lip-less plate
      if (hasLip3d) {
        const outerStartIdx = vertices.length;
        outline.outerPoints.forEach((pt) => {
          vertices.push({ x: pt.x, y: baseY + lipH, z: pt.y });
        });

        for (let i = 0; i < n; i++) {
          const next = (i + 1) % n;
          faces.push({
            indices: [innerStartIdx + i, innerStartIdx + next, outerStartIdx + next, outerStartIdx + i],
            color: baseColor,
            outlineColor: edgeColor,
          });
        }
      }
    }
    else if (shapeType === 'bowl') {
      const p = params as BowlParams;
      const rTop = (p.topDiameter / 2) * sizeMultiplier;
      const rBottom = (p.bottomDiameter / 2) * sizeMultiplier;
      const h = p.height * sizeMultiplier;
      const segments = 24;
      const rings = BOWL_PREVIEW_RINGS;

      // One ring of vertices per height step, radius sampled from the curved profile
      for (let ring = 0; ring <= rings; ring++) {
        const t = ring / rings;
        const r = bowlRadiusAt(t, rBottom, rTop, p.curvature);
        const y = -h / 2 + t * h;
        for (let i = 0; i < segments; i++) {
          const theta = (i * 2 * Math.PI) / segments;
          vertices.push({ x: r * Math.cos(theta), y, z: r * Math.sin(theta) });
        }
      }

      // Center bottom vertex for the base disk
      const centerBottomIdx = vertices.length;
      vertices.push({ x: 0, y: -h / 2, z: 0 });

      // Wall faces between consecutive rings
      for (let ring = 0; ring < rings; ring++) {
        const ringStart = ring * segments;
        const nextRingStart = (ring + 1) * segments;
        for (let i = 0; i < segments; i++) {
          const next = (i + 1) % segments;
          faces.push({
            indices: [ringStart + i, ringStart + next, nextRingStart + next, nextRingStart + i],
            color: baseColor,
            outlineColor: edgeColor,
          });
        }
      }

      // Bottom base disk faces (fan from the first ring, which is the base)
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          indices: [i, next, centerBottomIdx],
          color: stateMode === 'wet' ? '#bb8e7a' : '#b74c27',
          outlineColor: edgeColor,
          isBase: true,
        });
      }
    }
    else if (shapeType === 'vase') {
      const p = params as VaseParams;
      const rBase = (p.baseDiameter / 2) * sizeMultiplier;
      const rShoulder = (p.shoulderDiameter / 2) * sizeMultiplier;
      const rNeck = (p.neckDiameter / 2) * sizeMultiplier;
      const h = p.height * sizeMultiplier;
      const shoulderT = p.shoulderPosition / 100;
      const segments = 24;
      const rings = VASE_PREVIEW_RINGS;

      for (let ring = 0; ring <= rings; ring++) {
        const t = ring / rings;
        const r = vaseRadiusAt(t, rBase, rShoulder, rNeck, shoulderT, p.curvature);
        const y = -h / 2 + t * h;
        for (let i = 0; i < segments; i++) {
          const theta = (i * 2 * Math.PI) / segments;
          vertices.push({ x: r * Math.cos(theta), y, z: r * Math.sin(theta) });
        }
      }

      const centerBottomIdx = vertices.length;
      vertices.push({ x: 0, y: -h / 2, z: 0 });

      for (let ring = 0; ring < rings; ring++) {
        const ringStart = ring * segments;
        const nextRingStart = (ring + 1) * segments;
        for (let i = 0; i < segments; i++) {
          const next = (i + 1) % segments;
          faces.push({
            indices: [ringStart + i, ringStart + next, nextRingStart + next, nextRingStart + i],
            color: baseColor,
            outlineColor: edgeColor,
          });
        }
      }

      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          indices: [i, next, centerBottomIdx],
          color: stateMode === 'wet' ? '#bb8e7a' : '#b74c27',
          outlineColor: edgeColor,
          isBase: true,
        });
      }
    }
    else if (shapeType === 'sketch') {
      const p = params as SketchParams;
      const maxR = (p.maxDiameter / 2) * sizeMultiplier;
      const h = p.height * sizeMultiplier;
      const segments = 24;
      const rings = SKETCH_PREVIEW_RINGS;

      if (p.profilePoints.length >= 2) {
        for (let ring = 0; ring <= rings; ring++) {
          const t = ring / rings;
          const r = sketchRadiusAt(t, p.profilePoints) * maxR;
          const y = -h / 2 + t * h;
          for (let i = 0; i < segments; i++) {
            const theta = (i * 2 * Math.PI) / segments;
            vertices.push({ x: r * Math.cos(theta), y, z: r * Math.sin(theta) });
          }
        }

        const centerBottomIdx = vertices.length;
        vertices.push({ x: 0, y: -h / 2, z: 0 });

        for (let ring = 0; ring < rings; ring++) {
          const ringStart = ring * segments;
          const nextRingStart = (ring + 1) * segments;
          for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            faces.push({
              indices: [ringStart + i, ringStart + next, nextRingStart + next, nextRingStart + i],
              color: baseColor,
              outlineColor: edgeColor,
            });
          }
        }

        for (let i = 0; i < segments; i++) {
          const next = (i + 1) % segments;
          faces.push({
            indices: [i, next, centerBottomIdx],
            color: stateMode === 'wet' ? '#bb8e7a' : '#b74c27',
            outlineColor: edgeColor,
            isBase: true,
          });
        }
      }
    }

    // 2. Rotate Points and Project to 2D
    const rotatedVertices: Point3D[] = [];
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);

    vertices.forEach((v) => {
      // Rotate around Y axis (yaw)
      const x1 = v.x * cosY - v.z * sinY;
      const z1 = v.x * sinY + v.z * cosY;

      // Rotate around X axis (pitch)
      const y2 = v.y * cosX - z1 * sinX;
      const z2 = v.y * sinX + z1 * cosX;

      rotatedVertices.push({ x: x1, y: y2, z: z2 });
    });

    // Rotate Decorative hole points
    const rotatedHoles: { pt: Point3D; rawZ: number }[] = [];
    holePoints.forEach((hp) => {
      const x1 = hp.x * cosY - hp.z * sinY;
      const z1 = hp.x * sinY + hp.z * cosY;
      const y2 = hp.y * cosX - z1 * sinX;
      const z2 = hp.y * sinX + z1 * cosX;
      rotatedHoles.push({ pt: { x: x1, y: y2, z: z2 }, rawZ: z2 });
    });

    // 3. Compute Projected Coordinates and Sort Faces by Depth
    // We calculate the average rotated Z value of each face to apply Painter's Algorithm
    const facesWithDepth = faces.map((face, index) => {
      let sumZ = 0;
      face.indices.forEach((vIdx) => {
        sumZ += rotatedVertices[vIdx].z;
      });
      const avgZ = sumZ / face.indices.length;

      return {
        ...face,
        avgZ,
        originalIndex: index,
      };
    });

    // Sort: high Z values are closer to the camera, low Z are far.
    // In our coordinate system, a higher Z is deeper (away from camera) or vice-versa.
    // Let's sort so that more negative/deeper objects are drawn FIRST (back to front)
    facesWithDepth.sort((a, b) => b.avgZ - a.avgZ);

    // Dynamic Scale for fitting
    const baseDimension = Math.min(dimensions.width, dimensions.height);
    const scaleFactor = (baseDimension / 32) * zoom;
    const cameraDistance = 150; // virtual depth spacer

    const project = (p: Point3D) => {
      // Perspective projection
      const distRatio = cameraDistance / (cameraDistance + p.z);
      return {
        x: centerX + p.x * scaleFactor * distRatio,
        y: centerY - p.y * scaleFactor * distRatio,
      };
    };

    // Helper to calculate face normals for 3D lighting shading
    const getFaceNormal = (poly: Point3D[]) => {
      if (poly.length < 3) return { x: 0, y: 0, z: 1 };
      const v0 = poly[0];
      const v1 = poly[1];
      const v2 = poly[2];

      const ax = v1.x - v0.x;
      const ay = v1.y - v0.y;
      const az = v1.z - v0.z;

      const bx = v2.x - v0.x;
      const by = v2.y - v0.y;
      const bz = v2.z - v0.z;

      // Cross product
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return len === 0 ? { x: 0, y: 0, z: 1 } : { x: nx / len, y: ny / len, z: nz / len };
    };

    // Normalize Light vector (directional light from top-right-front)
    const lightDir = { x: 0.5, y: 0.8, z: -0.45 };
    const lightLen = Math.sqrt(lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z);
    const normLight = { x: lightDir.x / lightLen, y: lightDir.y / lightLen, z: lightDir.z / lightLen };

    // 4. DRAW 3D SCENE
    facesWithDepth.forEach((face) => {
      const poly3d = face.indices.map((vIdx) => rotatedVertices[vIdx]);
      const projectedPoints = poly3d.map((p) => project(p));

      // Calculate lighting based on surface normal
      const normal = getFaceNormal(poly3d);
      // Dot product
      const dot = normal.x * normLight.x + normal.y * normLight.y + normal.z * normLight.z;
      // Map dot from [-1, 1] to ambient/diffuse light range [0.35, 1.0]
      const intensity = Math.max(0.35, Math.min(1.0, 0.65 + dot * 0.35));

      // Parse face color to apply intensity shading
      ctx.beginPath();
      ctx.moveTo(projectedPoints[0].x, projectedPoints[0].y);
      for (let i = 1; i < projectedPoints.length; i++) {
        ctx.lineTo(projectedPoints[i].x, projectedPoints[i].y);
      }
      ctx.closePath();

      // Get RGB values based on color code
      let r = 202, g = 89, b = 52; // default terracotta ca5934
      if (face.color === '#bb8e7a' || face.color === '#c89d89') {
        r = 200; g = 157; b = 137; // wet clay
      } else if (face.color === '#b74c27') {
        r = 183; g = 76; b = 39; // baked base
      } else if (face.color === '#ae7e6a') {
        r = 174; g = 126; b = 106; // wet fold
      } else if (face.color === '#aa3c18') {
        r = 170; g = 60; b = 24; // baked fold
      }

      const shadR = Math.round(r * intensity);
      const shadG = Math.round(g * intensity);
      const shadB = Math.round(b * intensity);

      ctx.fillStyle = `rgb(${shadR}, ${shadG}, ${shadB})`;
      ctx.fill();

      // Stroke outline
      ctx.strokeStyle = face.outlineColor || edgeColor;
      ctx.lineWidth = face.isBase ? 0.75 : 1.25;
      ctx.stroke();

      // Draw decorative cylinder holes overlay
      // We only draw holes that are on the front hemisphere (z < average face Z) and intersect this face's cylinder quad bounds
      if (shapeType === 'cylinder' && !face.isBase && holePoints.length > 0) {
        // Find which cylinder quad this face belongs to
        // If it's a quad face, indices are [i, next, next + segments, i + segments]
        if (face.indices.length === 4) {
          const idx0 = face.indices[0]; // bottom-left index roughly
          const numSegments = 24;
          const segmentCol = idx0 % numSegments; // which vertical stripe column this quad represents

          // Corresponding hole angles fell in this vertical column sector
          const segmentWidthRad = (2 * Math.PI) / numSegments;
          const minAngle = segmentCol * segmentWidthRad - 0.01;
          const maxAngle = (segmentCol + 1) * segmentWidthRad + 0.01;

          rotatedHoles.forEach(({ pt, rawZ }) => {
            // Draw holes on front half (rawZ < face.avgZ)
            if (rawZ < face.avgZ) {
              // Convert 3D hole point back to raw angle to check if it lands on this quad
              const rawAngle = Math.atan2(pt.z, pt.x); // rotated space check
              // It's simpler to check if the projected hole coordinate falls inside our projected 2D quad polygon bounds!
              const projHole = project(pt);
              
              if (isPointInPolygon(projHole, projectedPoints)) {
                ctx.beginPath();
                // Scale hole size with perspective
                const distRatio = cameraDistance / (cameraDistance + pt.z);
                const drawRadius = Math.max(1, (params as CylinderParams).holeDiameter * 0.4 * scaleFactor * distRatio);
                ctx.arc(projHole.x, projHole.y, drawRadius, 0, 2 * Math.PI);
                ctx.fillStyle = '#221915'; // dark hollow look inside hole
                ctx.fill();
                ctx.strokeStyle = edgeColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          });
        }
      }
    });

  }, [rotation, zoom, shapeType, params, stateMode, dimensions]);

  // Ray-casting helper to check if a projected point falls inside our face polygon bounds
  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].y > point.y !== polygon[j].y > point.y &&
        point.x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y) + polygon[i].x
      ) {
        isInside = !isInside;
      }
    }
    return isInside;
  };

  // Helper to compute volume (capacity) in milliliters
  const getCalculatedVolume = () => {
    if (shapeType === 'cylinder') {
      const p = params as CylinderParams;
      const r = p.desiredDiameter / 2;
      const h = p.desiredHeight;
      const volumeCm3 = Math.PI * r * r * h; // cm³ = ml
      return { volume: volumeCm3, label: 'Capacidade Estimada (Luminária/Copo)' };
    } else if (shapeType === 'cone') {
      const p = params as ConeParams;
      const rTop = p.topDiameter / 2;
      const rBot = p.bottomDiameter / 2;
      const h = p.height;
      const volumeCm3 = (1 / 3) * Math.PI * h * (rTop * rTop + rTop * rBot + rBot * rBot);
      return { volume: volumeCm3, label: 'Capacidade Estimada (Caneca/Vaso)' };
    } else if (shapeType === 'tray') {
      const p = params as TrayParams;
      // Approximate volume of the tray (base x vertical height of lip)
      const verticalHeight = p.lipHeight * Math.sin((p.lipAngle * Math.PI) / 180);
      const baseArea = p.length * p.width;
      const volumeCm3 = baseArea * verticalHeight;
      return { volume: volumeCm3, label: 'Volume Útil Estimado (Prato/Travessa)' };
    } else if (shapeType === 'box') {
      const p = params as BoxParams;
      // Internal volume of the box, discounting wall thickness
      const innerW = Math.max(0.5, p.width - 2 * p.thickness);
      const innerH = Math.max(0.5, p.height - 2 * p.thickness);
      const innerD = Math.max(0.5, p.depth - 2 * p.thickness);
      const volumeCm3 = innerW * innerH * innerD;
      return { volume: volumeCm3, label: 'Volume Interno Estimado (Caixa)' };
    } else if (shapeType === 'organic_plate') {
      const p = params as OrganicPlateParams;
      const hasLipVol = p.hasLip !== false;
      const effLipHeight = hasLipVol ? p.lipHeight : 0;
      // Approximate volume as the base footprint area times the rim's vertical rise
      const outline = computeOrganicOutline(p.baseRadius, p.irregularity, p.seed, effLipHeight, p.lipAngle, 9, 8, p.customPoints);
      const verticalHeight = effLipHeight * Math.sin((p.lipAngle * Math.PI) / 180);
      const volumeCm3 = outline.baseArea * verticalHeight;
      return { volume: volumeCm3, label: 'Volume Útil Estimado (Prato Orgânico)' };
    } else if (shapeType === 'bowl') {
      const p = params as BowlParams;
      const estimate = computeBowlCapacity(p.topDiameter, p.bottomDiameter, p.height, p.curvature, p.wallThickness ?? 0.6);
      return { volume: estimate.brimFullMl, label: 'Capacidade Estimada (Tigela)' };
    } else if (shapeType === 'vase') {
      const p = params as VaseParams;
      const estimate = computeVaseCapacity(p.baseDiameter, p.shoulderDiameter, p.neckDiameter, p.height, p.shoulderPosition, p.curvature, p.wallThickness ?? 0.6);
      return { volume: estimate.brimFullMl, label: 'Capacidade Estimada (Jarra)' };
    } else if (shapeType === 'sketch') {
      const p = params as SketchParams;
      const estimate = computeSketchCapacity(p.profilePoints, p.height, p.maxDiameter, p.wallThickness ?? 0.6);
      return { volume: estimate.brimFullMl, label: 'Capacidade Estimada (Molde Desenhado)' };
    } else {
      const p = params as NapkinHolderParams;
      // Volume inside the holder slot
      const innerDepth = Math.max(0.5, p.depth - 2 * p.thickness);
      const volumeCm3 = p.width * p.height * innerDepth;
      return { volume: volumeCm3, label: 'Espaço Interno do Porta-Guardanapo' };
    }
  };

  const volumeData = getCalculatedVolume();
  const scaleReduction = params.shrinkage;

  return (
    <div className="flex flex-col h-full bg-white/75 backdrop-blur-md rounded-2xl border border-terracotta-100 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-clay-900">Maquete 3D Interativa</h3>
            <p className="text-xs text-clay-900/60">Simulação tridimensional do resultado final</p>
          </div>
        </div>

        {/* State Toggle Selector */}
        <div role="tablist" aria-label="Estado da peça" className="flex bg-clay-100/80 p-1 rounded-xl self-start sm:self-auto border border-terracotta-100/30">
          <button
            role="tab"
            aria-selected={stateMode === 'fired'}
            onClick={() => setStateMode('fired')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 ${
              stateMode === 'fired'
                ? 'bg-white text-terracotta-600 shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Peça Pronta (Fired)
          </button>
          <button
            role="tab"
            aria-selected={stateMode === 'wet'}
            onClick={() => setStateMode('wet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 ${
              stateMode === 'wet'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Molde Úmido (Wet)
          </button>
        </div>
      </div>

      {/* 3D Canvas Box Container */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[280px] md:min-h-[340px] w-full rounded-xl bg-gradient-to-b from-[#fdfdfc] to-[#fafaf9] border border-terracotta-100/40 shadow-inner overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          className="absolute inset-0 w-full h-full touch-none"
        />

        {/* 3D Interaction Helpers */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 no-print pointer-events-none">
          <span className="text-[10px] text-clay-900/40 font-sans flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-clay-900/30 bg-clay-100 flex items-center justify-center text-[7px] font-bold">↔</span>
            Arraste para rotacionar
          </span>
          <span className="text-[10px] text-clay-900/40 font-sans flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-clay-900/30 bg-clay-100 flex items-center justify-center text-[7px] font-bold">↕</span>
            Scroll para aproximar (Zoom)
          </span>
        </div>

        {/* Spin Toggle control */}
        <button
          onClick={() => setIsSpinning(!isSpinning)}
          className={`absolute top-3 right-3 p-2 rounded-xl border transition shadow-sm pointer-events-auto ${
            isSpinning
              ? 'bg-terracotta-50 border-terracotta-100 text-terracotta-600'
              : 'bg-white border-clay-200 text-clay-500 hover:bg-clay-50'
          }`}
          title={isSpinning ? "Pausar rotação automática" : "Ativar rotação automática"}
          aria-label={isSpinning ? "Pausar rotação automática" : "Ativar rotação automática"}
          aria-pressed={isSpinning}
        >
          <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin [animation-duration:8s]' : ''}`} />
        </button>

        {/* Scale Badge / Size indicator */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-terracotta-100 text-[10px] font-mono shadow-sm">
          {stateMode === 'fired' ? (
            <div className="flex flex-col">
              <span className="font-bold text-terracotta-600">PEÇA ACABADA</span>
              <span className="text-clay-900/60">Tamanho real pós-queima</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-amber-700">MOLDE ÚMIDO (+{scaleReduction.toFixed(1)}%)</span>
              <span className="text-clay-900/60">Sobredimensionado p/ compensação</span>
            </div>
          )}
        </div>
      </div>

      {/* 3D Physical Properties Panel */}
      <div className="mt-4 bg-[#fafaf9]/70 border border-terracotta-100/30 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-terracotta-500" />
            <span className="text-xs font-bold text-clay-900/80 uppercase tracking-wide font-sans">Propriedades Físicas 3D</span>
          </div>
          <span className="text-[10px] text-clay-900/40 font-mono">Cálculo Geométrico Real</span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1">
          {/* Volume capacity display */}
          <div className="space-y-0.5">
            <div className="text-[10px] text-clay-900/50 font-sans flex items-center gap-1">
              {volumeData.label}
              <span className="group relative cursor-help text-clay-900/30 hover:text-terracotta-500">
                <HelpCircle className="w-3 h-3" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-44 p-2 bg-clay-900 text-white text-[9px] rounded-lg shadow-lg z-50 text-center leading-normal">
                  Calculado usando fórmulas geométricas precisas com base nas dimensões inseridas.
                </span>
              </span>
            </div>
            <div className="text-lg font-serif font-black text-clay-900 flex items-baseline gap-1">
              {volumeData.volume >= 1000 ? (
                <>
                  <span>{(volumeData.volume / 1000).toFixed(2)}</span>
                  <span className="text-xs font-sans font-bold text-clay-900/50">Liters</span>
                </>
              ) : (
                <>
                  <span>{Math.round(volumeData.volume)}</span>
                  <span className="text-xs font-sans font-bold text-clay-900/50">mL (cm³)</span>
                </>
              )}
            </div>
          </div>

          {/* Size summary display */}
          <div className="space-y-0.5">
            <span className="text-[10px] text-clay-900/50 font-sans">Dimensões Reais Projetadas</span>
            <div className="text-xs font-mono font-bold text-clay-900 bg-white/40 border border-terracotta-100/20 px-2 py-1.5 rounded-lg">
              {(() => {
                const s = stateMode === 'fired' ? 1.0 : sizeMultiplier;
                if (shapeType === 'cylinder') {
                  const p = params as CylinderParams;
                  return `Ø ${(p.desiredDiameter * s).toFixed(1)} x H ${(p.desiredHeight * s).toFixed(1)} cm`;
                } else if (shapeType === 'cone') {
                  const p = params as ConeParams;
                  return `ØT ${(p.topDiameter * s).toFixed(1)} | ØB ${(p.bottomDiameter * s).toFixed(1)} x H ${(p.height * s).toFixed(1)} cm`;
                } else if (shapeType === 'tray') {
                  const p = params as TrayParams;
                  return `L ${(p.length * s).toFixed(1)} x W ${(p.width * s).toFixed(1)} x H ${(p.lipHeight * Math.sin((p.lipAngle * Math.PI) / 180) * s).toFixed(1)} cm`;
                } else if (shapeType === 'box') {
                  const p = params as BoxParams;
                  return `W ${(p.width * s).toFixed(1)} x H ${(p.height * s).toFixed(1)} x D ${(p.depth * s).toFixed(1)} cm`;
                } else if (shapeType === 'organic_plate') {
                  const p = params as OrganicPlateParams;
                  const hasLipDim = p.hasLip !== false;
                  const effLip = hasLipDim ? p.lipHeight : 0;
                  const outline = computeOrganicOutline(p.baseRadius * s, p.irregularity, p.seed, effLip * s, p.lipAngle, 9, 8, p.customPoints ? scalePoints(p.customPoints, s) : undefined);
                  return `L ${outline.bboxW.toFixed(1)} x P ${outline.bboxH.toFixed(1)} x H ${(effLip * Math.sin((p.lipAngle * Math.PI) / 180) * s).toFixed(1)} cm`;
                } else if (shapeType === 'bowl') {
                  const p = params as BowlParams;
                  return `Ø Borda ${(p.topDiameter * s).toFixed(1)} | Ø Base ${(p.bottomDiameter * s).toFixed(1)} x H ${(p.height * s).toFixed(1)} cm`;
                } else if (shapeType === 'vase') {
                  const p = params as VaseParams;
                  return `Ø Base ${(p.baseDiameter * s).toFixed(1)} | Ø Ombro ${(p.shoulderDiameter * s).toFixed(1)} | Ø Gargalo ${(p.neckDiameter * s).toFixed(1)} x H ${(p.height * s).toFixed(1)} cm`;
                } else if (shapeType === 'sketch') {
                  const p = params as SketchParams;
                  return `Ø Máx ${(p.maxDiameter * s).toFixed(1)} x H ${(p.height * s).toFixed(1)} cm`;
                } else {
                  const p = params as NapkinHolderParams;
                  return `W ${(p.width * s).toFixed(1)} x H ${(p.height * s).toFixed(1)} x D ${(p.depth * s).toFixed(1)} cm`;
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
