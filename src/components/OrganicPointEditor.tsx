import React, { useRef, useState, useEffect } from 'react';
import { OrganicPoint, sampleClosedSpline, pointsToPathD } from '../utils/organicShape';

interface OrganicPointEditorProps {
  points: OrganicPoint[];
  onChange: (points: OrganicPoint[]) => void;
}

const MIN_RADIUS = 1.5; // cm
const MAX_RADIUS = 35; // cm

// Freeform contour editor: drag any of the N control points to reshape the
// plate's outline by hand. Shares the exact same spline/offset math as the
// random generator (Option A), so whatever you draw here molds identically.
//
// Each point is locked to its own fixed spoke angle (i/n * 360°) — dragging
// only changes how far out/in it sits along that spoke. This guarantees the
// points stay in angular order around the center, so the outline can never
// cross itself and the center-fan triangulation used for the 3D base and the
// print mosaic always stays valid. Free x/y dragging was tried first and let
// a point get dragged past its neighbor, producing a self-intersecting,
// "twisted" mesh — this constraint removes that failure mode entirely.
export default function OrganicPointEditor({ points, onChange }: OrganicPointEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const viewSize = 260;
  const center = viewSize / 2;
  const maxExtent = Math.max(6, ...points.map((p) => Math.hypot(p.x, p.y))) * 1.35;
  const scale = (viewSize / 2) / maxExtent;

  const toScreen = (p: OrganicPoint) => ({ x: center + p.x * scale, y: center + p.y * scale });

  const n = points.length;
  const spokeAngle = (i: number) => (i / n) * Math.PI * 2;

  const smoothOutline = sampleClosedSpline(points, 20);
  const pathD = pointsToPathD(smoothOutline.map(toScreen));

  useEffect(() => {
    if (draggingIdx === null) return;
    const angle = spokeAngle(draggingIdx);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    const handleMove = (e: PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * viewSize;
      const sy = ((e.clientY - rect.top) / rect.height) * viewSize;
      const dxCm = (sx - center) / scale;
      const dyCm = (sy - center) / scale;
      // Project the pointer position onto this point's fixed spoke direction —
      // this is what keeps every drag radial-only.
      const radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, dxCm * dirX + dyCm * dirY));
      const updated = { x: dirX * radius, y: dirY * radius };
      onChange(points.map((p, i) => (i === draggingIdx ? updated : p)));
    };
    const handleUp = () => setDraggingIdx(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingIdx, points, scale]);

  return (
    <div className="bg-white/60 border border-terracotta-100/40 rounded-xl p-3 shadow-xs">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        className="w-full aspect-square touch-none select-none rounded-lg"
      >
        <rect width={viewSize} height={viewSize} fill="#fdfaf6" rx="12" />

        {/* Smooth outline preview, same math as the mold itself */}
        <path d={pathD} fill="rgba(224, 122, 95, 0.10)" stroke="#8e4a23" strokeWidth="1.5" />

        {/* Center reference crosshair */}
        <line x1={center - 5} y1={center} x2={center + 5} y2={center} stroke="#8e4a23" strokeWidth="0.75" opacity="0.35" />
        <line x1={center} y1={center - 5} x2={center} y2={center + 5} stroke="#8e4a23" strokeWidth="0.75" opacity="0.35" />

        {/* Faint spoke guides showing each point's locked drag direction */}
        {points.map((_, i) => {
          const angle = spokeAngle(i);
          const far = { x: center + Math.cos(angle) * (viewSize / 2), y: center + Math.sin(angle) * (viewSize / 2) };
          return (
            <line
              key={`spoke-${i}`}
              x1={center}
              y1={center}
              x2={far.x}
              y2={far.y}
              stroke="#8e4a23"
              strokeWidth="0.5"
              opacity="0.08"
            />
          );
        })}

        {/* Guide lines between raw control points */}
        {points.map((p, i) => {
          const a = toScreen(p);
          const b = toScreen(points[(i + 1) % n]);
          return (
            <line
              key={`guide-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#c9a08a"
              strokeWidth="1"
              strokeDasharray="2,3"
              opacity="0.6"
            />
          );
        })}

        {/* Draggable control point handles */}
        {points.map((p, i) => {
          const s = toScreen(p);
          const isActive = draggingIdx === i;
          return (
            <g key={`handle-${i}`}>
              <circle cx={s.x} cy={s.y} r="16" fill="transparent" />
              <circle
                cx={s.x}
                cy={s.y}
                r={isActive ? 9 : 7}
                fill={isActive ? '#7d3f1c' : '#8e4a23'}
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDraggingIdx(i);
                }}
              />
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] text-clay-900/40 text-center mt-2 font-sans">
        Arraste os pontos para dentro/fora — cada um segue sua própria direção, então o contorno nunca se cruza
      </p>
    </div>
  );
}
